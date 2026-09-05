'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, logFixture } = require('./helpers');

const {
  parseLogDateInput, toLocalDateInputValue, isFutureCalendarDay,
  csvCell, heatLevel, buildHeatmapData, breakdownByCategory,
} = load([
  'parseLogDateInput', 'toLocalDateInputValue', 'isFutureCalendarDay',
  'csvCell', 'heatLevel', 'getDayCounts', 'buildHeatmapData',
  'breakdownByCategory',
]);

test('date input parsing is strict', () => {
  const d = parseLogDateInput('2026-03-04');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 2);
  assert.equal(d.getDate(), 4);
  assert.equal(d.getHours(), 12);
  assert.ok(Date.now() - parseLogDateInput('').getTime() < 5000);
  assert.equal(parseLogDateInput('ieri'), null);
  assert.equal(parseLogDateInput('2026-13-40'), null); // no month overflow
  assert.equal(parseLogDateInput('2026-02-30'), null); // no day overflow
  assert.equal(parseLogDateInput(toLocalDateInputValue(new Date(2026, 4, 9))).getDate(), 9);
});

test('future check ignores time of day', () => {
  const now = new Date();
  const morning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  assert.equal(isFutureCalendarDay(morning), false);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  assert.equal(isFutureCalendarDay(tomorrow), true);
});

test('csv cells are quoted and injection-safe', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a;b'), '"a;b"');
  assert.equal(csvCell('di"ce'), '"di""ce"');
  assert.equal(csvCell('x\ny'), '"x\ny"');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell('=cmd|xx'), "'=cmd|xx");
  assert.equal(csvCell('+cmd'), "'+cmd");
  assert.equal(csvCell('@x'), "'@x");
});

test('heatmap data aligns Monday-first with full weeks', () => {
  const anchor = Date.UTC(2026, 8, 5); // a Saturday
  const cells = buildHeatmapData(
    [logFixture({ timestamp: '2026-09-05T10:00:00.000Z' }), logFixture({ timestamp: '2026-09-05T12:00:00.000Z' })],
    126, anchor
  );
  assert.equal(cells.length % 7, 0);
  assert.equal((cells[0].date.getUTCDay() + 6) % 7, 0); // Monday
  assert.equal(cells[cells.length - 1].date.getUTCDay(), 0); // Sunday
  assert.equal(cells.filter((c) => c.inRange).length, 126);
  assert.equal(cells.find((c) => c.date.toISOString().slice(0, 10) === '2026-09-05').count, 2);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 99].map(heatLevel), [0, 1, 2, 2, 3, 3, 4, 4]);
});

test('category breakdown groups, sorts, percentages', () => {
  const logs = [
    ...Array.from({ length: 5 }, () => logFixture({ techId: 'rnc', techName: 'RNC', category: 'chokes' })),
    ...Array.from({ length: 3 }, () => logFixture({ techId: 'triangle', techName: 'Tri', category: 'chokes' })),
    logFixture({ techId: 'custom_1', techName: 'Mine', category: 'custom' }),
  ];
  const b = breakdownByCategory(logs);
  assert.deepEqual(b.chokes.map((x) => x.name), ['RNC', 'Tri']);
  assert.equal(b.chokes[0].pct, 63); // 5/8 rounded
  assert.equal(b.armlocks.length, 0);
  assert.equal(b.other[0].name, 'Mine');
});
