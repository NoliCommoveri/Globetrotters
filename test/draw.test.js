// The draw engine, on its own. This is the only real algorithm in the app and it
// silently determines four weeks of work twenty-seven times a year, so the three
// numbers in DESIGN.md §4 are asserted here rather than described in a comment.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import {
  recency, score, sampleWithoutReplacement, drawWeek1, drawDeepWeek, week4Rows,
  drawPlan, ShortPoolError,
} from '../src/lib/draw.js';

// A deterministic stand-in for Math.random: the sequence repeats, so a test can
// predict a draw instead of asserting that something plausible came back.
const sequence = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test('never drawn scores 1.0, last month 0.5, three months ago 0.75', () => {
  assert.equal(recency(null), 1);
  assert.equal(recency(1), 0.5);
  assert.equal(recency(3), 0.75);
  // Degrades toward 1 without ever reaching it: an old task rehabilitates, it
  // never becomes fresher than one that has never been drawn.
  assert.ok(recency(9) < 1);
  assert.ok(recency(9) > recency(3));
});

test('weight 0 excludes, and it is the only thing that does', () => {
  assert.equal(score(0, null), 0);
  assert.equal(score(0, 5), 0);
  // Recency alone never reaches zero for a real history, so exclusion has one
  // cause and a task drawn last month is merely unlikely.
  assert.ok(score(1, 1) > 0);
  assert.equal(score(3, null), 3);
  assert.equal(score(3, 1), 1.5);
});

test('an on-theme task drawn last month still outweighs a neutral fresh one', () => {
  // 3 * 0.5 = 1.5 against 1 * 1.0 = 1. This is what "recency is a preference,
  // not a prohibition" means arithmetically.
  assert.ok(score(3, 1) > score(1, null));
});

test('weighted selection removes what it picks and never returns a duplicate', () => {
  const candidates = [
    { id: 1, weight: 1 }, { id: 2, weight: 1 }, { id: 3, weight: 1 },
    { id: 4, weight: 1 }, { id: 5, weight: 1 },
  ];
  const picked = sampleWithoutReplacement(candidates, 5, sequence(0));
  assert.equal(picked.length, 5);
  assert.equal(new Set(picked).size, 5);
  // The input is not mutated: the same pool is drawn from four times in one
  // plan, and a draw that consumed it would return a short week 3.
  assert.equal(candidates.length, 5);
});

test('a zero-weight candidate is never picked, even when it is all that is left', () => {
  const candidates = [{ id: 1, weight: 1 }, { id: 2, weight: 0 }, { id: 3, weight: 1 }];
  const picked = sampleWithoutReplacement(candidates, 2, sequence(0.99, 0.99));
  assert.deepEqual(picked.sort(), [1, 3]);

  assert.throws(
    () => sampleWithoutReplacement(candidates, 3, sequence(0)),
    ShortPoolError,
  );
});

test('the cursor lands where the weights say it does', () => {
  const candidates = [{ id: 1, weight: 1 }, { id: 2, weight: 9 }];
  // Total 10. A cursor at 0.05 falls inside the first candidate's slice; at 0.5
  // it falls inside the second's, which occupies nine tenths of the range.
  assert.deepEqual(sampleWithoutReplacement(candidates, 1, sequence(0.05)), [1]);
  assert.deepEqual(sampleWithoutReplacement(candidates, 1, sequence(0.5)), [2]);
});

// A library shaped like the seed: four week-1 core, two competing for the fifth
// slot, eight in each Deep Dive week, five in one project type's week 4.
function library() {
  const rows = [];
  let id = 1;
  for (let i = 0; i < 4; i += 1) rows.push({ id: id++, week_theme: 1, tier: 'core' });
  for (let i = 0; i < 2; i += 1) rows.push({ id: id++, week_theme: 1, tier: 'wild' });
  for (const week of [2, 3]) {
    for (let i = 0; i < 8; i += 1) rows.push({ id: id++, week_theme: week, tier: 'focus' });
  }
  for (let i = 0; i < 5; i += 1) {
    rows.push({ id: id++, week_theme: 4, tier: 'core', project_type_id: 1, position: 5 - i });
  }
  return rows;
}

const neutral = { focusWeight: () => 1, monthsSince: () => null };

test('week 1 is the four core tasks plus one drawn into slot 5', () => {
  const rows = drawWeek1({ templates: library(), ...neutral, random: sequence(0) });
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((r) => r.position), [1, 2, 3, 4, 5]);
  // The four anchor workbook pages and are meant to repeat, so they are fixed
  // and in a stable order. Only the fifth varies, and it is the only slot on the
  // week Swap is offered on.
  assert.deepEqual(rows.slice(0, 4).map((r) => r.task_template_id), [1, 2, 3, 4]);
  assert.ok([5, 6].includes(rows[4].task_template_id));
});

test('a Deep Dive week draws five, positioned 1 to 5', () => {
  const rows = drawDeepWeek(2, { templates: library(), ...neutral, random: sequence(0.1, 0.9, 0.3) });
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((r) => r.position), [1, 2, 3, 4, 5]);
  assert.ok(rows.every((r) => r.week_no === 2));
  assert.equal(new Set(rows.map((r) => r.task_template_id)).size, 5);
});

test('week 4 is a sequence in its own order, not a draw', () => {
  const rows = week4Rows(library(), 1);
  // The templates were built with descending position on purpose: week 4 is
  // choose, gather, build, build, present, and getting it in id order would have
  // a kid rehearsing before gathering materials.
  assert.deepEqual(rows.map((r) => r.task_template_id), [27, 26, 25, 24, 23]);
  assert.deepEqual(rows.map((r) => r.position), [1, 2, 3, 4, 5]);
});

