// The draw engine, on its own. This is the only real algorithm in the app and it
// silently determines four weeks of work twenty-seven times a year, so the
// numbers in DESIGN.md §4 are asserted here rather than described in a comment.
//
// Two libraries are used. The synthetic one mirrors the shape LIBRARY_v3.md §3
// reports — 155 weeks 2-3 rows of which 153 are drawable, the same twenty-seven
// forms in the same proportions, fifty topic tags and seven mode tags — and it
// is what the constraint assertions run against, because they are about the
// shape of the library and not about which prompts are written yet.
//
// The real seed — 167 week 1-3 prompts, 153 drawable, finished as of slice 20 —
// is used for the numbers that do depend on the library's size: nine months back
// to back never falling through to the stalest-back cooldown fallback, and the
// on-theme coverage `../other/FOCUS-AUDIT.md` was hand-judged against. The paper
// numbers are measured in `LIBRARY_v3.md` §3 rather than asserted here, because
// they read the renderer's `packSheets`, which is `worksheet.js`'s concern.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import {
  recency, score, sampleWithoutReplacement, drawWeek1, drawDeepWeeks, week4Rows,
  drawPlan, dealWeeks, mergedPool, pinsBy, ShortPoolError,
  COOLDOWN_MONTHS, FORM_CAP, DRAWN, BALANCE_MODES, LATE_ONLY,
} from '../src/lib/draw.js';
import { swappable } from '../src/api/plans.js';

// A deterministic stand-in for Math.random: the sequence repeats, so a test can
// predict a draw instead of asserting that something plausible came back.
const sequence = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

// ------------------------------------------------------------ the scores --

test('the cooldown is a cliff, not a curve', () => {
  assert.equal(COOLDOWN_MONTHS, 5);
  assert.equal(recency(null), 1);
  assert.equal(recency(1), 0);
  assert.equal(recency(5), 0);
  // Six months on, and not before: "not drawn again before month m+6" is the
  // sentence, and m+6 is the first month it comes back.
  assert.equal(recency(6), 1);
});

test('weight 0 excludes, and recency is the only thing that makes one', () => {
  assert.equal(score(0, null), 0);
  assert.equal(score(9, 1), 0);
  // The tag join floors at 1, so a template the focus does not reach is still
  // drawn — the no-zeros rule, arithmetically.
  assert.equal(score(1, null), 1);
  assert.equal(score(9, 6), 9);
});

