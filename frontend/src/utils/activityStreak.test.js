import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVITY_DOT_COUNT,
  buildActivityDots,
  formatActivityStreakLabel,
  normalizeActivityStreakDays
} from './activityStreak.js';

function activeCount(value) {
  return buildActivityDots(value).filter(dot => dot.isActive).length;
}

test('zero active days highlight no dots', () => {
  assert.equal(normalizeActivityStreakDays(0), 0);
  assert.equal(activeCount(0), 0);
  assert.equal(formatActivityStreakLabel(0), '0 days of prep logged');
});

test('two active days highlight exactly two dots', () => {
  const dots = buildActivityDots(2);

  assert.equal(normalizeActivityStreakDays(2), 2);
  assert.equal(dots.filter(dot => dot.isActive).length, 2);
  assert.equal(dots[0].isActive, true);
  assert.equal(dots[1].isActive, true);
  assert.equal(dots[2].isActive, false);
  assert.equal(formatActivityStreakLabel(2), '2 days of prep logged');
});

test('fourteen active days highlight every dot', () => {
  const dots = buildActivityDots(14);

  assert.equal(normalizeActivityStreakDays(14), 14);
  assert.equal(dots.length, ACTIVITY_DOT_COUNT);
  assert.equal(dots.every(dot => dot.isActive), true);
});

test('values above fourteen are clamped to the fourteen-dot layout', () => {
  assert.equal(normalizeActivityStreakDays(21), 14);
  assert.equal(activeCount(21), 14);
  assert.equal(buildActivityDots(21).length, ACTIVITY_DOT_COUNT);
  assert.equal(formatActivityStreakLabel(21), '14 days of prep logged');
});

test('missing values resolve to zero without inventing activity', () => {
  assert.equal(normalizeActivityStreakDays(undefined), 0);
  assert.equal(normalizeActivityStreakDays(null), 0);
  assert.equal(normalizeActivityStreakDays(''), 0);
  assert.equal(activeCount(undefined), 0);
  assert.equal(activeCount(null), 0);
  assert.equal(formatActivityStreakLabel(undefined), '0 days of prep logged');
});

test('invalid values resolve to zero', () => {
  for (const value of ['not-a-number', NaN, Infinity, -Infinity, {}, [], false]) {
    assert.equal(normalizeActivityStreakDays(value), 0, `expected 0 for ${String(value)}`);
  }
  assert.equal(activeCount(NaN), 0);
});

test('negative values are clamped to zero', () => {
  assert.equal(normalizeActivityStreakDays(-3), 0);
  assert.equal(activeCount(-3), 0);
});

test('numeric strings are accepted and fractional days are truncated', () => {
  assert.equal(normalizeActivityStreakDays('3'), 3);
  assert.equal(normalizeActivityStreakDays('5.9'), 5);
  assert.equal(normalizeActivityStreakDays(2.7), 2);
});

test('the dot grid always renders fourteen dots', () => {
  for (const value of [0, 2, 7, 14, 99, undefined, 'bad']) {
    assert.equal(buildActivityDots(value).length, ACTIVITY_DOT_COUNT);
  }
});

test('the streak label uses singular wording for one day', () => {
  assert.equal(formatActivityStreakLabel(1), '1 day of prep logged');
});
