// The draw. The only real algorithm in the app (DESIGN.md §4).
//
// In JS, not SQL, and pure: it takes rows and two lookup functions and returns
// twenty positions. Nothing here touches D1, which is what makes "a form never
// appears twice in a week" and "a prompt rests five months for one child and
// stays available to a sibling" assertions in a test file rather than claims in
// a comment.
//
// Randomness is injected. A caller passes Math.random; a test passes a sequence
// and gets a draw it can predict. The deal takes no randomness at all — it is
// an exhaustive score over seventy splits, so the same eight prompts always
// land the same way.
//
// A weeks 2-3 row carries four fields beyond the base columns: `slug`, `form`
// (its worksheet layout id, or null for an unbound prompt), `modes` (its mode
// tags) and `thirds` (how much paper its form takes). Week 1 and week 4 rows
// need none of them and the defaults below cover a caller that supplies only
// the base columns.

export class ShortPoolError extends Error {
  constructor(week, needed, available) {
    super(week == null
      ? `Weeks 2 and 3 need ${needed} tasks and the library offers ${available}`
      : `Week ${week} needs ${needed} tasks and the library offers ${available}`);
    this.name = 'ShortPoolError';
    this.week = week;
    this.needed = needed;
    this.available = available;
  }
}

// ------------------------------------------------------------ the numbers --

// Five months of eight blocks forty of the finished library's 153, which leaves
// 113 eligible and no cliff. It replaced a decay because a decay was right
// against a 25-template week and is wrong against a merged pool: recency is a
// prohibition now, not a preference (§4).
export const COOLDOWN_MONTHS = 5;

// Ten tasks across weeks 2 and 3: two pinned, six weighted, two wildcard.
export const WEIGHTED = 6;
export const WILDCARDS = 2;
export const DRAWN = WEIGHTED + WILDCARDS;
export const PER_WEEK = 5;

// No worksheet form takes more than two of the ten. Five draws against
// twenty-seven forms collide inside a week about 40% of the time by arithmetic
// alone, so no library rebalancing fixes it — capping the form and letting the
// deal separate the pair takes it to zero (§4).
export const FORM_CAP = 2;

// The two modes every month must hold at least one of, in the order the two
// wildcard slots repair them. A month in which nobody from the country ever
// speaks is the failure the library is most trying to avoid, and the
// anti-monotony rule below does not prevent it: forbidding a *second* prompt
// with a mode tag says nothing about the first.
export const BALANCE_MODES = ['hands-on', 'personal-voice'];

// Both say "this month" in their wording, so they read wrong dealt into the
// earlier week. They are ordinary drawn prompts — the constraint is on the
// deal, not the draw. Neither is seeded until slices 19 and 20; the rule is
// written against the slug and matches nothing until then.
export const LATE_ONLY = new Set(['nations-before-the-throne', 'hear-from-a-kid']);

const modesOf = (t) => t.modes ?? [];
const formOf = (t) => t.form ?? null;
const thirdsOf = (t) => Number(t.thirds) || 1;

// ------------------------------------------------------------- the scores --

// A hard cooldown, not a curve. Drawn within five months for this person scores
// 0 and is out; anything older, or never drawn, scores 1. Scoped per learner,
// so a prompt rests for one child and stays available to a sibling (§4).
export function recency(monthsSince) {
  if (monthsSince == null) return 1;
  return monthsSince > COOLDOWN_MONTHS ? 1 : 0;
}

// fw * recency, with fw = 0 excluding outright. The tag join never returns 0 —
// `1 + 2 * SUM` floors at 1 — so in practice this is "eligible or not", and the
// zero branch is what week 1's uniform draw and the swap pool share with it.
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

// ---------------------------------------------------------------- week 1 --

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

// ---------------------------------------------------------- the merged pool --

// Weeks 2 and 3 are one pool. `week_theme` stays on the row as the prompt's
// natural half and is read only by the deal's arc preference; nothing in the
// draw sees it.
export const mergedPool = (templates) => templates.filter(
  (t) => (t.week_theme === 2 || t.week_theme === 3) && t.tier !== 'fixed'
);

// The two pinned prompts, by the week each is pinned to. `wow-fact` is the one
// prompt with no subject at all, which makes it on-theme for no focus and every
// focus at once; `cook-it` breaks the ten-minute rule on purpose and at a normal
// weight would land four months out of nine. A weighted draw is the wrong
// instrument for both (§4).
export function pinsBy(templates) {
  const pins = { 2: null, 3: null };
  for (const t of templates) {
    if (t.tier === 'fixed' && (t.week_theme === 2 || t.week_theme === 3)) pins[t.week_theme] = t;
  }
  return pins;
}

