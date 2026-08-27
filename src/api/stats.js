// GET /api/stats — the two numbers §10 allows, for the cookie's own person, or
// for all three with `?all=1`.
//
// **Days worked** is the streak replacement and the whole reason this route
// exists: cumulative across the school year, counting days somebody sat down
// rather than tasks they finished. It only ever goes up, which is a property of
// how it is counted — DISTINCT `local_date` over session rows that undo never
// deletes — and not a rule applied afterwards.
//
// **Tasks done** is the other number, kept separate on purpose. Blending the two
// makes both meaningless: one is a month's finish line, the other is nine months
// of showing up.
//
// There is no streak here and no safe variant of one. See §10.

import { json } from '../lib/html.js';

const STATS = `
  SELECT people.id AS person_id, people.name, people.color,
         (SELECT COUNT(DISTINCT sessions.local_date)
            FROM sessions
            JOIN month_plans ON month_plans.id = sessions.plan_id
           WHERE month_plans.person_id = people.id) AS days_worked,
         (SELECT COUNT(*)
            FROM plan_tasks
            JOIN month_plans ON month_plans.id = plan_tasks.plan_id
           WHERE month_plans.person_id = people.id
             AND plan_tasks.status = 'done') AS tasks_done
  FROM people
`;

export async function apiStats(request, env, session) {
  const all = new URL(request.url).searchParams.get('all') === '1';

  if (all) {
    const { results } = await env.DB.prepare(`${STATS} ORDER BY people.sort_order, people.id`).all();
    return json({ ok: true, stats: results });
  }

  if (session.personId == null) {
    return json({ ok: false, error: 'Pick who you are first.' }, { status: 400 });
  }

  const { results } = await env.DB.prepare(`${STATS} WHERE people.id = ?`)
    .bind(session.personId).all();
  return json({ ok: true, stats: results });
}