test('weighted selection removes what it picks and never returns a duplicate', () => {
  const candidates = [
    { id: 1, weight: 1 }, { id: 2, weight: 1 }, { id: 3, weight: 1 },
    { id: 4, weight: 1 }, { id: 5, weight: 1 },
  ];
  const picked = sampleWithoutReplacement(candidates, 5, sequence(0));
  assert.equal(picked.length, 5);
  assert.equal(new Set(picked).size, 5);
  // The input is not mutated: the same pool is drawn from more than once in one
  // plan, and a draw that consumed it would return a short week.
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

// ------------------------------------------------------- the 153 fixture --

// The form table from LIBRARY_v3.md §3: form, thirds, how many want it in each
// natural half. `checklist` is week 4's and carries none of these.
const FORMS = [
  ['box-beside', 1, 2, 9], ['fields', 1, 6, 6], ['table-3', 2, 9, 2],
  ['bullets', 1, 5, 5], ['box-note', 2, 7, 2], ['differences', 1, 5, 4],
  ['lines-4', 1, 3, 4], ['figure-anchor', 1, 1, 3], ['flow-steps', 1, 6, 1],
  ['timeline', 1, 6, 1], ['specimen-boxes', 2, 3, 4], ['split-two', 1, 2, 3],
  ['then-now', 2, 6, 1], ['bar-graph', 2, 5, 1], ['pictograph', 1, 4, 2],
  ['list-n', 1, 1, 3], ['map-marks', 2, 4, 0], ['label-small', 2, 1, 4],
  ['lines-8', 2, 2, 2], ['clock-pair', 1, 1, 2], ['scale-strip', 1, 4, 0],
  ['venn', 2, 0, 3], ['storyboard', 2, 0, 3], ['hundred-people', 2, 2, 1],
  ['week-strip', 1, 0, 2], ['recipe-card', 3, 0, 1], ['label-it', 3, 1, 0],
];

// Seven mode tags and how many prompts carry each, same source. They are dealt
// round-robin across the pool so that no mode ends up concentrated in one half,
// which is the property the month-scoped rule is measured against.
const MODES = [
  ['us-contrast', 41], ['demographics-stat', 17], ['measurement', 14],
  ['hands-on', 10], ['map-work', 8], ['personal-voice', 8], ['scripture-read', 7],
];

const TOPICS = Array.from({ length: 50 }, (_, i) => `topic-${String(i + 1).padStart(2, '0')}`);

// Two to four topic tags each, spread by three coprime strides so no two
// prompts get the same set and every tag has members.
const topicsFor = (n) => [...new Set([
  TOPICS[n % 50], TOPICS[(n * 7 + 3) % 50], TOPICS[(n * 13 + 11) % 50],
])];

function library() {
  const rows = [];
  let id = 1;

  for (let i = 0; i < 4; i += 1) rows.push({ id: id++, slug: `core-${i}`, week_theme: 1, tier: 'core' });
  for (let i = 0; i < 8; i += 1) rows.push({ id: id++, slug: `wild-${i}`, week_theme: 1, tier: 'wild' });

  // 86 natural week 2 and 69 natural week 3, each half's forms in the reported
  // proportions. Interleaved rather than blocked by form, so a fixture where
  // every `table-3` sits next to every other cannot flatter the form cap.
  const deep = [];
  for (const [form, thirds, wk2, wk3] of FORMS) {
    for (let i = 0; i < wk2; i += 1) deep.push({ week_theme: 2, form, thirds });
    for (let i = 0; i < wk3; i += 1) deep.push({ week_theme: 3, form, thirds });
  }
  deep.sort((a, b) => a.week_theme - b.week_theme);

  const modes = deep.map(() => []);
  let cursor = 0;
  for (const [tag, members] of MODES) {
    for (let i = 0; i < members; i += 1) {
      modes[cursor % deep.length].push(tag);
      cursor += 7;                              // coprime with 155: no row is skipped
    }
  }

  deep.forEach((row, n) => {
    rows.push({
      id: id++,
      slug: `deep-${n}`,
      week_theme: row.week_theme,
      tier: 'focus',
      form: row.form,
      thirds: row.thirds,
      modes: modes[n],
      topics: topicsFor(n),
    });
  });

  // The two pins, taken out of the pool they were counted in: `wow-fact` is a
  // week 2 `lines-4` and `cook-it` is week 3's one `recipe-card`.
  const pin = (week, form, slug) => {
    const row = rows.find((t) => t.week_theme === week && t.form === form && t.tier === 'focus');
    row.tier = 'fixed';
    row.slug = slug;
    return row;
  };
  pin(2, 'lines-4', 'wow-fact');
  pin(3, 'recipe-card', 'cook-it').modes = ['hands-on'];

  for (let i = 0; i < 5; i += 1) {
    rows.push({ id: id++, slug: `wk4-${i}`, week_theme: 4, tier: 'core', project_type_id: 1, position: 5 - i });
  }
  return rows;
}

const TEMPLATES = library();

// A focus shaped like a real one: three tags at 3, two at 2, one at 1.
const FOCUS = { 'topic-01': 3, 'topic-02': 3, 'topic-03': 3, 'topic-04': 2, 'topic-05': 2, 'topic-06': 1 };

function weigher(templates, weights = FOCUS) {
  const topics = new Map(templates.map((t) => [t.id, t.topics ?? []]));
  return (id) => 1 + 2 * (topics.get(id) ?? []).reduce((n, tag) => n + (weights[tag] || 0), 0);
}

const fw = weigher(TEMPLATES);
const never = () => null;
const inputs = (over = {}) => ({
  templates: TEMPLATES, focusWeight: fw, monthsSince: never, random: Math.random, ...over,
});

const byId = new Map(TEMPLATES.map((t) => [t.id, t]));
const rowsOf = (plan, week) => plan.filter((r) => r.week_no === week).map((r) => byId.get(r.task_template_id));

test('the fixture is the shape LIBRARY_v3 reports', () => {
  assert.equal(mergedPool(TEMPLATES).length, 153);
  const pins = pinsBy(TEMPLATES);
  assert.equal(pins[2].slug, 'wow-fact');
  assert.equal(pins[3].slug, 'cook-it');
});

// --------------------------------------------------------- the four weeks --

test('week 1 is the four core tasks plus one drawn into slot 5', () => {
  const rows = drawWeek1(inputs({ random: sequence(0) }));
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((r) => r.position), [1, 2, 3, 4, 5]);
  // The four anchor workbook pages and are meant to repeat, so they are fixed
  // and in a stable order. Only the fifth varies, and it is the only slot on the
  // week Swap is offered on.
  assert.deepEqual(rows.slice(0, 4).map((r) => r.task_template_id), [1, 2, 3, 4]);
  assert.ok(rows[4].task_template_id >= 5 && rows[4].task_template_id <= 12);
});

test('week 4 is a sequence in its own order, not a draw', () => {
  const rows = week4Rows(TEMPLATES, 1);
  // The templates were built with descending position on purpose: week 4 is
  // choose, gather, build, build, present, and getting it in id order would have
  // a kid rehearsing before gathering materials.
  assert.deepEqual(rows.map((r) => r.position), [1, 2, 3, 4, 5]);
  assert.deepEqual(rows.map((r) => byId.get(r.task_template_id).slug),
    ['wk4-4', 'wk4-3', 'wk4-2', 'wk4-1', 'wk4-0']);
});

test('a project type with no week 4 refuses rather than making a five-blank month', () => {
  assert.throws(() => week4Rows(TEMPLATES, 2), ShortPoolError);
});

test('a drawn month is twenty tasks, five a week, no template twice', () => {
  const plan = drawPlan({ ...inputs(), projectTypeId: 1 });
  assert.equal(plan.length, 20);
  for (const week of [1, 2, 3, 4]) {
    assert.equal(plan.filter((r) => r.week_no === week).length, 5);
    assert.deepEqual(plan.filter((r) => r.week_no === week).map((r) => r.position), [1, 2, 3, 4, 5]);
  }
  // UNIQUE (plan_id, task_template_id) enforces this in the database. If the
  // engine can produce a duplicate, the insert is what finds out.
  assert.equal(new Set(plan.map((r) => r.task_template_id)).size, 20);
});

test('week 2 holds wow-fact, week 3 holds cook-it, and neither is swappable', () => {
  const plan = drawDeepWeeks(inputs());
  assert.equal(rowsOf(plan, 2)[0].slug, 'wow-fact');
  assert.equal(rowsOf(plan, 3)[0].slug, 'cook-it');

  for (const week of [2, 3]) {
    assert.equal(swappable({ status: 'open', week_no: week, tier: 'fixed' }), false);
    assert.equal(swappable({ status: 'open', week_no: week, tier: 'focus' }), true);
  }
});

// ------------------------------------------------------- the constraints --

// A thousand consecutive months, one learner, one focus. Every constraint the
// draw makes is asserted on every one of them: these are cheap to check and the
// failures they catch are the ones a single sampled month never shows.
test('a thousand months keep every rule the draw makes', () => {
  let handsOn = 0;
  let personal = 0;

  for (let month = 0; month < 1000; month += 1) {
    const plan = drawDeepWeeks(inputs());
    const weeks = { 2: rowsOf(plan, 2), 3: rowsOf(plan, 3) };
    const ten = [...weeks[2], ...weeks[3]];

    assert.equal(ten.length, 10, `month ${month} is not ten tasks`);
    assert.equal(new Set(ten.map((t) => t.id)).size, 10, `month ${month} drew one twice`);

    // No worksheet form twice inside one week, and none over two of the ten.
    for (const week of [2, 3]) {
      const forms = weeks[week].map((t) => t.form).filter(Boolean);
      assert.equal(new Set(forms).size, forms.length,
        `month ${month} week ${week} prints two of the same form`);
    }
    const seats = new Map();
    for (const t of ten) if (t.form) seats.set(t.form, (seats.get(t.form) || 0) + 1);
    for (const [form, n] of seats) {
      assert.ok(n <= FORM_CAP, `month ${month} gives ${form} ${n} of the ten seats`);
    }

    // No mode tag twice in the month. Scoped to the month rather than the week
    // because the deal, not the draw, decides which week a prompt lands in.
    const modes = ten.flatMap((t) => t.modes ?? []);
    assert.equal(new Set(modes).size, modes.length, `month ${month} repeats a mode tag`);

    if (modes.includes('hands-on')) handsOn += 1;
    if (modes.includes('personal-voice')) personal += 1;

    // The two prompts that say "this month" in their wording never land early.
    for (const t of weeks[2]) {
      assert.ok(!LATE_ONLY.has(t.slug), `month ${month} dealt ${t.slug} into week 2`);
    }
  }

  // The month-level balance rule, and it is the only mechanism guaranteeing a
  // month in which somebody from the country speaks. `hands-on` arrives free —
  // `cook-it` carries it — and `personal-voice` is what the repair budget buys.
  assert.equal(handsOn, 1000);
  assert.equal(personal, 1000);
  assert.deepEqual(BALANCE_MODES, ['hands-on', 'personal-voice']);
});

test('a template rests five months for one child and stays free for a sibling', () => {
  const drawnIn = new Map();

  for (let month = 0; month < 6; month += 1) {
    const plan = drawDeepWeeks(inputs({
      monthsSince: (id) => (drawnIn.has(id) ? month - drawnIn.get(id) : null),
    }));
    for (const row of plan) {
      const t = byId.get(row.task_template_id);
      if (t.tier === 'fixed') continue;
      const last = drawnIn.get(t.id);
      assert.ok(last === undefined || month - last > COOLDOWN_MONTHS,
        `${t.slug} came back after ${month - last} months`);
      drawnIn.set(t.id, month);
    }
  }

  // The sibling. Same library, same month, a history of their own — which is
  // empty, so nothing is resting.
  const sibling = drawDeepWeeks(inputs());
  const shared = sibling.filter((r) => drawnIn.has(r.task_template_id));
  assert.ok(shared.length > 0, 'a sibling drew nothing the first learner has had');
});

test('a focus reshapes the whole month, not one week of it', () => {
  // Ten of 153 is a thin sample, so this is the tail rather than one draw: over
  // enough months the prompts carrying the focus's heaviest tags arrive several
  // times as often as the ones it does not reach at all.
  const trials = 400;
  const seen = new Map();
  for (let n = 0; n < trials; n += 1) {
    for (const row of drawDeepWeeks(inputs())) {
      seen.set(row.task_template_id, (seen.get(row.task_template_id) || 0) + 1);
    }
  }

  const rate = (t) => (seen.get(t.id) || 0) / trials;
  const pool = mergedPool(TEMPLATES);
  const lifted = pool.filter((t) => fw(t.id) >= 7);
  const flat = pool.filter((t) => fw(t.id) === 1);

  const mean = (list) => list.reduce((n, t) => n + rate(t), 0) / list.length;
  assert.ok(lifted.length > 5 && flat.length > 20, 'the fixture has no contrast to measure');
  assert.ok(mean(lifted) > 2.5 * mean(flat),
    `heavy prompts ran at ${mean(lifted).toFixed(3)} against ${mean(flat).toFixed(3)}`);

  // And it reaches both halves. The failure the merge exists to fix is a whole
  // week of five sheets that ignores the focus the learner chose, so the test
  // that matters is per week and not per month.
  let weeksWithNone = 0;
  for (let n = 0; n < trials; n += 1) {
    const plan = drawDeepWeeks(inputs());
    for (const week of [2, 3]) {
      if (!rowsOf(plan, week).some((t) => fw(t.id) > 1)) weeksWithNone += 1;
    }
  }
  assert.ok(weeksWithNone / (trials * 2) < 0.1,
    `${weeksWithNone} of ${trials * 2} weeks held nothing the focus reaches`);
});

// -------------------------------------------------------------- the deal --

const dealRow = (n, over = {}) => ({
  id: n, slug: `p${n}`, week_theme: 2, tier: 'focus', form: `form-${n}`, thirds: 1, modes: [], ...over,
});

test('the deal splits four and four and puts each pin on its own week', () => {
  const drawn = Array.from({ length: DRAWN }, (_, i) => dealRow(i + 1));
  const pins = { 2: dealRow(90, { slug: 'wow-fact', tier: 'fixed' }),
                 3: dealRow(91, { slug: 'cook-it', tier: 'fixed', week_theme: 3, thirds: 3 }) };

  const dealt = dealWeeks(drawn, pins, () => 1);
  assert.equal(dealt[2].length, 5);
  assert.equal(dealt[3].length, 5);
  assert.equal(dealt[2][0].slug, 'wow-fact');
  assert.equal(dealt[3][0].slug, 'cook-it');
  assert.deepEqual([...dealt[2], ...dealt[3]].map((t) => t.id).sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7, 8, 90, 91]);
});

