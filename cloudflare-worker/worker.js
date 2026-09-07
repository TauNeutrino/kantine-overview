// Kantine Dish-Images Worker — serverseitiger Chefkoch-Rezeptfoto-Scrape.
// Rezeptseiten liefern exakte Gerichts-Treffer (echte Rezeptfotos statt
// Suchmaschinen-Müll). Chefkoch serves vollständiges HTML an Server-IPs und
// erlaubt Hotlinking seiner CDN-Bilder ohne Referer-Prüfung.
//
// Deutsche Rezeptseiten werden IMMER mit dem deutschen Gerichtsnamen gesucht
// (Parameter qde; englische Begriffe liefern auf chefkoch.de falsche Treffer).
// Bilder erhalten einen Relevanz-Score: Token-Überlappung zwischen Suchquery
// und Rezept-Slug, absteigend sortiert.
//
// GET https://<worker>.workers.dev/?q=roast%20pork&qde=Schweinebraten&hl=en
// -> { "query": "...", "searchQuery": "...", "engine": "chefkoch", "count": 5,
//      "images": [{ "url": "...", "license": "Chefkoch", "creator": "chefkoch.de",
//                   "title": "Schweinebraten ...", "score": 2 }] }
//
// Weitere Quellen: eine fetchFrom<X>()-Scrape-Funktion ergänzen und in der
// Merge-Logik (Promise.all) sammeln. Getestet und NICHT GET-scrapebar
// (Stand: 2026-09): gutekueche.at + kochbar.de (Suche clientseitig,
// ?search= filtert nicht), lecker.de (JS-gerendert), Google/Bing/DDG/Yandex
// (bot-geblockt für Server-IPs).

