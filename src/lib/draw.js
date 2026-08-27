// The draw. The only real algorithm in the app (DESIGN.md §4).
//
// In JS, not SQL, and pure: it takes rows and two lookup functions and returns
// twenty positions. Nothing here touches D1, which is what makes "weight 0
// excludes" and "drawn last month scores 0.5" assertions in a test file rather
// than claims in a comment.
//
// Randomness is injected. A caller passes Math.random; a test passes a sequence
// and gets a draw it can predict.

export class ShortPoolError extends Error {
  constructor(week, needed, available) {
    super(`Week ${week} needs ${needed} tasks and the library offers ${available}`);
    this.name = 'ShortPoolError';
    this.week = week;
    this.needed = needed;
    this.available = available;
  }
}

// Never drawn scores 1.0, last month 0.5, three months ago 0.75. No cliff and no
// fallback branch: a hard never-repeat rule exhausts in month five against a
// 25-template week and then clusters repeats badly. Repetition is fine here —
// no task is country-specific, so "what is on their money" is a different task
// in Peru than in Japan.
export function recency(monthsSince) {
  if (monthsSince == null) return 1;
  if (monthsSince <= 0) return 0;
  return monthsSince / (monthsSince + 1);
}

// fw * recency, with fw = 0 excluding outright. A focus weight of 0 is the
// library saying this task is not part of this month; recency never reaches 0
// for a real history, so exclusion has exactly one cause.
export function score(fw, monthsSince) {
  if (!(fw > 0)) return 0;
  return fw * recency(monthsSince);
}

// Weighted selection without replacement. Picks by cumulative weight, removes,
// repeats. Candidates at weight 0 are never eligible, so a pool that runs out of
// positive weight before `count` is a library problem and says so rather than
// quietly returning a short week.
export function sampleWithoutReplacement(candidates, count, random = Math.random, week = null) {
  const pool = candidates.filter((c) => c.weight > 0).map((c) => ({ ...c }));
  if (pool.length < count) throw new ShortPoolError(week, count, pool.length);

  const picked = [];
  for (let n = 0; n < count; n += 1) {
    let total = 0;
    for (const c of pool) total += c.weight;
    // A cursor into the summed weights. Floating point can leave the walk one
    // ulp short of the last candidate, so the final one is the fallback.
    let cursor = random() * total;
    let index = pool.length - 1;
    for (let i = 0; i < pool.length; i += 1) {
      cursor -= pool[i].weight;
      if (cursor < 0) { index = i; break; }
    }
    picked.push(pool[index].id);
    pool.splice(index, 1);
  }
  return picked;
}

function candidatesFor(templates, focusWeight, monthsSince) {
  return templates.map((t) => ({ id: t.id, weight: score(focusWeight(t.id), monthsSince(t.id)) }));
}

function draw(week, templates, count, focusWeight, monthsSince, random) {
  return sampleWithoutReplacement(candidatesFor(templates, focusWeight, monthsSince), count, random, week);
}

const byId = (a, b) => a.id - b.id;
const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id;

const rows = (ids, week, from = 1) =>
  ids.map((id, i) => ({ task_template_id: id, week_no: week, position: from + i }));

// Week 1 is four fixed core tasks and one drawn. The four anchor workbook pages
// and are meant to repeat; the fifth is the only slot on the week that varies,
// and it is the only one Swap is offered on (§4), so it takes position 5.
export function drawWeek1({ templates, focusWeight, monthsSince, random = Math.random }) {
  const week1 = templates.filter((t) => t.week_theme === 1);
  const core = week1.filter((t) => t.tier === 'core').sort(byId);
  const rest = week1.filter((t) => t.tier !== 'core');
  if (core.length < 4) throw new ShortPoolError(1, 4, core.length);

  const fifth = draw(1, rest, 1, focusWeight, monthsSince, random);
  return [...rows(core.slice(0, 4).map((t) => t.id), 1), ...rows(fifth, 1, 5)];
}

// Weeks 2 and 3: the focus-weighted draw, five from the whole week's pool.
export function drawDeepWeek(week, { templates, focusWeight, monthsSince, random = Math.random }) {
  const pool = templates.filter((t) => t.week_theme === week);
  return rows(draw(week, pool, 5, focusWeight, monthsSince, random), week);
}

// Week 4 is a sequence, not a draw: the chosen project type's rows in their own
// order. No new research — pick the artifact, gather, build, build, present.
export function week4Rows(templates, projectTypeId) {
  const seq = templates
    .filter((t) => t.week_theme === 4 && t.project_type_id === projectTypeId)
    .sort(byPosition);
  if (seq.length < 5) throw new ShortPoolError(4, 5, seq.length);
  return rows(seq.slice(0, 5).map((t) => t.id), 4);
}

// All twenty. `templates` is already filtered to archived = 0 by the caller:
// archived filters the draw and nothing else, and display must not filter it.
export function drawPlan({ templates, projectTypeId, focusWeight, monthsSince, random = Math.random }) {
  const args = { templates, focusWeight, monthsSince, random };
  return [
    ...drawWeek1(args),
    ...drawDeepWeek(2, args),
    ...drawDeepWeek(3, args),
    ...week4Rows(templates, projectTypeId),
  ];
}