test('the deal balances the summed weight, not the count of prompts above baseline', () => {
  // Four prompts the focus barely reaches against one it reaches hard. A deal
  // scored on a count would call two-and-two even; the summed weight says the
  // x9 is worth more than three x3s and puts it opposite them.
  const weights = { 1: 9, 2: 3, 3: 3, 4: 3, 5: 1, 6: 1, 7: 1, 8: 1 };
  const drawn = Array.from({ length: DRAWN }, (_, i) => dealRow(i + 1));
  const pins = { 2: dealRow(90, { slug: 'wow-fact', tier: 'fixed' }),
                 3: dealRow(91, { slug: 'cook-it', tier: 'fixed', week_theme: 3 }) };

  const dealt = dealWeeks(drawn, pins, (id) => weights[id] ?? 1);
  const sum = (week) => dealt[week].filter((t) => t.id <= 8)
    .reduce((n, t) => n + weights[t.id], 0);
  // 12 against 10 is the closest four-four split of 9,3,3,3,1,1,1,1, and the
  // deal finds it.
  assert.equal(Math.abs(sum(2) - sum(3)), 2);
  // The heavy one and the three mid ones are on opposite sides, which is the
  // arrangement a count of "above baseline" would never find.
  const heavy = dealt[2].some((t) => t.id === 1) ? 2 : 3;
  const mids = [2, 3, 4].filter((id) => dealt[heavy].some((t) => t.id === id));
  assert.equal(mids.length, 0);
});

