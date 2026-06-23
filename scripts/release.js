#!/usr/bin/env node
/**
 * release.js — Platform-independent Kantine Releaser
 * Replaces: release.sh
 *
 * Pipeline:
 *   1. Check dist/ exists
 *   2. Read version
 *   3. Check for uncommitted changes (excluding dist/)
 *   4. git add dist/
 *   5. git commit -m "chore: update build artifacts for <version>"
 *   6. git tag <version>
 *   7. git push origin HEAD
 *   8. git push origin --force tag <version>
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
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
  // 1. Check dist/
  if (!fs.existsSync(DIST)) {
    fail(`dist folder missing at ${DIST}. Please run "npm run build" first.`);
  }

  // 2. Read version
  if (!fs.existsSync(VERSION_FILE)) {
    fail(`version.txt not found at ${VERSION_FILE}`);
  }
  const VERSION = fs.readFileSync(VERSION_FILE, 'utf8').replace(/[\n\r ]/g, '');
  if (!VERSION) {
    fail('Could not determine version from version.txt');
  }

  log(`=== Kantine Bookmarklet Releaser (${VERSION}) ===\n`);

  // Check we're in a git repo
  try { exec('git rev-parse --git-dir'); } catch (_) {
    fail('Not a git repository.');
  }

  // 3. Check for uncommitted changes (excluding dist/)
  const statusOutput = exec('git status --porcelain --ignore-submodules');
  const nonDistChanges = statusOutput
    .split('\n')
    .filter(line => line.trim() && !line.includes('dist/'))
    .join('\n');

  if (nonDistChanges) {
    warn('You have uncommitted changes outside dist/:');
    console.log(nonDistChanges);
    console.log();
    fail('Please commit your code changes before running the release script.\n' +
         '  You can run: npm run build && git add -A && git commit -m "..." && npm run release');
  }

  // 4. git add dist/
  log('=== Committing build artifacts ===');
  exec('git add dist/');
  ok('git add dist/');

  // 5. git commit (allow-empty — we want a tag commit even if nothing changed)
  try {
    exec(`git commit -m "chore: update build artifacts for ${VERSION}" --allow-empty`);
    ok(`Committed dist/ for ${VERSION}`);
  } catch (e) {
    warn(`Commit may have failed: ${e.message}`);
  }

  // 6. Tag
  log('\n=== Tagging ===');
  const tagExists = (() => {
    try { exec(`git rev-parse "${VERSION}"`); return true; }
    catch (_) { return false; }
  })();
  if (tagExists) {
    exec(`git tag -f "${VERSION}"`);
    warn(`Tag ${VERSION} moved to current commit.`);
  } else {
    exec(`git tag "${VERSION}"`);
    ok(`Created tag: ${VERSION}`);
  }

  // 7-8. Push
  log('\n=== Pushing to origin ===');
  try {
    exec('git push origin HEAD');
    ok('Pushed HEAD to origin');
  } catch (e) {
    warn(`Push HEAD failed: ${e.message}`);
  }
  try {
    exec(`git push origin --force tag "${VERSION}"`);
    ok(`Pushed tag ${VERSION} to origin`);
  } catch (e) {
    warn(`Push tag failed: ${e.message}`);
  }

  log(`\n🎉 Successfully released version ${VERSION}!`);
}

main();
