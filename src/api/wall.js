// The wall tablet's two routes (DESIGN.md §6, §8).
//
// GET /api/wall is the whole screen in one payload: the family stamp count, the
// three columns, and the passport grid under them. One fetch per change rather
// than four, because the thing that fetches it is a tablet on a kitchen wall
// that is awake for nine months.
//
// GET /api/wall/version is the heartbeat: two aggregates, no payload, called
// every five minutes. Roughly 290 requests a day against a screen that changes
// about three times a day, which is why the wall polls this and not the payload.
//
// **The month count is deliberately not here.** Not withheld by the client —
// absent from the payload. "9 of 20" beside a sibling's "17 of 20" is the
// leaderboard §8 rules out, and a number that is not in the response cannot be
// rendered by a later change to the client that forgot why.

import { json } from '../lib/html.js';
import { todayIn, schoolYearMonths, anchorMonth, weekOf } from '../lib/dates.js';

// ------------------------------------------------------------- heartbeat --

// Both halves can move backwards: undo nulls `plan_tasks.completed_at` and
// removing a stamp deletes the row behind MAX(earned_at). The client compares
// this string for inequality rather than for growth, which is the whole of
// Q-09 — compared with `>`, one undo leaves the wall permanently stale.
export async function apiWallVersion(request, env) {
  const [stamps, tasks] = await Promise.all([
    env.DB.prepare('SELECT MAX(earned_at) AS v FROM stamps').first(),
    env.DB.prepare('SELECT MAX(completed_at) AS v FROM plan_tasks').first(),
  ]);
  return json({ ok: true, version: `${stamps?.v || ''}/${tasks?.v || ''}` });
}

// ---------------------------------------------------------------- payload --

// Every plan for all three people, the same list the passport reads. The grid
// needs the finished months and the columns need the running one, and three
// people times nine months is not a payload worth splitting in two.
const PLANS = `
  SELECT month_plans.id, month_plans.person_id, month_plans.month,
         month_plans.start_date, month_plans.status,
         countries.name AS country_name,
         focuses.name AS focus_name
  FROM month_plans
  JOIN countries ON countries.id = month_plans.country_id
  JOIN focuses ON focuses.id = month_plans.focus_id
  ORDER BY month_plans.month, month_plans.person_id
`;

const STAMPS = `
  SELECT stamps.id, stamps.plan_id, stamps.person_id, stamps.earned_at,
         stamps.headline,
         month_plans.month,
         countries.name AS country_name,
         focuses.name AS focus_name
  FROM stamps
  JOIN month_plans ON month_plans.id = stamps.plan_id
  JOIN countries ON countries.id = stamps.country_id
  JOIN focuses ON focuses.id = stamps.focus_id
  ORDER BY stamps.earned_at
`;

// Done and total per plan per week, for every plan at once. The wall needs one
// week of one month, but asking for it takes a second round trip after the plans
// come back — and a year of school is 27 plans times four weeks, which is a
// hundred and eight rows.
const WEEKS = `
  SELECT plan_id, week_no,
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done
  FROM plan_tasks
  GROUP BY plan_id, week_no
`;

// One column per person, in `people.sort_order`, always three of them and always
// in the same order. Never sorted by progress, and there is no branch here that
// could sort them: the order is the people query's and nothing downstream
// re-reads it (§8).
function columns(people, plans, weeks, month, today) {
  return people.map((person) => {
    const plan = plans.find((p) => p.person_id === person.id && p.month === month) || null;
    if (!plan) return { person_id: person.id, plan: null };

    // A completed month shows its last week full rather than whichever week the
    // calendar has wandered into. The month is over; the ring is not a live
    // count any more, it is the state the month ended in.
    const weekNo = plan.status === 'complete' ? 4 : weekOf(plan.start_date, today);
    const row = weeks.find((w) => w.plan_id === plan.id && w.week_no === weekNo);

    return {
      person_id: person.id,
      plan: {
        id: plan.id,
        country_name: plan.country_name,
        focus_name: plan.focus_name,
        status: plan.status,
        week_no: weekNo,
        week_done: row ? Number(row.done) : 0,
        week_total: row ? Number(row.total) : 0,
      },
    };
  });
}

export async function apiWall(request, env) {
  const [people, stamps, plans, weeks] = await Promise.all([
    env.DB.prepare('SELECT id, name, color, sort_order FROM people ORDER BY sort_order, id').all(),
    env.DB.prepare(STAMPS).all(),
    env.DB.prepare(PLANS).all(),
    env.DB.prepare(WEEKS).all(),
  ]);

  const today = todayIn(env.FAMILY_TZ);
  const month = anchorMonth(plans.results.map((p) => p.month), today);

  return json({
    ok: true,
    today,
    month,
    // The headline, and the one number on this screen that belongs to everybody
    // (§8). The individual rings sit quietly underneath it.
    stamp_count: stamps.results.length,
    people: people.results,
    columns: columns(people.results, plans.results, weeks.results, month, today),
    // The grid below the columns: the same nine rows the passport draws, blank
    // from day one, because an unfilled year shows the shape of the goal.
    months: schoolYearMonths(month),
    stamps: stamps.results,
    plans: plans.results,
  });
}
