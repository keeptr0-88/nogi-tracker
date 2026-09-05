'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { load, loadLib, techArray, grab } = require('./helpers');

// Codec functions resolve LZString through the global scope, mirroring the browser.
globalThis.LZString = loadLib('lz-string.min.js', 'LZString');

const BELT_ORDER = ['white', 'blue', 'purple', 'brown', 'black'];
const customTechs = [{ id: 'custom_x1', name: 'Aoki Lock', category: 'leglocks', tag: 'Custom' }];

const { encodeSyncPayload, bytesToB64Url, b64UrlToJson, expandCompactPayload, decodeSyncPayload } = load(
  ['encodeSyncPayload', 'bytesToB64Url', 'b64UrlToJson', 'expandCompactPayload', 'decodeSyncPayload'],
  'var BELT_ORDER=["white","blue","purple","brown","black"];' +
  'var customTechs=[{id:"custom_x1",name:"Aoki Lock",category:"leglocks",tag:"Custom"}];' +
  'var TECHNIQUES=' + JSON.stringify(techArray()) + ';'
);

const logs = [
  { id: 'log_a1', timestamp: '2026-03-04T10:00:00.000Z', belt: 'blue', techId: 'rnc', techName: 'Rear Naked Choke', category: 'chokes', notes: 'Dalla 50/50 🥋 àèì' },
  { id: 'log_b2', timestamp: '2026-03-05T10:00:00.000Z', belt: 'black', techId: 'custom_x1', techName: 'Aoki Lock', category: 'leglocks', notes: '' },
];

test('v3 roundtrip preserves everything', () => {
  const enc = encodeSyncPayload({ logs, customTechs });
  assert.match(enc, /^[A-Za-z0-9\-_]+$/);
  assert.equal(JSON.parse(b64UrlToJson(enc)).v, 3);
  const back = decodeSyncPayload(enc);
  assert.equal(back.logs.length, 2);
  assert.equal(back.logs[0].techName, 'Rear Naked Choke');
  assert.equal(back.logs[0].notes, 'Dalla 50/50 🥋 àèì');
  assert.equal(back.logs[0].timestamp, logs[0].timestamp);
  assert.equal(back.logs[1].techName, 'Aoki Lock');
  assert.equal(back.customTechs.length, 1);
});

test('v2 payloads still decode', () => {
  const v2obj = { v: 2, l: logs.map((l) => [l.id, Date.parse(l.timestamp), BELT_ORDER.indexOf(l.belt), l.techId, l.notes]), t: [] };
  const enc = bytesToB64Url(Buffer.from(JSON.stringify(v2obj), 'utf8'));
  const back = decodeSyncPayload(enc);
  assert.equal(back.logs.length, 2);
  assert.equal(back.logs[0].techName, 'Rear Naked Choke');
});

test('v1 payloads still decode (object and raw array)', () => {
  const enc = (o) => bytesToB64Url(Buffer.from(JSON.stringify(o), 'utf8'));
  const byObj = decodeSyncPayload(enc({ logs, customTechs: [] }));
  assert.equal(byObj.logs[0].id, 'log_a1');
  assert.equal(byObj.logs[0].techName, 'Rear Naked Choke');
  assert.equal(decodeSyncPayload(enc(logs)).length, 2);
});

test('corrupt payloads throw instead of returning garbage', () => {
  const enc = (o) => bytesToB64Url(Buffer.from(JSON.stringify(o), 'utf8'));
  assert.throws(() => decodeSyncPayload(enc({ v: 3, c: '!!!' })), /Bad v3 payload/);
  assert.throws(() => decodeSyncPayload(enc({ v: 3, c: 'AAAA' })), /Decompression failed/);
  assert.throws(() => decodeSyncPayload(enc({ v: 3 })), /Bad v3 payload/);
  assert.throws(() => decodeSyncPayload(''), /Empty payload/);
  assert.throws(() => decodeSyncPayload('not valid!!'), /Invalid payload/);
});

test('encode degrades to v2 when LZString is missing', () => {
  const sandbox = {
    TextEncoder,
    TextDecoder,
    btoa: (s) => Buffer.from(s, 'latin1').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('latin1'),
    console,
  };
  // Deliberately no LZString in this context
  const fns = grab('encodeSyncPayload') + grab('bytesToB64Url') + grab('b64UrlToJson');
  const prelude = 'var BELT_ORDER=["white","blue","purple","brown","black"];';
  vm.createContext(sandbox);
  vm.runInContext(prelude + fns + ';globalThis.__enc = encodeSyncPayload;globalThis.__dec = b64UrlToJson;', sandbox);
  assert.equal(typeof sandbox.LZString, 'undefined');
  const enc = vm.runInContext(
    '__enc({logs:[{id:"x",timestamp:"2026-01-01T00:00:00.000Z",belt:"white",techId:"rnc",techName:"R",category:"chokes",notes:""}],customTechs:[]})',
    sandbox
  );
  const parsed = JSON.parse(vm.runInContext('__dec(' + JSON.stringify(enc) + ')', sandbox));
  assert.equal(parsed.v, 2);
});