test('the deal keeps a form off the week its pin already prints', () => {
  // Every drawn prompt is the pin's form, so a collision is unavoidable — but
  // only two of them can sit with it, and the key says which week that is.
  const drawn = Array.from({ length: DRAWN }, (_, i) => dealRow(i + 1, { form: 'lines-4' }));
  const pins = { 2: dealRow(90, { slug: 'wow-fact', tier: 'fixed', form: 'lines-4' }), 3: null };
  const dealt = dealWeeks(drawn, pins, () => 1);
  assert.equal(dealt[2].length, 5);
  assert.equal(dealt[3].length, 4);
});

test('the deal leans natural week 2 to week 2 when nothing else is at stake', () => {
  const drawn = Array.from({ length: DRAWN }, (_, i) => dealRow(i + 1, {
    week_theme: i < 4 ? 2 : 3,
  }));
  const dealt = dealWeeks(drawn, { 2: null, 3: null }, () => 1);
  assert.deepEqual(dealt[2].map((t) => t.id), [1, 2, 3, 4]);
  assert.deepEqual(dealt[3].map((t) => t.id), [5, 6, 7, 8]);
});

test('the deal never puts a "this month" prompt in week 2', () => {
  const drawn = Array.from({ length: DRAWN }, (_, i) => dealRow(i + 1));
  drawn[0].slug = 'hear-from-a-kid';
  drawn[1].slug = 'nations-before-the-throne';
  const dealt = dealWeeks(drawn, { 2: null, 3: null }, () => 1);
  for (const t of dealt[2]) assert.ok(!LATE_ONLY.has(t.slug));
  assert.equal(dealt[3].filter((t) => LATE_ONLY.has(t.slug)).length, 2);
});