test('a project type with no week 4 refuses rather than making a five-blank month', () => {
  assert.throws(() => week4Rows(library(), 2), ShortPoolError);
});

test('a full draw is twenty tasks, five a week, no template twice', () => {
  const rows = drawPlan({ templates: library(), projectTypeId: 1, ...neutral, random: Math.random });
  assert.equal(rows.length, 20);
  for (const week of [1, 2, 3, 4]) {
    assert.equal(rows.filter((r) => r.week_no === week).length, 5);
  }
  // UNIQUE (plan_id, task_template_id) enforces this in the database. If the
  // engine can produce a duplicate, the insert is what finds out.
  assert.equal(new Set(rows.map((r) => r.task_template_id)).size, 20);
});

test('a focus reshapes the week it weights', () => {
  const templates = library().filter((t) => t.week_theme === 2);
  const favor = (ids) => (id) => (ids.includes(id) ? 3 : 1);

  // Five of eight are drawn, so no single draw proves anything: a weight is a
  // preference and the tail of it is the point. Over enough draws the three the
  // focus favors appear about 85% of the time against about 49% for the rest,
  // and the gap is what "two people, same country, different focuses, visibly
  // different weeks" is made of.
  const trials = 2000;
  const seen = new Map();
  for (let n = 0; n < trials; n += 1) {
    const rows = drawDeepWeek(2, {
      templates, focusWeight: favor([7, 8, 9]), monthsSince: () => null, random: Math.random,
    });
    for (const row of rows) seen.set(row.task_template_id, (seen.get(row.task_template_id) || 0) + 1);
  }

  for (const id of [7, 8, 9]) {
    assert.ok(seen.get(id) / trials > 0.75, `favored ${id} appeared in ${seen.get(id)} of ${trials}`);
  }
  for (const id of [10, 11, 12, 13, 14]) {
    assert.ok(seen.get(id) / trials < 0.65, `neutral ${id} appeared in ${seen.get(id)} of ${trials}`);
  }
});

test('recency pushes last month’s tasks toward the back of the queue', () => {
  const templates = library().filter((t) => t.week_theme === 2);
  const trials = 2000;
  const seen = new Map();
  for (let n = 0; n < trials; n += 1) {
    const rows = drawDeepWeek(2, {
      templates,
      focusWeight: () => 1,
      // Three of the eight were drawn last month: 0.5 against 1.0.
      monthsSince: (id) => ([7, 8, 9].includes(id) ? 1 : null),
      random: Math.random,
    });
    for (const row of rows) seen.set(row.task_template_id, (seen.get(row.task_template_id) || 0) + 1);
  }

  for (const id of [7, 8, 9]) {
    assert.ok(seen.get(id) / trials < 0.55, `stale ${id} appeared in ${seen.get(id)} of ${trials}`);
  }
  for (const id of [10, 11, 12, 13, 14]) {
    assert.ok(seen.get(id) / trials > 0.65, `fresh ${id} appeared in ${seen.get(id)} of ${trials}`);
  }
});

test('a short week says so instead of returning a short month', () => {
  const thin = library().filter((t) => t.week_theme !== 3);
  try {
    drawPlan({ templates: thin, projectTypeId: 1, ...neutral, random: Math.random });
    assert.fail('expected a ShortPoolError');
  } catch (err) {
    assert.ok(err instanceof ShortPoolError);
    assert.equal(err.week, 3);
    assert.equal(err.needed, 5);
    assert.equal(err.available, 0);
  }
});

// The draw against the real library rather than a fixture — the only version of
// "a school year does not repeat itself" that a family would recognize.
test('nine consecutive months, one person, one focus, no week repeats itself', () => {
  const db = new DatabaseSync(':memory:');
  for (const file of ['001_schema.sql', '002_seed.sql']) {
    db.exec(readFileSync(new URL(`../src/migrations/${file}`, import.meta.url), 'utf8'));
  }
  const templates = db.prepare(
    'SELECT id, week_theme, tier, project_type_id, position FROM task_templates WHERE archived = 0'
  ).all();
  const weights = db.prepare('SELECT task_template_id, focus_id, weight FROM task_focus_weights').all();
  const projectTypes = db.prepare('SELECT id FROM project_types WHERE archived = 0').all();

  // Worst case on purpose: the same focus nine months running, which is what a
  // kid who knows what they like actually does.
  for (const focus of db.prepare('SELECT id, slug FROM focuses').all()) {
    const opinions = new Map(
      weights.filter((w) => w.focus_id === focus.id).map((w) => [w.task_template_id, w.weight])
    );
    // The sparse table's rule: no row means 1. It is the caller's job, and
    // getting it wrong empties week 1, which has no weight rows at all.
    const focusWeight = (id) => (opinions.has(id) ? opinions.get(id) : 1);
    const lastDrawn = new Map();

    for (let month = 0; month < 9; month += 1) {
      const plan = drawPlan({
        templates,
        projectTypeId: projectTypes[month % projectTypes.length].id,
        focusWeight,
        monthsSince: (id) => (lastDrawn.has(id) ? month - lastDrawn.get(id) : null),
        random: Math.random,
      });

      assert.equal(plan.length, 20, `${focus.slug} month ${month + 1} is not twenty tasks`);
      for (const week of [1, 2, 3, 4]) {
        const ids = plan.filter((r) => r.week_no === week).map((r) => r.task_template_id);
        assert.equal(ids.length, 5, `${focus.slug} month ${month + 1} week ${week}`);
        assert.equal(new Set(ids).size, 5,
          `${focus.slug} month ${month + 1} week ${week} drew the same task twice`);
      }
      for (const row of plan) lastDrawn.set(row.task_template_id, month);
    }
  }
});
