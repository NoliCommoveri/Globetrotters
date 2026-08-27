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
test('seed v0 has no country with two hooks, so the shuffle is not offered yet', () => {
  const db = new DatabaseSync(':memory:');
  for (const file of ['001_schema.sql', '002_seed.sql']) {
    db.exec(readFileSync(new URL(`../src/migrations/${file}`, import.meta.url), 'utf8'));
  }
  const rows = db.prepare('SELECT id, name FROM countries').all();
  const hooked = hooksByCountry(db.prepare('SELECT country_id, text FROM country_hooks').all());

  // Hooks are `003_country_data.sql`, slice 09. Until they land the eligible
  // pool is empty and setup hides the control rather than dealing three cards
  // with nothing written on them. When slice 09 lands this assertion inverts,
  // and it is the thing that should make someone come back and change it.
  assert.equal(dealCandidates(rows, hooked).length, 0);
  assert.equal(rows.length, 195);
});