const CHEFKOCH_SEARCH_URL = 'https://www.chefkoch.de/rs/s0/{q}/Rezepte.html';
const CK_IMG_REGEX = /https:\/\/img\.chefkoch-cdn\.de\/rezepte\/\d+\/bilder\/\d+\/[^"'?\s\\<>]+\.jpg/g;
const KOCHBAR_SEARCH_URL = 'https://www.kochbar.de/rezepte/{q}.html';
const KB_IMG_REGEX = /https:\/\/ais\.kochbar\.de\/kbrezept\/([^\/\s"']+?)\/\d+x\d+\/([^"'\s\\<>]+\.jpg)/g;
const KB_IMAGE_SIZE = '460x345';
const EATSMARTER_SEARCH_URL = 'https://eatsmarter.de/suche/rezepte?ft={q}';
const ES_IMG_REGEX = /https:\/\/images\.eatsmarter\.de\/sites\/default\/files\/styles\/300x225-webp\/public\/([^"'?\s\\<>]+\.jpg)/g;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Revision marker — bump on every worker change so live deployments are
// verifiable with one curl (Cloudflare auto-deploy can lag or fail silently).
const WORKER_REV = '2026-09-07-synonyms';

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}

function slugTokensFromUrl(imageUrl) {
    const file = (imageUrl.split('/').pop() || '').replace(/\.jpg$/i, '');
    return file.split('-').filter(Boolean);
}

function normalizeToken(token) {
    return token.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

// Austrian dish vocabulary mapped to standard German — the canteen menu
// uses Austrian names (Rindsbraten, Erdäpfel, Paradeiser) while recipe sites
// mostly use standard spellings (Rinderbraten, Kartoffel, Tomate).
const AUSTRIAN_FOOD_SYNONYMS = {
    rindsbraten: 'rinderbraten', hendl: 'haehnchen', hendel: 'haehnchen',
    erdaepfel: 'kartoffel', paradeiser: 'tomate', fisolen: 'bohnen',
    marillen: 'aprikosen', topfen: 'quark', palatschinken: 'pfannkuchen',
    semmel: 'broetchen', schlagobers: 'sahne', obers: 'sahne', rahm: 'sahne',
    eierschwammerl: 'pfifferlinge', karfiol: 'blumenkohl', kraut: 'kohl',
    vogelsalat: 'feldsalat', ribisel: 'johannisbeeren', powidl: 'pflaumenmus',
    germ: 'hefe', staubzucker: 'puderzucker', stelze: 'haxe', beuschel: 'lunge'
};

function canonicalToken(token) {
    const normalized = normalizeToken(token);
    return AUSTRIAN_FOOD_SYNONYMS[normalized] || normalized;
}

// Side-dish indicators: from the first indicator on, German dish suffixes
// ("mit X", "dazu", "als Beilage", ...) weigh only a quarter — a side-heavy
// slide must not outrank the pure main dish.
const SIDE_INDICATORS = ['mit', 'an', 'dazu', 'beilage', 'beilagen', 'garnitur', 'garniert', 'serviert'];

function queryTokenWeights(queryTokens) {
    const weights = [];
    let side = false;
    for (const token of queryTokens) {
        if (SIDE_INDICATORS.includes(token)) side = true;
        weights.push(side ? 0.25 : 1);
    }
    return weights;
}

function partialMatchWeight(slugTokens, queryToken) {
    const normalized = canonicalToken(queryToken);
    if (normalized.length < 4) return 0;
    for (const raw of slugTokens) {
        const slugToken = canonicalToken(raw);
        if (slugToken.length >= 4 && (slugToken.includes(normalized) || normalized.includes(slugToken))) return 0.5;
    }
    return 0;
}

function relevanceScore(slugTokens, queryTokens) {
    const slug = slugTokens.map(canonicalToken);
    const query = queryTokens.map(canonicalToken);
    const weights = queryTokenWeights(query);
    let exact = 0;
    const matched = new Set();
    for (let i = 0; i < query.length; i++) {
        if (slug.includes(query[i])) {
            exact += weights[i];
            matched.add(query[i]);
        } else if (partialMatchWeight(slug, query[i]) > 0) {
            exact += weights[i] * 0.5;
            matched.add(query[i]);
        }
    }
    let orderedPairs = 0;
    for (let i = 0; i + 1 < query.length; i++) {
        for (let j = i + 1; j < query.length; j++) {
            const first = slug.indexOf(query[i]);
            const second = slug.indexOf(query[j]);
            if (first >= 0 && second > first) orderedPairs += Math.min(weights[i], weights[j]);
        }
    }
    const extraSlugTokens = slug.length - matched.size;
    const firstTokenBonus = (slug.length > 0 && query.length > 0 && slug[0] === query[0]) ? weights[0] : 0;
    const contiguousBonus = slug.join(' ').includes(query.join(' ')) ? 4 : 0;
    return 2 * exact + 2 * orderedPairs - 0.5 * extraSlugTokens + firstTokenBonus + contiguousBonus;
}

function titleFromSlug(slugTokens) {
    return slugTokens.map(token => token.charAt(0).toUpperCase() + token.slice(1)).join(' ');
}

function searchCandidates(query) {
    const words = String(query).trim().split(/\s+/).filter(Boolean);
    const candidates = [String(query).trim()];
    if (words.length >= 2) candidates.push(words.slice(0, 2).join(' '));
    if (words.length >= 1) candidates.push(words[0]);
    return [...new Set(candidates)].filter(candidate => candidate.length >= 3);
}

function candidateTokens(candidate) {
    return candidate.toLowerCase().split(/[\s-]+/).filter(word => word.length >= 2);
}

function slugifySearchQuery(query) {
    return query
        .toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

async function fetchFromChefkoch(searchQuery) {
    for (const candidate of searchCandidates(searchQuery)) {
        const tokens = candidateTokens(candidate);
        const searchUrl = CHEFKOCH_SEARCH_URL.replace('{q}', encodeURIComponent(candidate).replace(/%20/g, '+'));
        let html = '';
        try {
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': BROWSER_UA,
                    'Accept-Language': 'de-AT,de;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml'
                }
            });
            html = await response.text();
        } catch (e) {
            continue;
        }

        const seen = new Set();
        const scored = [];
        for (const match of html.matchAll(CK_IMG_REGEX)) {
            const imageUrl = match[0];
            const dedupeKey = imageUrl.split('/').slice(0, 7).join('/');
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);
            const slugTokens = slugTokensFromUrl(imageUrl);
            scored.push({
                url: imageUrl,
                license: 'Chefkoch',
                creator: 'chefkoch.de',
                title: titleFromSlug(slugTokens),
                score: relevanceScore(slugTokens, tokens)
            });
        }
        if (scored.length >= 1) return scored;
    }
    return [];
}

async function fetchFromKochbar(searchQuery) {
    for (const candidate of searchCandidates(searchQuery)) {
        const tokens = candidateTokens(candidate);
        const slug = slugifySearchQuery(candidate);
        if (slug.length < 3) continue;
        const searchUrl = KOCHBAR_SEARCH_URL.replace('{q}', slug);
        let html = '';
        try {
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': BROWSER_UA,
                    'Accept-Language': 'de-AT,de;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml'
                }
            });
            html = await response.text();
        } catch (e) {
            continue;
        }

        const seen = new Set();
        const scored = [];
        for (const match of html.matchAll(KB_IMG_REGEX)) {
            const kbrezeptId = match[1];
            const file = match[2];
            if (file.includes('@')) continue;
            if (seen.has(kbrezeptId)) continue;
            seen.add(kbrezeptId);
            const imageUrl = `https://ais.kochbar.de/kbrezept/${kbrezeptId}/${KB_IMAGE_SIZE}/${file}`;
            const slugTokens = file.replace(/\.jpg$/i, '').replace(/-rezept$/, '').split('-').filter(Boolean);
            scored.push({
                url: imageUrl,
                license: 'Kochbar',
                creator: 'kochbar.de',
                title: titleFromSlug(slugTokens),
                score: relevanceScore(slugTokens, tokens),
                source: 'kochbar'
            });
        }
        if (scored.length >= 1) return scored;
    }
    return [];
}

