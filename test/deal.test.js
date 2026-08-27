// The shuffle rule. It lives in its own module so that "never deals a blank" is
// an assertion rather than a hope, and so the seed can be checked against it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { dealCandidates, dealThree, hooksByCountry, stampedInk, MIN_HOOKS } from '../public/js/deal.js';

const countries = [
  { id: 1, name: 'Peru' }, { id: 2, name: 'Iceland' },
  { id: 3, name: 'Japan' }, { id: 4, name: 'Chad' },
];

const hooks = [
  { country_id: 1, text: 'a' }, { country_id: 1, text: 'b' },
  { country_id: 2, text: 'a' }, { country_id: 2, text: 'b' }, { country_id: 2, text: 'c' },
  { country_id: 3, text: 'a' }, { country_id: 3, text: 'b' },
  { country_id: 4, text: 'a' },     // one hook: a card with nothing on it
];

test('the shuffle draws only from countries with at least two hooks', () => {
  const candidates = dealCandidates(countries, hooksByCountry(hooks));
  assert.deepEqual(candidates.map((c) => c.id), [1, 2, 3]);
  assert.equal(MIN_HOOKS, 2);
});

test('the shuffle skips a country the family has already stamped', () => {
  const candidates = dealCandidates(countries, hooksByCountry(hooks), new Set([2]));
  assert.deepEqual(candidates.map((c) => c.id), [1, 3]);
});

test('three dealt countries are three different countries', () => {
  const candidates = dealCandidates(countries, hooksByCountry(hooks));
  for (let n = 0; n < 200; n += 1) {
    const dealt = dealThree(candidates);
    assert.equal(dealt.length, 3);
    assert.equal(new Set(dealt.map((c) => c.id)).size, 3);
  }
});

test('a short pool deals what it has rather than padding with blanks', () => {
  const dealt = dealThree(dealCandidates(countries, hooksByCountry(hooks), new Set([1, 2])));
  assert.equal(dealt.length, 1);
  assert.deepEqual(dealt.map((c) => c.id), [3]);
});

test('an ink dot names whoever stamped the country', () => {
  const ink = stampedInk(
    [{ country_id: 1, person_id: 2 }, { country_id: 3, person_id: 1 }, { country_id: 1, person_id: 1 }],
    [{ id: 1, color: '#5B2A86' }, { id: 2, color: '#D07AC0' }],
  );
  assert.deepEqual(ink.get(1), ['#D07AC0', '#5B2A86']);
  assert.deepEqual(ink.get(3), ['#5B2A86']);
  assert.equal(ink.get(2), undefined);
});

// Against the actual seed, which is the only version of this claim that matters.
test('the seeded hooks deal three real cards, ten shuffles running', () => {
  const db = new DatabaseSync(':memory:');
  for (const file of ['001_schema.sql', '002_seed.sql', '003_country_data.sql']) {
    db.exec(readFileSync(new URL(`../src/migrations/${file}`, import.meta.url), 'utf8'));
  }
  const rows = db.prepare('SELECT id, name FROM countries').all();
  const hooks = db.prepare('SELECT country_id, text FROM country_hooks').all();
  const hooked = hooksByCountry(hooks);
  const candidates = dealCandidates(rows, hooked);

  assert.equal(rows.length, 195);
  // 100 countries carry hooks; the other 95 stay selectable and unadorned (§9).
  assert.equal(candidates.length, 100);

  // The exit criterion, run as written: ten consecutive shuffles, and not one
  // card without a hook on it. A blank card is the failure mode this whole
  // MIN_HOOKS rule exists to prevent — the shuffle is the front door for a kid
  // who does not know what they want, and it has to earn that.
  for (let n = 0; n < 10; n += 1) {
    const dealt = dealThree(candidates);
    assert.equal(dealt.length, 3);
    for (const country of dealt) {
      assert.ok((hooked.get(country.id) || []).length >= MIN_HOOKS,
        `${country.name} was dealt with fewer than ${MIN_HOOKS} hooks`);
    }
  }
});

test('every seeded hook is a lead, not a fact stated at a kid', () => {
  // §9's rule, and the one thing about this file that is not a matter of taste:
  // a hook that is wrong should send a kid on a dead-end search, never write a
  // false sentence into a workbook. A lead opens with the instruction to go and
  // look. Spot-checking twenty by hand is the human half of this; the machine
  // half is that not one of them opens as an assertion.
  const db = new DatabaseSync(':memory:');
  for (const file of ['001_schema.sql', '002_seed.sql', '003_country_data.sql']) {
    db.exec(readFileSync(new URL(`../src/migrations/${file}`, import.meta.url), 'utf8'));
  }
  const hooks = db.prepare('SELECT text FROM country_hooks').all();
  assert.ok(hooks.length >= 200, `only ${hooks.length} hooks`);

  for (const { text } of hooks) {
    assert.match(text, /^(Find out |Look up |Find )/,
      `not phrased as a lead: ${text}`);
    assert.ok(!text.endsWith('.'), `a hook is an instruction, not a sentence to copy: ${text}`);
    assert.ok(text.length >= 30 && text.length <= 140, `hook is the wrong length: ${text}`);
  }
});
