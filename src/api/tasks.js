// The daily loop's two writes (DESIGN.md §4, §6, §7 This week).
//
// PATCH /api/tasks/:id sets an explicit target state and never toggles. One
// person has as many devices as they like (§2), so a stale second device sending
// what it thinks is a toggle would flip a finished task back open — and a check
// off is the one action in this app that happens 180 times a person.
//
// The session that goes with a check-off is written **only on an open -> done
// transition** (Q-08). The route stays idempotent either way: `done` on a task
// already done is a 200, because a double-tap on a slow connection is a normal
// event and not an error. Writing the session unconditionally is how days-worked
// — the one number §10 promises never lies — would start over-counting.

import { json } from '../lib/html.js';
import { sessionStatement } from './sessions.js';
import { planPayload, drawInputs, swappable, SWAP_BUDGET } from './plans.js';
import { sampleWithoutReplacement, score, ShortPoolError } from '../lib/draw.js';

const STATES = new Set(['open', 'done']);

// The task, its plan, and the template fields the two gates below read. One
// query, because both routes need all of it before they can decide anything.
async function taskRow(env, id) {
  return env.DB.prepare(`
    SELECT plan_tasks.id, plan_tasks.plan_id, plan_tasks.task_template_id,
           plan_tasks.week_no, plan_tasks.position, plan_tasks.status,
           plan_tasks.swapped_from,
           task_templates.tier,
           month_plans.person_id, month_plans.month, month_plans.focus_id
    FROM plan_tasks
    JOIN task_templates ON task_templates.id = plan_tasks.task_template_id
    JOIN month_plans ON month_plans.id = plan_tasks.plan_id
    WHERE plan_tasks.id = ?
  `).bind(id).first();
}

// ------------------------------------------------------------- check off --

// Not owner-gated. There are no roles in this app and everyone can already edit
// everything (§15) — a parent checking off beside a kid is the normal case, not
// an override. What is owner-gated is rerolling somebody's month, and that is
// the swap below.
export async function apiPatchTask(request, env, session, params) {
  const task = await taskRow(env, Number(params.id));
  if (!task) return json({ ok: false, error: 'No such task.' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (!STATES.has(status)) {
    return json({ ok: false, error: 'A task is either open or done.' }, { status: 400 });
  }

  if (status !== task.status) {
    const statements = status === 'done'
      ? [
        env.DB.prepare(
          `UPDATE plan_tasks SET status = 'done',
             completed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`
        ).bind(task.id),
        // The note is not written here. "What surprised you?" is asked after
        // the check-off has already landed (§7), so it arrives on its own
        // through POST /api/sessions — the route that exists to write a session
        // without touching a task's state.
        sessionStatement(env, { planId: task.plan_id, planTaskId: task.id }),
      ]
      // Undo. The session rows are left exactly where they are: days-worked is
      // the number specced never to go down (§10), and deleting the session
      // behind a mis-tap takes the whole day with it when it was that day's only
      // one. Over-counting by one is harmless; decrementing breaks the one
      // promise the number makes.
      : [
        env.DB.prepare(
          `UPDATE plan_tasks SET status = 'open', completed_at = NULL WHERE id = ?`
        ).bind(task.id),
      ];
    await env.DB.batch(statements);
  }

  return json({ ok: true, ...(await planPayload(env, task.plan_id)) });
}

// ------------------------------------------------------------------ swap --

// The candidate pool for one slot: the same week, the same focus, and every
// template already in this plan excluded. `UNIQUE (plan_id, task_template_id)`
// enforces that last part at the database level anyway — this is what keeps it
// from being enforced as a constraint violation (§4).
function swapPool(task, inputs, held) {
  const pool = inputs.templates.filter((t) => (
    t.week_theme === task.week_no
    && !held.has(t.id)
    // Week 1's fifth slot draws from the same non-core pool the draw itself
    // uses. The four core tasks are not candidates for it and never were.
    && (task.week_no !== 1 || t.tier !== 'core')
  ));
  return pool.map((t) => ({ id: t.id, weight: score(inputs.focusWeight(t.id), inputs.monthsSince(t.id)) }));
}

// Owner only. A swap is a reroll of one slot against a three-a-month budget, so
// a sibling on a shared phone can spend somebody else's month the same way a
// redraw would — which is the case §7 gates `redraw` and `PATCH /api/plans/:id`
// against. Checking off is the opposite and stays open to the family.
export async function apiSwapTask(request, env, session, params) {
  const task = await taskRow(env, Number(params.id));
  if (!task) return json({ ok: false, error: 'No such task.' }, { status: 404 });
  if (task.person_id !== session.personId) {
    return json({ ok: false, error: 'That month belongs to someone else.' }, { status: 403 });
  }

  if (task.status === 'done') {
    return json({ ok: false, error: 'That one is already done.' }, { status: 409 });
  }
  if (!swappable(task)) {
    return json({
      ok: false,
      error: task.week_no === 4
        ? 'Week 4 is a sequence. It stays in order.'
        : 'That one is on every country. It stays.',
    }, { status: 409 });
  }

  const payload = await planPayload(env, task.plan_id);
  if (payload.swaps_left <= 0) {
    return json({
      ok: false,
      error: `You have used all ${SWAP_BUDGET} swaps this month.`,
    }, { status: 409 });
  }

  const inputs = await drawInputs(env, {
    personId: task.person_id, month: task.month, focusId: task.focus_id,
  });
  const held = new Set(
    payload.weeks.flatMap((w) => w.tasks).map((t) => t.task_template_id)
  );

  let picked;
  try {
    [picked] = sampleWithoutReplacement(swapPool(task, inputs, held), 1, Math.random, task.week_no);
  } catch (err) {
    if (err instanceof ShortPoolError) {
      return json({
        ok: false,
        error: 'There is nothing left in the library to swap this one for.',
      }, { status: 409 });
    }
    throw err;
  }

  // In place: same week, same position. `swapped_from` records the template this
  // card replaced, which is what lets the new card say so — and swapping a slot
  // twice still costs one against the budget, because the count is over slots
  // that carry a `swapped_from`, not over swaps performed (§4).
  await env.DB.prepare(
    'UPDATE plan_tasks SET task_template_id = ?, swapped_from = ? WHERE id = ?'
  ).bind(picked, task.task_template_id, task.id).run();

  return json({ ok: true, ...(await planPayload(env, task.plan_id)) });
}