test('the deal takes no randomness: the same eight always land the same way', () => {
  const drawn = Array.from({ length: DRAWN }, (_, i) => dealRow(i + 1, { week_theme: 2 + (i % 2) }));
  const pins = { 2: dealRow(90, { tier: 'fixed' }), 3: dealRow(91, { tier: 'fixed' }) };
  const once = dealWeeks(drawn, pins, fw);
  const twice = dealWeeks(drawn, pins, fw);
  assert.deepEqual(once[2].map((t) => t.id), twice[2].map((t) => t.id));
  assert.deepEqual(once[3].map((t) => t.id), twice[3].map((t) => t.id));
});

// ------------------------------------------------------ what a short pool --

test('a pool too small to draw eight says so instead of returning a short month', () => {
  const thin = TEMPLATES.filter((t) => t.tier !== 'focus' || t.week_theme === 1);
  try {
    drawDeepWeeks({ ...inputs(), templates: thin });
    assert.fail('expected a ShortPoolError');
  } catch (err) {
    assert.ok(err instanceof ShortPoolError);
    assert.equal(err.week, null);
    assert.equal(err.needed, DRAWN);
    assert.equal(err.available, 0);
  }
});

test('a missing pin is refused rather than quietly shortening the month', () => {
  const noCook = TEMPLATES.filter((t) => t.slug !== 'cook-it');
  try {
    drawDeepWeeks({ ...inputs(), templates: noCook });
    assert.fail('expected a ShortPoolError');
  } catch (err) {
    assert.ok(err instanceof ShortPoolError);
    assert.equal(err.week, 3);
    assert.equal(err.needed, 5);
    assert.equal(err.available, 4);
  }
});

