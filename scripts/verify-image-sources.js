#!/usr/bin/env node
'use strict';
/**
 * verify-image-sources.js — Live verification spikes for the dish image search
 * (Todo 4 of .omo/plans/dish-image-search.md).
 *
 * Sections:
 *   (A) LIVE SOURCE SPIKE — every proxy in DISH_IMAGE_PROXY_CHAIN (fetching the
 *       Google scrape URL through the proxy template) plus direct Openverse,
 *       for three representative dish queries. 15 s timeout per request.
 *       Exit rule: exit 0 iff at least one source delivers >= 3 thumbs for
 *       >= 2 of the 3 queries, else exit 1.
 *   (B) CSP CHECK — always runs. Fetches the host page and asserts connect-src
 *       / img-src against every origin the feature contacts. Documentation
 *       only: on blockage the runtime chain degrades by design (fetch throws
 *       -> next proxy -> Openverse -> error state); no code change.
 *   (C) SPLITTER HIGH-RATE — gated by VERIFY_SPLITTER_RATE=1. Runs every
 *       item.description from tests/test_kantine_menuCache.json through
 *       splitLanguage and prints the label distribution + high percentage.
 *       A high-rate < 30% only prints a WARNING: relaxing the confidence gate
 *       is a USER decision and is never changed by this script.
 *
 * Plain Node (global fetch + AbortSignal.timeout), no dependencies. Hits the
 * live network — deliberately NOT registered in the npm test script.
 *
 * Env:
 *   VERIFY_SPLITTER_RATE=1  enable section (C)
 *   VERIFY_BREAK=1          replace all image source URLs with an invalid one
 *                           (https://invalid.invalid/) — must produce graceful
 *                           per-source FAIL lines and a clean exit 1 (QA
 *                           fail-evidence run; the CSP host check stays live).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const REQUEST_TIMEOUT_MS = 15000;
const QUERIES = ['Wiener Schnitzel', 'Gulasch mit Knödel', 'Gemüsecurry mit Reis'];
const MIN_THUMBS = 3;
const MIN_QUERIES_WITH_THUMBS = 2;
const HOST_PAGE_URL = 'https://web.bessa.app/knapp-kantine';
const HOST_ROOT_URL = 'https://web.bessa.app/';
const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CONNECT_ORIGINS = ['https://api.allorigins.win', 'https://api.codetabs.com', 'https://api.openverse.org'];
const IMG_STATIC_ORIGIN = 'https://encrypted-tbn0.gstatic.com';
const BREAK_URL = 'https://invalid.invalid/';
const BREAK = process.env.VERIFY_BREAK === '1';
const RUN_SPLITTER_RATE = process.env.VERIFY_SPLITTER_RATE === '1';

// ── cleanSrc module loading (pattern: tools/eval-splitter.js + tests/_langLoader.js) ──
// Strip ES6 import/export and promote top-level const/let to var so the
// declarations leak onto the vm sandbox object. The import regex tolerates
// semicolon-less imports (src/ convention, unlike the lang modules).
function cleanSrc(src) {
  return src
    .replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?/gm, '')
    .replace(/\bexport\s+/g, '')
    .replace(/^(const|let) /gm, 'var ');
}

function loadFiles(files, extraSandbox = {}) {
  const sandbox = Object.assign({ console }, extraSandbox);
  vm.createContext(sandbox);
  let combined = '';
  for (const file of files) {
    combined += cleanSrc(fs.readFileSync(path.join(ROOT, file), 'utf8')) + '\n';
  }
  vm.runInContext(combined, sandbox, { filename: files.join('+') });
  return sandbox;
}

// constants.js loads FIRST so extractImageThumbs resolves DISH_IMAGE_MAX_RESULTS
// inside the sandbox — the extraction regex is NOT duplicated here (single
// source of truth: src/image_search.js).
const imageSandbox = loadFiles(['src/constants.js', 'src/image_search.js']);
const extractImageThumbs = imageSandbox.extractImageThumbs;
const proxyChain = BREAK
  ? imageSandbox.DISH_IMAGE_PROXY_CHAIN.map(p => ({ name: p.name, template: BREAK_URL }))
  : imageSandbox.DISH_IMAGE_PROXY_CHAIN.slice();
const googleScrapeUrlTemplate = imageSandbox.DISH_IMAGE_GOOGLE_SCRAPE_URL;
const openverseUrlTemplate = BREAK ? BREAK_URL : imageSandbox.DISH_IMAGE_OPENVERSE_URL;

// ── helpers ──────────────────────────────────────────────────────────────────
function errName(e) {
  if (e && e.cause && e.cause.code) return e.cause.code; // ENOTFOUND, EAI_AGAIN, ...
  if (e && e.name) return e.name;                        // TimeoutError, SyntaxError, ...
  return 'Error';
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function pad(str, n) { str = String(str); return str.length >= n ? str : str + ' '.repeat(n - str.length); }
function padLeft(str, n) { str = String(str); return str.length >= n ? str : ' '.repeat(n - str.length) + str; }

// ── (A) LIVE SOURCE SPIKE ────────────────────────────────────────────────────
async function spikeProxy(proxy, query) {
  const scrapeUrl = googleScrapeUrlTemplate
    .replace('{q}', encodeURIComponent(query))
    .replace('{hl}', 'de');
  const url = proxy.template.replace('{url}', encodeURIComponent(scrapeUrl));
  const start = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) return { status: String(response.status), thumbs: 0, ms: Date.now() - start };
    let body = await response.text();
    if (proxy.name === 'allorigins-get') body = JSON.parse(body).contents; // wrapped payload
    const thumbs = extractImageThumbs(body).length;
    return { status: String(response.status), thumbs, ms: Date.now() - start };
  } catch (e) {
    return { status: errName(e), thumbs: 0, ms: Date.now() - start };
  }
}

async function spikeOpenverse(query) {
  const url = openverseUrlTemplate.replace('{q}', encodeURIComponent(query));
  const start = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) return { status: String(response.status), thumbs: 0, ms: Date.now() - start, hosts: [] };
    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    // Same semantics as the runtime client: thumbnail || url, https-only.
    const pick = r => (r ? (r.thumbnail || r.url) : '');
    const usable = results.filter(r => { const u = pick(r); return typeof u === 'string' && u.startsWith('https://'); });
    const hosts = [];
    for (const r of usable) {
      try {
        const h = new URL(pick(r)).hostname;
        if (!hosts.includes(h)) hosts.push(h);
      } catch (_) { /* malformed URL in results — ignore for host collection */ }
    }
    return { status: String(response.status), thumbs: usable.length, ms: Date.now() - start, hosts };
  } catch (e) {
    return { status: errName(e), thumbs: 0, ms: Date.now() - start, hosts: [] };
  }
}

