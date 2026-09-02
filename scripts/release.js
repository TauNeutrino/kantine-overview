#!/usr/bin/env node
/**
 * release.js — Kantine Release Trigger
 *
 * Bumps the patch version in version.txt, commits and pushes to main.
 * Everything else is automated by CI/CD (.github/workflows/build-and-deploy.yml):
 * build with real secrets, GitHub Pages deploy, git tag created/pushed by CI.
 *
 * Pipeline:
 *   1. Guard: on branch main, clean working tree
 *   2. Guard: next version tag must not exist yet (local + remote)
 *   3. Bump patch in version.txt (v2.1.2 -> v2.1.3)
 *   4. Commit version.txt
 *   5. Push main -> CI builds, deploys GitHub Pages and tags the release
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const VERSION_FILE = path.join(ROOT, 'version.txt');

// ── Helpers ────────────────────────────────────────────────────────────────
function exec(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    timeout: 60_000,
    stdio: 'pipe',
    encoding: 'utf8',
    ...opts,
  }).trim();
}

function log(...a)    { console.log(...a); }
function ok(...a)     { console.log('✅', ...a); }
function fail(...a)   { console.error('❌', ...a); process.exit(1); }
function warn(...a)   { console.warn('⚠️', ...a); }

// ── Main ───────────────────────────────────────────────────────────────────
function main() {
  // Git repo guard
  try { exec('git rev-parse --git-dir'); } catch (_) {
    fail('Not a git repository.');
  }

  // Branch guard: CI only deploys from main
  const branch = exec('git branch --show-current');
  if (branch !== 'main') {
    fail(`Releasing is only allowed from branch main (current: ${branch}).`);
  }

  // Clean tree guard: a release is a deliberate act from a clean state
  const status = exec('git status --porcelain --ignore-submodules');
  if (status) {
    fail('Working tree not clean — commit your changes first.\n' +
         '  (Stale local dist/ builds can be discarded via: git checkout -- dist/)\n' + status);
  }

  // Read + parse current version
  if (!fs.existsSync(VERSION_FILE)) {
    fail(`version.txt not found at ${VERSION_FILE}`);
  }
  const current = fs.readFileSync(VERSION_FILE, 'utf8').replace(/[\n\r ]/g, '');
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match) {
    fail(`Unexpected version format in version.txt: "${current}" (expected vX.Y.Z)`);
  }
  const next = `v${match[1]}.${match[2]}.${Number(match[3]) + 1}`;

  // Tag guards: never bump onto an already-released version
  const localTagExists = (() => {
    try { exec(`git rev-parse -q --verify refs/tags/${next}`); return true; }
    catch (_) { return false; }
  })();
  if (localTagExists) {
    fail(`Tag ${next} already exists locally — version.txt is behind the tag history.`);
  }
  let remoteTag = '';
  try {
    remoteTag = exec(`git ls-remote --tags origin refs/tags/${next}`);
  } catch (e) {
    warn('Could not check remote tags (network?). Continuing — CI resolves tag conflicts.');
  }
  if (remoteTag) {
    fail(`Tag ${next} already exists on origin — aborting to avoid overwriting a released version.`);
  }

  log(`=== Kantine Release Trigger (${current} -> ${next}) ===\n`);

  // Bump version
  fs.writeFileSync(VERSION_FILE, `${next}\n`);
  ok(`version.txt: ${current} -> ${next}`);

  // Commit the bump (no [skip ci] — the push itself must trigger CI!)
  exec('git add version.txt');
  exec(`git commit -m "chore(release): bump version to ${next}"`);
  ok(`Committed version bump to ${next}`);

  // Push: CI/CD does the rest (build, Pages deploy, tag)
  log('\n=== Pushing to origin ===');
  exec('git push origin main');
  ok('Pushed main.');
  log(`\n🎉 Release ${next} triggered. CI/CD is now building, deploying to GitHub Pages`);
  log(`   and creating/pushing the tag ${next}. Track it: Actions -> "Build & Deploy".`);
}

main();