async function fetchFromEatsmarter(searchQuery) {
    for (const candidate of searchCandidates(searchQuery)) {
        const tokens = candidateTokens(candidate);
        const searchUrl = EATSMARTER_SEARCH_URL.replace('{q}', encodeURIComponent(candidate));
        let html = '';
        try {
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': BROWSER_UA,
                    'Accept-Language': 'de-AT,de;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml'
                }
            });
            html = await response.text();
        } catch (e) {
            continue;
        }

        const seen = new Set();
        const scored = [];
        for (const match of html.matchAll(ES_IMG_REGEX)) {
            const file = match[1];
            if (file.includes('default_images')) continue;
            if (seen.has(file)) continue;
            seen.add(file);
            const imageUrl = `https://images.eatsmarter.de/sites/default/files/styles/300x225-webp/public/${file}`;
            const slugTokens = file.replace(/\.jpg$/i, '').split('-').filter(token => token && !/^\d+$/.test(token));
            scored.push({
                url: imageUrl,
                license: 'Eatsmarter',
                creator: 'eatsmarter.de',
                title: titleFromSlug(slugTokens),
                score: relevanceScore(slugTokens, tokens),
                source: 'eatsmarter'
            });
        }
        if (scored.length >= 1) return scored;
    }
    return [];
}

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const query = url.searchParams.get('q');
        const queryDe = url.searchParams.get('qde');
        const hl = url.searchParams.get('hl') === 'en' ? 'en' : 'de';

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS'
                }
            });
        }
        if (request.method !== 'GET' || !query || query.trim().length < 3) {
            return jsonResponse({ error: 'missing or too-short q parameter' }, 400);
        }

        // Deutsche Rezeptseiten suchen immer mit dem deutschen Gerichtsnamen —
        // englische Begriffe liefern dort falsche Treffer.
        const searchQuery = (queryDe && queryDe.trim().length >= 3) ? queryDe.trim() : query.trim();

        const [chefkochScored, kochbarScored, eatsmarterScored] = await Promise.all([
            fetchFromChefkoch(searchQuery),
            fetchFromKochbar(searchQuery),
            fetchFromEatsmarter(searchQuery)
        ]);
        const chefkochWithSource = chefkochScored.map(img => ({ ...img, source: 'chefkoch' }));
        // Alle Quellen werden vollständig gescored; dann Score-sortiertes
        // Round-Robin-Interleave (bester Treffer jeder Quelle im Wechsel),
        // damit jede Quelle in den Top-5 vertreten ist — erst am Ende wird
        // auf 5 reduziert.
        const pools = [chefkochWithSource, kochbarScored, eatsmarterScored];
        pools.forEach(pool => pool.sort((a, b) => b.score - a.score));
        const merged = [];
        const maxPoolLength = Math.max(...pools.map(pool => pool.length), 0);
        for (let i = 0; i < maxPoolLength; i++) {
            for (const pool of pools) {
                if (pool[i]) merged.push(pool[i]);
            }
        }
        const images = merged.slice(0, 5);

        return jsonResponse({ query: query.trim(), searchQuery, hl, engine: 'chefkoch+kochbar+eatsmarter', rev: WORKER_REV, count: images.length, images });
    }
}
