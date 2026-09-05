'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { grab, techArray, badgeConfig, logFixture } = require('./helpers');

const helperNames = [
  'getDistinctDayKeys', 'getMaxDayStreak', 'getIsoWeekKey', 'getDistinctWeeks',
  'getDayCounts', 'getMaxTapsSingleDay', 'getMaxGapDays', 'getMaxConsecutiveMonths',
  'getDistinctMonthKeys', 'countWeekendTaps', 'hasTapInHourRange', 'hasTripleThreatDay',
];
const badges = new Function(
  'customTechs', 'TECHNIQUES',
  helperNames.map(grab).join('\n') + '\n' + badgeConfig() + '\nreturn BADGES_CONFIG;'
)(
  [{ id: 'custom_1' }, { id: 'custom_2' }, { id: 'custom_3' }],
  techArray()
);
const byId = Object.fromEntries(badges.map((b) => [b.id, b]));

test('badge set: 56 unique ids', () => {
  assert.equal(badges.length, 56);
  assert.equal(new Set(badges.map((b) => b.id)).size, 56);
});

test('volume + hunter badges', () => {
  const whites = Array.from({ length: 5 }, () => logFixture({ belt: 'white' }));
  assert.equal(byId['white_washer'].check(whites), true);
  assert.equal(byId['white_washer'].check(whites.slice(1)), false);
  const chokes20 = Array.from({ length: 20 }, () => logFixture({ category: 'chokes' }));
  assert.equal(byId['vannacciano'].check(chokes20), true);
  assert.equal(byId['vannacciano'].check(chokes20.slice(1)), false);
});

test('time-based badges use local hours/days', () => {
  const night = logFixture({ timestamp: new Date(2026, 4, 3, 2, 30, 0).toISOString() });
  const day = logFixture({ timestamp: new Date(2026, 4, 3, 14, 0, 0).toISOString() });
  const dawn = logFixture({ timestamp: new Date(2026, 4, 3, 6, 15, 0).toISOString() });
  assert.equal(byId['kali_yuga'].check([night]), true);
  assert.equal(byId['kali_yuga'].check([day]), false);
  assert.equal(byId['alba'].check([dawn]), true);
  const sats = Array.from({ length: 10 }, (_, i) =>
    logFixture({ timestamp: new Date(2026, 0, 3 + i * 7, 10, 0, 0).toISOString() }));
  assert.equal(byId['weekend_warrior'].check(sats), true);
});

test('streak / months / weeks', () => {
  const consec = [0, 1, 2].map((m) => logFixture({ timestamp: new Date(Date.UTC(2026, m, 15, 10)).toISOString() }));
  assert.equal(byId['three_months'].check(consec), true);
  const gapped = [consec[0], logFixture({ timestamp: new Date(Date.UTC(2026, 4, 15, 10)).toISOString() })];
  assert.equal(byId['three_months'].check(gapped), false);
  const week = Array.from({ length: 7 }, (_, i) =>
    logFixture({ timestamp: new Date(Date.UTC(2026, 4, 4 + i, 10)).toISOString() }));
  assert.equal(byId['perfect_week'].check(week), true);
  assert.equal(byId['perfect_week'].check(week.slice(1)), false);
  const year = Array.from({ length: 12 }, (_, m) =>
    logFixture({ timestamp: new Date(Date.UTC(2026, m, 15, 10)).toISOString() }));
  assert.equal(byId['full_year'].check(year), true);
  const gap30 = [logFixture({ timestamp: '2026-02-01T10:00:00.000Z' }), logFixture({ timestamp: '2026-03-04T10:00:00.000Z' })];
  assert.equal(byId['comeback'].check(gap30), true);
});

test('specialists and meta badges', () => {
  const ezekiels = [
    logFixture({ techId: 'ezekiel' }), logFixture({ techId: 'ezekiel_one_arm' }), logFixture({ techId: 'ezekiel' }),
  ];
  assert.equal(byId['ezekiel_enforcer'].check(ezekiels), true);
  assert.equal(byId['rare_breed'].check([logFixture({ techId: 'twister', category: 'armlocks' })]), true);
  assert.equal(byId['rare_breed'].check([logFixture()]), false);
  assert.equal(byId['mad_scientist'].check([logFixture({ techId: 'custom_9', category: 'custom' })]), true);
  assert.equal(byId['custom_master'].check([]), true); // 3 customs stubbed above
  const all23 = techArray().map((t) => logFixture({ techId: t.id, category: 'chokes' }));
  assert.equal(byId['completionist'].check(all23), true);
  assert.equal(byId['completionist'].check(all23.slice(1)), false);
  const triple = [
    logFixture({ timestamp: '2026-05-03T10:00:00.000Z', category: 'chokes' }),
    logFixture({ timestamp: '2026-05-03T11:00:00.000Z', techId: 'kneebar', category: 'leglocks' }),
    logFixture({ timestamp: '2026-05-03T12:00:00.000Z', techId: 'armbar', category: 'armlocks' }),
  ];
  assert.equal(byId['triple_threat'].check(triple), true);
  assert.equal(byId['biografo'].check(Array.from({ length: 25 }, () => logFixture({ notes: 'n' }))), true);
});
