'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, logFixture } = require('./helpers');

const { generateId, sanitizeLog, sanitizeCustomTech } = load(
  ['generateId', 'sanitizeLog', 'sanitizeCustomTech'],
  'var VALID_BELTS=new Set(["white","blue","purple","brown","black"]);' +
  'var VALID_CATEGORIES=new Set(["chokes","leglocks","armlocks","custom"]);'
);

test('generateId: short, prefixed, unique', () => {
  const id = generateId('log');
  assert.match(id, /^log_[a-z0-9]{13}$/);
  assert.equal(new Set(Array.from({ length: 2000 }, () => generateId('log'))).size, 2000);
  assert.ok(generateId('custom').startsWith('custom_'));
});

test('sanitizeLog accepts good records and truncates', () => {
  const clean = sanitizeLog({ ...logFixture(), techName: 'x'.repeat(200), notes: 'y'.repeat(500) });
  assert.equal(clean.techName.length, 80);
  assert.equal(clean.notes.length, 280);
});

test('sanitizeLog rejects bad belt, fixes category/timestamp', () => {
  assert.equal(sanitizeLog(logFixture({ belt: 'red' })), null);
  assert.equal(sanitizeLog(logFixture({ category: 'hacks' })).category, 'custom');
  assert.ok(!isNaN(new Date(sanitizeLog(logFixture({ timestamp: 'garbage' })).timestamp).getTime()));
  assert.equal(sanitizeLog(null), null);
  assert.equal(sanitizeLog({}), null); // belt missing
  assert.equal(sanitizeLog({ id: 'x', belt: 'white' }).techName, 'Tecnica sconosciuta');
});

test('sanitizeCustomTech keeps chokes, rejects junk', () => {
  assert.equal(
    sanitizeCustomTech({ id: 'custom_1', name: 'My Choke', category: 'chokes', tag: 'Custom' }).category,
    'chokes'
  );
  assert.equal(sanitizeCustomTech({ id: 'evil', name: 'X', category: 'chokes' }), null);
  assert.equal(sanitizeCustomTech({ id: 'custom_2', name: '   ', category: 'chokes' }), null);
  assert.equal(sanitizeCustomTech({ id: 'custom_3', name: 'X', category: 'nope' }).category, 'custom');
});