// The eligible pool, and the one place the cooldown gives way. Against the 153
// seeded as of slice 20 this never fires — measured at zero fallbacks across
// 24,300 simulated months. The stalest go back first, one at a time, and only
// as far as eight.
function eligiblePool(pool, monthsSince) {
  const fresh = pool.filter((t) => recency(monthsSince(t.id)) === 1);
  if (fresh.length >= DRAWN) return fresh;

  const cooled = pool
    .filter((t) => recency(monthsSince(t.id)) === 0)
    .sort((a, b) => (monthsSince(b.id) ?? 0) - (monthsSince(a.id) ?? 0) || a.id - b.id);
  return [...fresh, ...cooled.slice(0, DRAWN - fresh.length)];
}

// The strictest non-empty candidate set. Both rules hold at 153 — zero form
// collisions in 22,500 simulated months, zero mode fallbacks in 40,000 draws —
// but at 50 they can meet, and something has to give in a stated order rather
// than whichever the loop happens to hit. The mode rule gives way first: it is
// anti-monotony, a month that says *and now write ours next to it* twice. The
// form cap is what keeps two of the same worksheet off one week's paper, which
// §4 calls the one thing the draw forbids outright.
function allowed(candidates, seats, taken) {
  const capOk = (t) => formOf(t) == null || (seats.get(formOf(t)) || 0) < FORM_CAP;
  const modeOk = (t) => modesOf(t).every((m) => !taken.has(m));

  const both = candidates.filter((t) => capOk(t) && modeOk(t));
  if (both.length) return both;
  const capped = candidates.filter(capOk);
  return capped.length ? capped : candidates;
}

function seat(t, seats, taken) {
  const form = formOf(t);
  if (form != null) seats.set(form, (seats.get(form) || 0) + 1);
  for (const m of modesOf(t)) taken.add(m);
}

// The wildcard's reach: the least on-theme quarter of what is left. The bottom
// quarter of 153 is thirty-eight, so it is genuinely a wildcard rather than the
// same handful of orphans every month.
function bottomQuarter(candidates, fw) {
  const sorted = [...candidates].sort((a, b) => fw(a.id) - fw(b.id) || a.id - b.id);
  return sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 4)));
}

const uniform = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

// Eight prompts from the merged pool: six weighted, two wildcard, both pins
// counted against the constraints from the start.
export function drawMerged({ pool, pins, focusWeight, monthsSince, random = Math.random }) {
  const eligible = eligiblePool(pool, monthsSince);
  if (eligible.length < DRAWN) throw new ShortPoolError(null, DRAWN, eligible.length);

  const seats = new Map();
  const taken = new Set();
  for (const pin of pins) seat(pin, seats, taken);

  const byIdMap = new Map(eligible.map((t) => [t.id, t]));
  let remaining = eligible;
  const chosen = [];
  const take = (t) => {
    chosen.push(t);
    seat(t, seats, taken);
    remaining = remaining.filter((c) => c.id !== t.id);
  };

  for (let n = 0; n < WEIGHTED; n += 1) {
    const candidates = allowed(remaining, seats, taken);
    const [id] = sampleWithoutReplacement(
      candidates.map((t) => ({ id: t.id, weight: focusWeight(t.id) })), 1, random
    );
    take(byIdMap.get(id));
  }

  // The two wildcard slots are also the repair budget for mode balance, which
  // costs the draw nothing it was using: if the ten hold no `hands-on` the
  // first draws from `hands-on` candidates only, and the second does the same
  // for `personal-voice`. A mode already taken is a prompt already carrying it,
  // so a repair the pins have already made is skipped. A mode nothing in the
  // pool carries falls back to an ordinary wildcard rather than failing the
  // draw — the case `personal-voice` was in before slice 20 wrote the voices.
  for (let n = 0; n < WILDCARDS; n += 1) {
    let candidates = allowed(remaining, seats, taken);
    const mode = BALANCE_MODES[n];
    if (mode && !taken.has(mode)) {
      const repair = candidates.filter((t) => modesOf(t).includes(mode));
      if (repair.length) candidates = repair;
    }
    take(uniform(bottomQuarter(candidates, focusWeight), random));
  }

  return chosen;
}

// ------------------------------------------------------------- the deal --

// Every four-four split of eight, as index sets. Seventy of them, enumerated
// once at module load: the deal scores all of them on every draw and the shape
// of the enumeration never changes.
const SPLITS = (() => {
  const out = [];
  for (let a = 0; a < DRAWN; a += 1) {
    for (let b = a + 1; b < DRAWN; b += 1) {
      for (let c = b + 1; c < DRAWN; c += 1) {
        for (let d = c + 1; d < DRAWN; d += 1) out.push([a, b, c, d]);
      }
    }
  }
  return out;
})();