test('the stalest goes back rather than erroring when a cooldown empties the pool', () => {
  // Nine drawable prompts and eight of them resting. The single fresh one is
  // not enough for a draw of eight, so seven of the stale come back — oldest
  // first — and the month still holds twenty.
  const small = TEMPLATES.filter((t) => t.week_theme !== 2 && t.week_theme !== 3)
    .concat(mergedPool(TEMPLATES).slice(0, 9), Object.values(pinsBy(TEMPLATES)));
  const resting = new Map(mergedPool(TEMPLATES).slice(0, 8).map((t, i) => [t.id, i + 1]));

  const plan = drawDeepWeeks({
    ...inputs(),
    templates: small,
    monthsSince: (id) => resting.get(id) ?? null,
  });
  assert.equal(plan.length, 10);
  // The freshest of the resting ones — one month ago — is the last to come
  // back, so it is the one left out.
  const drawnIds = new Set(plan.map((r) => r.task_template_id));
  const stalest = mergedPool(TEMPLATES).slice(0, 8).filter((t) => resting.get(t.id) >= 3);
  for (const t of stalest) assert.ok(drawnIds.has(t.id), `${t.slug} was left resting`);
});

// ------------------------------------------------------- the real library --

// Loads the actual seed rather than a fixture: 167 week 1-3 prompts, 153
// drawable, finished as of slice 20. `onThemeFor` reads `../other/FOCUS-AUDIT.md`
// so the on-theme assertions below are graded against the same hand judgement
// `LIBRARY_v3.md` §3's tables are.
function realLibrary() {
  const db = new DatabaseSync(':memory:');
  for (const file of ['001_schema.sql', '002_seed.sql', '004_worksheets.sql',
                      '005_worksheet_layouts.sql']) {
    db.exec(readFileSync(new URL(`../src/migrations/${file}`, import.meta.url), 'utf8'));
  }

  const templates = db.prepare(`
    SELECT t.id, t.slug, t.week_theme, t.tier, t.project_type_id, t.position,
           t.worksheet_layout_id AS form, COALESCE(w.height_thirds, 1) AS thirds
    FROM task_templates t
    LEFT JOIN worksheet_layouts w ON w.id = t.worksheet_layout_id
    WHERE t.archived = 0
  `).all();
  const modeRows = db.prepare(
    "SELECT task_template_id, tag FROM prompt_tags WHERE namespace = 'mode'"
  ).all();
  const modes = new Map();
  for (const row of modeRows) {
    if (!modes.has(row.task_template_id)) modes.set(row.task_template_id, []);
    modes.get(row.task_template_id).push(row.tag);
  }
  const rows = templates.map((t) => ({ ...t, modes: modes.get(t.id) ?? [] }));
  const byId = new Map(rows.map((t) => [t.id, t]));
  const projectTypes = db.prepare('SELECT id FROM project_types WHERE archived = 0').all();
  const focuses = db.prepare('SELECT id, slug, name FROM focuses').all();

  const weigherFor = (focusId) => {
    const shared = new Map(db.prepare(`
      SELECT pt.task_template_id AS id, SUM(ft.weight) AS shared
      FROM prompt_tags pt
      JOIN focus_tags ft ON ft.tag = pt.tag AND ft.focus_id = ?
      WHERE pt.namespace = 'topic'
      GROUP BY pt.task_template_id
    `).all(focusId).map((r) => [r.id, Number(r.shared)]));
    return (id) => 1 + 2 * (shared.get(id) ?? 0);
  };

  const audit = readFileSync(new URL('../docs/other/FOCUS-AUDIT.md', import.meta.url), 'utf8');
  const auditTable = audit.slice(audit.indexOf('## The table'));
  const onThemeBySlug = new Map();
  for (const line of auditTable.split('\n')) {
    const m = line.match(/^\|\s*`([a-z0-9-]+)`\s*\|\s*\d\s*\|\s*(.+?)\s*\|$/);
    if (!m) continue;
    onThemeBySlug.set(m[1], m[2] === '— none' ? [] : m[2].split(',').map((s) => s.trim()));
  }
  const onThemeFor = (focusName) => {
    const set = new Set();
    for (const [slug, names] of onThemeBySlug) if (names.includes(focusName)) set.add(slug);
    return set;
  };

  return { rows, byId, projectTypes, focuses, weigherFor, onThemeFor };
}

