'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, loadLib, techArray, installStorageStub, logFixture } = require('./helpers');

globalThis.LZString = loadLib('lz-string.min.js', 'LZString');

installStorageStub();
const {
  encodeSyncPayload, bytesToB64Url, b64UrlToJson,
  expandCompactPayload, decodeSyncPayload,
  storeSyncPart, parseSyncPartParam, hasSyncPart, ingestPart,
} = load(
  ['encodeSyncPayload', 'bytesToB64Url', 'b64UrlToJson',
   'expandCompactPayload', 'decodeSyncPayload',
   'storeSyncPart', 'parseSyncPartParam', 'hasSyncPart', 'ingestPart'],
  'var BELT_ORDER=["white","blue","purple","brown","black"];' +
  'var customTechs=[];' +
  'var TECHNIQUES=' + JSON.stringify(techArray()) + ';' +
  'const PARTS_PREFIX="sublog_parts_";const PARTS_MAX_AGE_MS=604800000;const PARTS_MAX_CHUNKS=200;'
);

test('60-log transfer reassembles losslessly, any arrival order', () => {
  const logs = Array.from({ length: 60 }, (_, i) => logFixture({
    id: 'log_' + i,
    timestamp: new Date(Date.UTC(2026, 4, i + 1, 10)).toISOString(),
    belt: ['white', 'blue', 'purple', 'brown', 'black'][i % 5],
  }));
  const full = encodeSyncPayload({ logs, customTechs: [] });
  const CH = 1100;
  const n = Math.ceil(full.length / CH);
  const tid = 'abc123XY';
  let res = null;
  for (const i of [...Array(n).keys()].reverse()) {
    const part = parseSyncPartParam(`${tid}.${i}.${n}.${full.slice(i * CH, (i + 1) * CH)}`);
    assert.ok(part, 'part parses at index ' + i);
    res = storeSyncPart(part.transferId, part.idx, part.total, part.chunk);
  }
  assert.ok(res.assembled);
  assert.equal(decodeSyncPayload(res.assembled).logs.length, 60);
});

test('invalid parts are rejected', () => {
  assert.equal(storeSyncPart('tid', 99, 3, 'abc'), null); // idx out of range
  assert.equal(storeSyncPart('t2', 0, 2, 'a&b'), null); // bad charset
  assert.equal(storeSyncPart('t3', 0, 201, 'abc'), null); // too many chunks
  assert.equal(storeSyncPart('x', 0, 1, 'abc'), null); // transfer id too short
  assert.equal(parseSyncPartParam('nope'), null);
  assert.equal(parseSyncPartParam('id.0.2'), null);
});

test('partial progress reported until complete', () => {
  const tid = 'partprog1';
  const first = storeSyncPart(tid, 0, 2, 'QUJD');
  assert.deepEqual([first.received, first.total, first.assembled], [1, 2, null]);
});

test('ingestPart: progress then complete, duplicates visible', () => {
  const logs = [logFixture({ id: 'ing1' }), logFixture({ id: 'ing2' })];
  const full = encodeSyncPayload({ logs, customTechs: [] });
  const mid = Math.ceil(full.length / 2);
  const tid = 'ingest9z';
  const p0 = parseSyncPartParam(`${tid}.0.2.${full.slice(0, mid)}`);
  const p1 = parseSyncPartParam(`${tid}.1.2.${full.slice(mid)}`);
  const r0 = ingestPart(p0);
  assert.deepEqual([r0.status, r0.received, r0.total], ['progress', 1, 2]);
  assert.equal(hasSyncPart(tid, 0), true);
  assert.equal(hasSyncPart(tid, 1), false);
  const r1 = ingestPart(p1);
  assert.equal(r1.status, 'complete');
  assert.equal(r1.data.logs.length, 2);
  assert.equal(ingestPart(null).status, 'invalid');
  assert.equal(ingestPart({ transferId: tid, idx: 9, total: 2, chunk: 'xx' }).status, 'invalid');
});