const collisions = (week) => {
  const forms = new Map();
  for (const t of week) {
    const form = formOf(t);
    if (form != null) forms.set(form, (forms.get(form) || 0) + 1);
  }
  let over = 0;
  for (const n of forms.values()) over += Math.max(0, n - 1);
  return over;
};

const sum = (list, of) => list.reduce((n, t) => n + of(t), 0);

// Lexicographic, and the first key that differs decides. A tie all the way down
// leaves the incumbent in place, which is what makes the deal deterministic.
function better(keys, incumbent) {
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i] !== incumbent[i]) return keys[i] < incumbent[i];
  }
  return false;
}

// The eight drawn are split four and four; each pin joins its own week. Scored
// exhaustively over the seventy splits, first key wins:
//
//   1. no worksheet form twice inside one week — the pins count
//   2. the two weeks hold as near the same SUM of fw as the split allows
//   3. natural week 2 leans to week 2, natural week 3 to week 3
//   4. the two weeks land as near the same number of thirds
//
// Key 2 is the one that does the work — it is what stops a focus's whole month
// landing in one week — and it must be the summed weight rather than a count of
// prompts above baseline. A count treats a prompt carrying one weight-1 tag as
// worth the same as a x9 and gives back a third of what the merge bought.
//
// No randomness: the same eight prompts always deal the same way, and ties go
// to the first split in enumeration order.
export function dealWeeks(drawn, pins, focusWeight) {
  const fw = (t) => focusWeight(t.id);
  let best = null;

  for (const split of SPLITS) {
    const inWeek2 = new Set(split);
    const four2 = split.map((i) => drawn[i]);
    if (four2.some((t) => LATE_ONLY.has(t.slug))) continue;
    const four3 = drawn.filter((_, i) => !inWeek2.has(i));

    const week2 = pins[2] ? [pins[2], ...four2] : four2;
    const week3 = pins[3] ? [pins[3], ...four3] : four3;

    const keys = [
      collisions(week2) + collisions(week3),
      Math.abs(sum(four2, fw) - sum(four3, fw)),
      four2.filter((t) => t.week_theme === 3).length
        + four3.filter((t) => t.week_theme === 2).length,
      Math.abs(sum(week2, thirdsOf) - sum(week3, thirdsOf)),
    ];

    if (!best || better(keys, best.keys)) best = { keys, week2, week3 };
  }

  // Every split bars week 2 only if both late-only prompts were drawn *and* one
  // of them cannot be moved, which four seats a side makes impossible.
  return { 2: best.week2, 3: best.week3 };
}

// Weeks 2 and 3: one draw of eight, dealt, each week joined by its pin. The
// pinned task takes position 1. It is the week's anchor either way, and
// `cook-it` in particular needs a grown-up and probably an ingredient — which
// Monday affords and Friday does not.
export function drawDeepWeeks({ templates, focusWeight, monthsSince, random = Math.random }) {
  const pins = pinsBy(templates);
  for (const week of [2, 3]) {
    // A pin is structural: without it the week is four tasks and the month is
    // nineteen. Archiving one in the library editor is refused here rather than
    // silently shortening a month.
    if (!pins[week]) throw new ShortPoolError(week, PER_WEEK, PER_WEEK - 1);
  }

  const drawn = drawMerged({
    pool: mergedPool(templates),
    pins: [pins[2], pins[3]],
    focusWeight,
    monthsSince,
    random,
  });

  const dealt = dealWeeks(drawn, pins, focusWeight);
  return [2, 3].flatMap((week) => rows(dealt[week].map((t) => t.id), week));
}

// ---------------------------------------------------------------- week 4 --

// Week 4 is a sequence, not a draw: the chosen project type's rows in their own
// order. No new research — pick the artifact, gather, build, build, present.
export function week4Rows(templates, projectTypeId) {
  const seq = templates
    .filter((t) => t.week_theme === 4 && t.project_type_id === projectTypeId)
    .sort(byPosition);
  if (seq.length < PER_WEEK) throw new ShortPoolError(4, PER_WEEK, seq.length);
  return rows(seq.slice(0, PER_WEEK).map((t) => t.id), 4);
}

// All twenty. `templates` is already filtered to archived = 0 by the caller:
// archived filters the draw and nothing else, and display must not filter it.
export function drawPlan({ templates, projectTypeId, focusWeight, monthsSince, random = Math.random }) {
  const args = { templates, focusWeight, monthsSince, random };
  return [
    ...drawWeek1(args),
    ...drawDeepWeeks(args),
    ...week4Rows(templates, projectTypeId),
  ];
}