async function runSpike() {
  console.log('=== (A) LIVE SOURCE SPIKE ===');
  if (BREAK) console.log(`VERIFY_BREAK=1: all image source URLs replaced with ${BREAK_URL} — expecting graceful FAIL lines`);
  console.log(`Queries: ${QUERIES.join(' | ')}`);
  console.log(`Timeout per request: ${REQUEST_TIMEOUT_MS} ms`);
  console.log('\nProxy chain (DISH_IMAGE_PROXY_CHAIN order):');
  proxyChain.forEach((p, i) => console.log(`  ${i + 1}. ${pad(p.name, 14)} ${p.template}`));
  console.log(`Openverse: ${openverseUrlTemplate}`);
  console.log(`Google scrape template: ${googleScrapeUrlTemplate} (hl=de)\n`);

  const rows = [];
  const openverseHosts = [];

  for (const proxy of proxyChain) {
    for (const query of QUERIES) {
      const r = await spikeProxy(proxy, query);
      rows.push({ source: proxy.name, query, status: r.status, thumbs: r.thumbs, ms: r.ms });
    }
  }
  for (const query of QUERIES) {
    // Openverse anonymous throttle is ~1 req/s — pause between the three calls.
    if (query !== QUERIES[0]) await sleep(1100);
    const r = await spikeOpenverse(query);
    for (const h of r.hosts) if (!openverseHosts.includes(h)) openverseHosts.push(h);
    rows.push({ source: 'openverse', query, status: r.status, thumbs: r.thumbs, ms: r.ms });
  }

  console.log(`${pad('source', 15)}| ${pad('query', 21)}| ${pad('status', 14)}| thumbs |      ms`);
  console.log(`${'-'.repeat(15)}+${'-'.repeat(22)}+${'-'.repeat(15)}+--------+---------`);
  for (const row of rows) {
    console.log(`${pad(row.source, 15)}| ${pad(row.query, 21)}| ${pad(row.status, 14)}| ${padLeft(row.thumbs, 6)} | ${padLeft(row.ms, 7)}`);
  }

  // Exit rule: at least one source with >= MIN_THUMBS thumbs for >= MIN_QUERIES_WITH_THUMBS queries.
  const sourceNames = [...proxyChain.map(p => p.name), 'openverse'];
  const qualifying = [];
  console.log(`\nExit rule: >= ${MIN_THUMBS} thumbs for >= ${MIN_QUERIES_WITH_THUMBS} of ${QUERIES.length} queries from at least one source`);
  for (const name of sourceNames) {
    const good = rows.filter(r => r.source === name && r.thumbs >= MIN_THUMBS).length;
    console.log(`  ${pad(name, 15)} ${good}/${QUERIES.length} queries with >= ${MIN_THUMBS} thumbs${good >= MIN_QUERIES_WITH_THUMBS ? ' — QUALIFIES' : ''}`);
    if (good >= MIN_QUERIES_WITH_THUMBS) qualifying.push(name);
  }
  const pass = qualifying.length >= 1;
  console.log(`RESULT: ${pass ? 'PASS' : 'FAIL'} — ${pass ? `source(s) qualifying: ${qualifying.join(', ')}` : 'no source satisfies the exit rule'}`);

  // Decision-ladder diagnostic: DNS-dead environment => reordering is pointless.
  const dnsDead = rows.length > 0 && rows.every(r => r.status === 'ENOTFOUND' || r.status === 'EAI_AGAIN');
  if (dnsDead) {
    console.log('NETWORK DIAGNOSIS: every source failed with DNS errors (ENOTFOUND/EAI_AGAIN) — this');
    console.log('environment has no outbound internet access. Reordering the proxy chain is pointless');
    console.log('(decision ladder case b): documented fallback finding, the feature ships regardless.');
  }

  if (!pass) {
    console.log('\n======================= FALLBACK FINDING =======================');
    console.log(`No image source satisfied the exit rule (>= ${MIN_THUMBS} thumbs for >= ${MIN_QUERIES_WITH_THUMBS} of ${QUERIES.length} queries).`);
    console.log('Per the decision ladder this does NOT block the feature: the Google-tab variant and');
    console.log('the modal error state work without any image source; the runtime chain degrades by');
    console.log('design (fetch throws -> next proxy -> Openverse -> error state).');
    console.log('Per-source details:');
    for (const name of sourceNames) {
      const detail = rows.filter(r => r.source === name).map(r => `${r.query}: ${r.status}/${r.thumbs} thumbs`).join('; ');
      console.log(`  ${pad(name, 15)} ${detail}`);
    }
    console.log('================================================================');
  }

  return { pass, rows, openverseHosts, dnsDead };
}

