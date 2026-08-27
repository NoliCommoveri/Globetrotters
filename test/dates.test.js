// Calendar arithmetic. Every one of these is a case that would otherwise be
// found in September, on a phone, by an 11-year-old.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  todayIn, mondayOf, firstMondayOf, startDateFor, monthsBetween, addMonths,
  inSchoolYear, schoolYearStart, schoolYearMonths, setupMonthFor, isMonth, monthOf,
  daysBetween, weekOf,
} from '../src/lib/dates.js';

test('mondayOf walks back to Monday, and Sunday walks back six days', () => {
  assert.equal(mondayOf('2026-09-07'), '2026-09-07');   // a Monday
  assert.equal(mondayOf('2026-09-09'), '2026-09-07');   // Wednesday
  // The case that gets it wrong when 0-is-Sunday is treated as the week's start:
  // a Sunday belongs to the week that began six days earlier, not the next one.
  assert.equal(mondayOf('2026-09-13'), '2026-09-07');
});

test('firstMondayOf finds the first Monday, including a month that starts on one', () => {
  assert.equal(firstMondayOf('2026-06'), '2026-06-01'); // June 2026 starts Monday
  assert.equal(firstMondayOf('2026-09'), '2026-09-07'); // September 2026 starts Tuesday
  // February 2026 starts on a Sunday — the month whose first Monday is furthest
  // from the 1st, and the one that breaks a (8 - day) % 7 written the other way.
  assert.equal(firstMondayOf('2026-02'), '2026-02-02');
});

test('start_date is the later of the first Monday and this week, and always a Monday', () => {
  // Set up on the 1st: the month's first Monday wins.
  assert.equal(startDateFor('2026-09', '2026-09-01'), '2026-09-07');
  // Set up on the 20th: this week wins, so the kid lands in week 1 rather than
  // being backdated into week 3 with ten tasks already on the strip.
  assert.equal(startDateFor('2026-09', '2026-09-20'), '2026-09-14');
  // Set up before the month begins: still the month's first Monday.
  assert.equal(startDateFor('2026-09', '2026-08-25'), '2026-09-07');

  for (const today of ['2026-09-01', '2026-09-13', '2026-09-20', '2026-09-30', '2026-02-01']) {
    const month = today.slice(0, 7);
    const start = startDateFor(month, today);
    assert.equal(mondayOf(start), start, `${start} is not a Monday`);
  }
});

test('monthsBetween counts calendar months across a year boundary', () => {
  assert.equal(monthsBetween('2026-09', '2026-10'), 1);
  assert.equal(monthsBetween('2026-12', '2027-03'), 3);
  assert.equal(monthsBetween('2026-09', '2026-09'), 0);
  assert.equal(monthsBetween('2027-01', '2026-09'), -4);
});

test('addMonths rolls the year', () => {
  assert.equal(addMonths('2026-09', 4), '2027-01');
  assert.equal(addMonths('2026-01', -1), '2025-12');
});

test('the school year is September through May', () => {
  assert.ok(inSchoolYear('2026-09'));
  assert.ok(inSchoolYear('2027-05'));
  assert.ok(!inSchoolYear('2027-06'));
  assert.ok(!inSchoolYear('2027-08'));

  // March belongs to the year that started the previous September.
  assert.equal(schoolYearStart('2027-03'), '2026-09');
  assert.equal(schoolYearStart('2026-09'), '2026-09');

  const months = schoolYearMonths('2027-03');
  assert.equal(months.length, 9);
  assert.equal(months[0], '2026-09');
  assert.equal(months[8], '2027-05');
});

test('over the summer setup points at the September ahead', () => {
  assert.equal(setupMonthFor('2026-07-04'), '2026-09');
  assert.equal(setupMonthFor('2026-08-31'), '2026-09');
  assert.equal(setupMonthFor('2026-10-02'), '2026-10');
});

test('todayIn reads the family timezone, not the Worker’s', () => {
  // 04:30 UTC on the 2nd is still the 1st in Chicago. A Worker answering from
  // Frankfurt and one answering from Dallas have to agree, and FAMILY_TZ is what
  // makes them.
  const at = new Date('2026-09-02T04:30:00Z');
  assert.equal(todayIn('America/Chicago', at), '2026-09-01');
  assert.equal(todayIn('UTC', at), '2026-09-02');
  // An unset or unknown secret falls back to UTC rather than throwing on the
  // first screen of the app.
  assert.equal(todayIn(undefined, at), '2026-09-02');
  assert.equal(todayIn('Not/AZone', at), '2026-09-02');
});

test('month strings are validated, not trusted', () => {
  assert.ok(isMonth('2026-09'));
  assert.ok(!isMonth('2026-13'));
  assert.ok(!isMonth('2026-9'));
  assert.ok(!isMonth('2026-09-01'));
  assert.equal(monthOf('2026-09-14'), '2026-09');
});

test('the week turns over on Monday, because start_date is always one', () => {
  const start = '2026-09-07';   // a Monday
  assert.equal(weekOf(start, '2026-09-07'), 1);
  assert.equal(weekOf(start, '2026-09-13'), 1);   // Sunday, still week 1
  assert.equal(weekOf(start, '2026-09-14'), 2);   // Monday, the ring resets
  assert.equal(weekOf(start, '2026-09-21'), 3);
  assert.equal(weekOf(start, '2026-09-28'), 4);
});

test('week 4 absorbs the remainder, and a date before the start is week 1', () => {
  const start = '2026-09-07';
  // A month is 28 to 31 days. Days 29 onward have no week 5 to run into.
  assert.equal(weekOf(start, '2026-10-05'), 4);
  assert.equal(weekOf(start, '2026-11-30'), 4);
  // Setup on a Saturday starts on the Monday ahead, and the cards have to read
  // before then.
  assert.equal(weekOf(start, '2026-09-05'), 1);
});

test('daysBetween counts whole days in either direction', () => {
  assert.equal(daysBetween('2026-09-07', '2026-09-07'), 0);
  assert.equal(daysBetween('2026-09-07', '2026-09-14'), 7);
  assert.equal(daysBetween('2026-09-14', '2026-09-07'), -7);
  // Across a month boundary, and across a leap day.
  assert.equal(daysBetween('2026-09-30', '2026-10-01'), 1);
  assert.equal(daysBetween('2028-02-28', '2028-03-01'), 2);
});
