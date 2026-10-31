const test = require('node:test');
const assert = require('node:assert');
const { addPeriod } = require('../src/utils/period');

test('1. Daily period addition', () => {
  const d = new Date('2026-05-10T12:00:00.000Z');
  const next = addPeriod(d, 'daily');
  assert.equal(next.toISOString(), '2026-05-11T12:00:00.000Z');
});

test('2. Weekly period addition', () => {
  const d = new Date('2026-05-10T12:00:00.000Z');
  const next = addPeriod(d, 'weekly');
  assert.equal(next.toISOString(), '2026-05-17T12:00:00.000Z');
});

test('3. Monthly period addition with month-end clamp', () => {
  // Jan 31 -> Feb 28 in non-leap year (2026)
  const jan31 = new Date('2026-01-31T00:00:00.000Z');
  const feb28 = addPeriod(jan31, 'monthly');
  assert.equal(feb28.toISOString(), '2026-02-28T00:00:00.000Z');

  // Jan 31 -> Feb 29 in leap year (2024)
  const jan31Leap = new Date('2024-01-31T00:00:00.000Z');
  const feb29 = addPeriod(jan31Leap, 'monthly');
  assert.equal(feb29.toISOString(), '2024-02-29T00:00:00.000Z');

  // Aug 31 -> Sep 30 (30 days month)
  const aug31 = new Date('2026-08-31T15:30:00.000Z');
  const sep30 = addPeriod(aug31, 'monthly');
  assert.equal(sep30.toISOString(), '2026-09-30T15:30:00.000Z');

  // Dec 31 -> Jan 31 next year
  const dec31 = new Date('2026-12-31T10:00:00.000Z');
  const nextJan = addPeriod(dec31, 'monthly');
  assert.equal(nextJan.toISOString(), '2027-01-31T10:00:00.000Z');
});

test('4. Yearly period addition with leap-year handling', () => {
  const normal = new Date('2026-06-15T09:00:00.000Z');
  const nextYear = addPeriod(normal, 'yearly');
  assert.equal(nextYear.toISOString(), '2027-06-15T09:00:00.000Z');

  // Leap day Feb 29 -> Feb 28 following year
  const leapDay = new Date('2024-02-29T00:00:00.000Z');
  const nextNonLeap = addPeriod(leapDay, 'yearly');
  assert.equal(nextNonLeap.toISOString(), '2025-02-28T00:00:00.000Z');
});