// A month is twenty, no prompt is drawn twice, and the pins are where they
// belong — for every focus, against the real seed rather than a fixture.
test('every focus draws a whole month from the real seeded library', () => {
  const { rows, projectTypes, focuses, weigherFor } = realLibrary();
  const slug = new Map(rows.map((t) => [t.id, t.slug]));

  for (const focus of focuses) {
    const plan = drawPlan({
      templates: rows,
      projectTypeId: projectTypes[0].id,
      focusWeight: weigherFor(focus.id),
      monthsSince: () => null,
      random: Math.random,
    });

    assert.equal(plan.length, 20, `${focus.slug} did not draw twenty`);
    assert.equal(new Set(plan.map((r) => r.task_template_id)).size, 20,
      `${focus.slug} drew the same task twice`);
    for (const week of [1, 2, 3, 4]) {
      assert.equal(plan.filter((r) => r.week_no === week).length, 5, `${focus.slug} week ${week}`);
    }

    assert.ok(plan.some((r) => r.week_no === 2 && slug.get(r.task_template_id) === 'wow-fact'));
    assert.ok(plan.some((r) => r.week_no === 3 && slug.get(r.task_template_id) === 'cook-it'));
  }
});

// LIBRARY_v3.md §3: against 153 the cooldown never gives way. Fifty nine-month
// runs per focus — 450 learners, 4,050 months — and the fresh pool (never
// drawn in the last five months) never once drops below the eight a draw
// needs, so `eligiblePool` never reaches for a stale prompt. It never comes
// close: the measured floor is 113 fresh against the eight needed.
test('nine months back to back never fall through to the stalest-back cooldown fallback', () => {
  const { rows, byId, focuses, weigherFor } = realLibrary();
  const pool = mergedPool(rows);

  for (const focus of focuses) {
    const fw = weigherFor(focus.id);
    for (let learner = 0; learner < 50; learner += 1) {
      const drawnIn = new Map();
      for (let month = 0; month < 9; month += 1) {
        const monthsSince = (id) => (drawnIn.has(id) ? month - drawnIn.get(id) : null);
        const fresh = pool.filter((t) => recency(monthsSince(t.id)) === 1);
        assert.ok(fresh.length >= DRAWN,
          `${focus.slug} learner ${learner} month ${month}: only ${fresh.length} fresh`);

        const plan = drawDeepWeeks({ templates: rows, focusWeight: fw, monthsSince, random: Math.random });
        for (const row of plan) {
          const t = byId.get(row.task_template_id);
          if (t.tier !== 'fixed') drawnIn.set(t.id, month);
        }
      }
    }
  }
});

// LIBRARY_v3.md §3, "What the shape delivers": the two weakest focuses,
// Ancient World and Conflict and Change, still clear the ceiling this version
// set for them — a week with none of their on-theme content at or under 42%
// and 57% — even though they hold only twelve and ten on-theme prompts apiece
// in the 153 pool.
test('Ancient World and Conflict and Change clear their week-with-none ceiling', () => {
  const { rows, byId, focuses, weigherFor, onThemeFor } = realLibrary();
  const ceilings = { 'Ancient World': 42, 'Conflict and Change': 57 };
  const TRIALS = 600;

  for (const focus of focuses) {
    const ceiling = ceilings[focus.name];
    if (!ceiling) continue;

    const fw = weigherFor(focus.id);
    const onTheme = onThemeFor(focus.name);
    let weeksWithNone = 0;
    for (let n = 0; n < TRIALS; n += 1) {
      const plan = drawDeepWeeks({ templates: rows, focusWeight: fw, monthsSince: () => null, random: Math.random });
      for (const week of [2, 3]) {
        const weekTasks = plan.filter((r) => r.week_no === week).map((r) => byId.get(r.task_template_id));
        if (!weekTasks.some((t) => onTheme.has(t.slug))) weeksWithNone += 1;
      }
    }
    const rate = (weeksWithNone / (TRIALS * 2)) * 100;
    assert.ok(rate <= ceiling, `${focus.name} ran a week with none of it at ${rate.toFixed(1)}%, over the ${ceiling}% ceiling`);
  }
});