// ── (B) CSP CHECK ────────────────────────────────────────────────────────────
async function fetchPage(url) {
  // GET first, HEAD as fallback, then browser-UA variants in case a WAF blocks
  // plain Node requests. Only headers are needed — the body read is aborted
  // right after the headers arrive (the page can be large).
  const attempts = [
    { method: 'GET', ua: null },
    { method: 'HEAD', ua: null },
    { method: 'GET', ua: BROWSER_UA },
    { method: 'HEAD', ua: BROWSER_UA },
  ];
  let lastErr = null;
  for (const attempt of attempts) {
    const start = Date.now();
    try {
      const headers = attempt.ua ? { 'User-Agent': attempt.ua } : {};
      const response = await fetch(url, { method: attempt.method, headers, redirect: 'follow', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      const info = {
        method: attempt.method,
        ua: attempt.ua ? 'browser-UA' : 'default-UA',
        status: response.status,
        finalUrl: response.url,
        csp: response.headers.get('content-security-policy'),
        cspReportOnly: response.headers.get('content-security-policy-report-only'),
        ms: Date.now() - start,
      };
      try { if (response.body) await response.body.cancel(); } catch (_) { /* body already released */ }
      return info;
    } catch (e) {
      lastErr = e; // try the next attempt
    }
  }
  return { error: errName(lastErr) };
}

function parseDirectives(policy) {
  return policy
    .split(';')
    .map(part => part.trim().replace(/^,+/, '')) // headers.get() comma-joins repeated headers
    .filter(Boolean)
    .map(part => part.split(/\s+/));
}

function governingTokens(directives, name) {
  // The named directive governs; default-src is the fallback when it is absent.
  const direct = directives.find(d => d[0] === name);
  if (direct) return direct.slice(1);
  const def = directives.find(d => d[0] === 'default-src');
  if (def) return def.slice(1);
  return null; // nothing restricts this directive
}

/** Returns the token that allows the origin, or null when blocked. */
function matchingToken(tokens, origin) {
  const url = new URL(origin);
  const host = url.hostname;
  for (const token of tokens) {
    if (token === '*') return token;
    if (token[0] === "'") continue; // 'self'/'none'/'unsafe-*' never match a cross-origin host
    if (/^[a-z][a-z0-9+.-]*:$/i.test(token)) { // scheme-source, e.g. https:
      if (url.protocol === token.toLowerCase()) return token;
      continue;
    }
    let t = token;
    const schemeMatch = t.match(/^([a-z][a-z0-9+.-]*):\/\//i);
    if (schemeMatch) {
      if (url.protocol !== schemeMatch[1].toLowerCase() + ':') continue;
      t = t.slice(schemeMatch[0].length);
    }
    t = t.split('/')[0]; // strip path
    let hostPart = t;
    let portPart = null;
    const colon = t.lastIndexOf(':');
    if (colon !== -1 && /^\d+$/.test(t.slice(colon + 1))) {
      hostPart = t.slice(0, colon);
      portPart = t.slice(colon + 1);
    }
    const hostOk = hostPart.startsWith('*.')
      ? (host === hostPart.slice(2) || host.endsWith('.' + hostPart.slice(2)))
      : hostPart === host;
    if (!hostOk) continue;
    const urlPort = url.port || (url.protocol === 'https:' ? '443' : '80');
    if (portPart === null || portPart === '*' || portPart === urlPort) return token;
  }
  return null;
}

async function checkCsp(openverseHosts) {
  console.log('\n=== (B) CSP CHECK (host page) ===');
  console.log(`URL: ${HOST_PAGE_URL}`);
  let page = await fetchPage(HOST_PAGE_URL);
  if (page.error) {
    console.log(`Host page UNREACHABLE from this environment (${page.error}) — CSP could not be`);
    console.log('checked live. Documented explicitly, not guessed. The bookmarklet runs in the');
    console.log("user's browser; a Node-side failure says nothing about the browser's policy.");
    return;
  }
  console.log(`${page.method} (${page.ua}) status ${page.status} in ${page.ms} ms — final URL: ${page.finalUrl} (body read aborted after headers)`);
  if (page.status >= 400) {
    // The venue path is an SPA route: the static host can 404 it server-side
    // while users still get the app shell. Probe the origin root as the
    // effective page so the CSP verdict rests on real app HTML, not an error page.
    console.log(`Specified URL returned ${page.status} — probing the origin root (${HOST_ROOT_URL}) as the effective app shell`);
    const root = await fetchPage(HOST_ROOT_URL);
    if (root.error) {
      console.log(`Origin root UNREACHABLE (${root.error}) — CSP verdict based on the ${page.status} response above only`);
    } else {
      console.log(`Root ${root.method} (${root.ua}) status ${root.status} in ${root.ms} ms — final URL: ${root.finalUrl}`);
      if (root.status < 400) page = root;
    }
  }
  console.log(`content-security-policy: ${page.csp || '(none)'}`);
  console.log(`content-security-policy-report-only: ${page.cspReportOnly || '(none)'}`);

  const policies = [];
  if (page.csp) policies.push({ name: 'content-security-policy', raw: page.csp, enforcing: true });
  if (page.cspReportOnly) policies.push({ name: 'content-security-policy-report-only', raw: page.cspReportOnly, enforcing: false });

  if (policies.length === 0) {
    console.log('CSP: none (green) — no policy restricts connect-src or img-src on the host page');
    console.log('Per-origin assertions (no CSP header present — all unrestricted):');
    for (const origin of CONNECT_ORIGINS) console.log(`  connect-src ${pad(origin, 40)} UNRESTRICTED (no CSP header)`);
    console.log(`  img-src      ${pad(IMG_STATIC_ORIGIN, 40)} UNRESTRICTED (no CSP header)`);
    for (const h of openverseHosts) console.log(`  img-src      ${pad(`https://${h}`, 40)} UNRESTRICTED (no CSP header)`);
    return;
  }

  const imgOrigins = [IMG_STATIC_ORIGIN, ...openverseHosts.map(h => `https://${h}`)];
  if (openverseHosts.length === 0) {
    console.log('Openverse thumbnail hosts: undetermined (Openverse delivered no usable results in this run)');
    console.log(`— img-src assertion limited to ${IMG_STATIC_ORIGIN}`);
  } else {
    console.log(`Openverse thumbnail hosts observed live: ${openverseHosts.join(', ')}`);
  }

  let allAllowed = true;
  for (const policy of policies) {
    console.log(`\nPolicy: ${policy.name} (${policy.enforcing ? 'ENFORCING' : 'report-only — not enforcing'})`);
    console.log(`  raw: ${policy.raw}`);
    const directives = parseDirectives(policy.raw);
    for (const [directive, origins] of [['connect-src', CONNECT_ORIGINS], ['img-src', imgOrigins]]) {
      const tokens = governingTokens(directives, directive);
      if (tokens === null) {
        console.log(`  ${directive}: absent and no default-src — UNRESTRICTED (green)`);
        continue;
      }
      console.log(`  ${directive}: ${tokens.join(' ')}`);
      for (const origin of origins) {
        const token = matchingToken(tokens, origin);
        const allowed = token !== null;
        if (policy.enforcing && !allowed) allAllowed = false;
        console.log(`    ${pad(origin, 40)} ${allowed ? `ALLOWED (token: ${token})` : 'BLOCKED'}`);
      }
    }
  }

  if (allAllowed) {
    console.log('\nCSP verdict: GREEN — every origin the feature contacts is allowed (or no enforcing policy restricts it)');
  } else {
    console.log('\nCSP verdict: BLOCKAGE — at least one origin is blocked by the enforcing policy.');
    console.log('No code change (by design): the runtime chain degrades — fetch throws -> next proxy ->');
    console.log('Openverse -> modal error state with the permanent "open in Google" link. Documented only.');
  }
}

// ── (C) SPLITTER HIGH-RATE ───────────────────────────────────────────────────
function splitterHighRate() {
  console.log('\n=== (C) SPLITTER HIGH-RATE (VERIFY_SPLITTER_RATE=1) ===');
  // Same file set + order as tools/eval-splitter.js; sandbox defaults mirror
  // tests/_langLoader.js.
  const langFiles = [
    'src/lang/types.js',
    'src/lang/normalize.js',
    'src/lang/templates.js',
    'src/lang/langModel.js',
    'src/lang/langModelSeed.js',
    'src/lang/loanwords.js',
    'src/lang/alignTrailing.js',
    'src/lang/segment.js',
    'src/lang/boundary.js',
    'src/lang/score.js',
    'src/lang/dishes.js',
    'src/lang/splitter.js',
  ];
  const langSandbox = loadFiles(langFiles, {
    Date,
    setTimeout: () => 1,
    clearTimeout: () => {},
    document: { createElement: tag => ({ tag, textContent: '' }) },
    langMode: 'de',
  });
  const splitLanguage = langSandbox.splitLanguage;
  if (typeof splitLanguage !== 'function') {
    console.log('FATAL: splitLanguage not found on the lang sandbox');
    process.exitCode = 1;
    return;
  }
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/test_kantine_menuCache.json'), 'utf8'));
  const items = [];
  data.forEach(w => w.days.forEach(d => d.items.forEach(i => { if (i.description) items.push(i); })));
  const labels = { high: 0, medium: 0, low: 0, fallback: 0, template: 0 };
  let unknown = 0;
  for (const item of items) {
    const res = splitLanguage(item.description);
    if (labels[res.label] !== undefined) labels[res.label]++;
    else unknown++;
  }
  console.log(`Fixture: tests/test_kantine_menuCache.json — items analyzed: ${items.length}`);
  console.log('Label distribution:');
  for (const k of Object.keys(labels)) {
    const pct = items.length ? (labels[k] / items.length * 100).toFixed(1) : '0.0';
    console.log(`  ${pad(k, 9)}: ${padLeft(labels[k], 4)} (${pct}%)`);
  }
  if (unknown > 0) console.log(`  unknown labels: ${unknown}`);
  const highRate = items.length ? labels.high / items.length : 0;
  console.log(`High rate: ${(highRate * 100).toFixed(1)}% (the dish-image link gates on label === 'high' only)`);
  if (highRate < 0.3) {
    console.log('WARNING: high rate < 30% — feature visibility is low. Relaxing the confidence gate is');
    console.log('a USER decision and is NOT changed by this script.');
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
(async function main() {
  console.log('Dish image search — live verification spikes (scripts/verify-image-sources.js)');
  console.log(`Node ${process.version}, ${new Date().toISOString()}`);
  const spike = await runSpike();
  await checkCsp(spike.openverseHosts);
  if (RUN_SPLITTER_RATE) splitterHighRate();
  else console.log('\n(C) Splitter high-rate skipped (set VERIFY_SPLITTER_RATE=1 to enable)');
  const exitCode = spike.pass ? 0 : 1;
  console.log(`\nScript exit code: ${exitCode} (${spike.pass ? 'exit rule satisfied' : 'exit rule NOT satisfied — see FALLBACK FINDING above'})`);
  process.exit(exitCode);
})().catch(e => {
  console.error(`FATAL: ${e && e.message ? e.message : e}`);
  process.exit(1);
});
