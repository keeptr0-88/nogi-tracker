'use strict';
// Shared loader: pulls pure functions out of app.js (which is a browser
// script, not a module) so node --test can exercise the real code.
const fs = require('fs');
const path = require('path');

const APP_PATH = path.join(__dirname, '..', 'app.js');
const src = fs.readFileSync(APP_PATH, 'utf8');

function grab(name) {
  const m = src.match(new RegExp('function ' + name + '[\\s\\S]*?\\n\\}'));
  if (!m) throw new Error('function not found in app.js: ' + name);
  return m[0];
}

function techArray() {
  const m = src.match(/const TECHNIQUES = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error('TECHNIQUES not found');
  return eval(m[1]);
}

// Load functions into a fresh scope and return them by name.
// (Plain eval() does not leak declarations out of strict-mode modules,
// so we wrap in new Function instead.)
function load(names, prelude = '') {
  const code = names.map(grab).join('\n');
  return new Function(`${prelude}\n${code}\nreturn { ${names.join(', ')} };`)();
}

function loadLib(relPath, exportName) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  return new Function(`${code}\nreturn ${exportName};`)();
}

function badgeConfig() {
  const m = src.match(/const BADGES_CONFIG = \[[\s\S]*?\n\];/);
  if (!m) throw new Error('BADGES_CONFIG not found');
  return m[0];
}

// In-memory localStorage stub for sync-part tests
function installStorageStub() {
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
  return store;
}

const logFixture = (over = {}) => ({
  id: 'log_' + Math.random().toString(36).slice(2),
  timestamp: '2026-05-03T10:00:00.000Z',
  belt: 'white',
  techId: 'rnc',
  techName: 'Rear Naked Choke',
  category: 'chokes',
  notes: '',
  ...over,
});

module.exports = { src, grab, techArray, badgeConfig, installStorageStub, logFixture, load, loadLib };
