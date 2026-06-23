// @ts-check
'use strict';
/**
 * _langLoader.js — CommonJS VM sandbox loader for src/lang/*.js ES6 modules.
 * Strips "export " and "import ... from ...;" so node can run them without webpack.
 * Used by all lang module tests.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.join(__dirname, '..');

/**
 * Load one or more src/lang/*.js ES6 modules into a single vm sandbox.
 * Files are concatenated in the order provided (dependency order matters).
 * @param {string[]} filePaths - relative paths from project root (e.g. ['src/lang/types.js'])
 * @param {object} [extraSandbox={}] - additional sandbox properties
 * @returns {object} the sandbox — exported names are properties on it
 */
function load(filePaths, extraSandbox = {}) {
  const sandbox = Object.assign({
    console: console,
    Date: Date,
    setTimeout: () => 1,
    clearTimeout: () => {},
    document: { createElement: (tag) => ({ tag, textContent: '' }) },
    langMode: 'de',
  }, extraSandbox);

  vm.createContext(sandbox);

  let combined = '';
  for (const relPath of filePaths) {
    const abs = path.join(PROJECT_ROOT, relPath);
    const src = fs.readFileSync(abs, 'utf8');
    const cleaned = src
      .replace(/export /g, '')
      .replace(/import .*? from .*?;/g, '')
      // const/let at the top level of a vm context are block-scoped and won't
      // leak to the sandbox object. Promote them to var so callers can read them.
      .replace(/^(const|let) /gm, 'var ');
    combined += cleaned + '\n';
  }

  vm.runInContext(combined, sandbox);
  return sandbox;
}

module.exports = { load };
