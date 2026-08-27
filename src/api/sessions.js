// POST /api/sessions — a sitting (DESIGN.md §5, §7, §10).
//
// A session is a day somebody sat down, not a task they finished. The two are
// deliberately separate: one task can take two sittings, and days-worked counts
// days sat down. That is why "Worked on it" is a control at all — without a
// route that writes a session and leaves the task alone, the two-sittings case
// the schema was built for has no way to happen.
//
// `local_date` is written here, at insert, from FAMILY_TZ. Never computed from
// `logged_at` later: a 9pm Chicago sitting is already tomorrow in UTC, and
// days-worked would count it on a day nobody was at the table.

import { json } from '../lib/html.js';
import { todayIn } from '../lib/dates.js';
import { planPayload } from './plans.js';

// One line, and a line that fits on a card. Long enough for a real sentence,
// short enough that the stamp headline it may become still reads as a headline.
const NOTE_MAX = 280;

export function cleanNote(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, NOTE_MAX);
  return text || null;
}

// Minutes is optional everywhere and nothing in v1 writes it — there is no timer
// and no field for it. It is validated rather than dropped because the column
// exists and a client that starts sending it should not be able to store a
// negative afternoon.
function cleanMinutes(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 1440) return undefined;   // undefined = invalid
  return n;
}

// The statement, not the write. PATCH /api/tasks/:id has to insert a session in
// the same batch as the status change, so that a check-off is one atomic thing
// rather than a task that finished and a day that did not get counted.
export function sessionStatement(env, { planId, planTaskId = null, minutes = null, note = null }) {
  return env.DB.prepare(`
    INSERT INTO sessions (plan_id, plan_task_id, minutes, note, logged_at, local_date)
    VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?)
    RETURNING id, plan_id, plan_task_id, minutes, note, logged_at, local_date
  `).bind(planId, planTaskId, minutes, note, todayIn(env.FAMILY_TZ));
}

export async function apiCreateSession(request, env, session) {
  const body = await request.json().catch(() => ({}));

  const planId = Number(body.plan_id);
  if (!Number.isInteger(planId)) {
    return json({ ok: false, error: 'Which month is this?' }, { status: 400 });
  }

  const plan = await env.DB.prepare('SELECT id FROM month_plans WHERE id = ?').bind(planId).first();
  if (!plan) return json({ ok: false, error: 'No such plan.' }, { status: 404 });

  // Optional, and checked against the plan rather than taken on trust: a session
  // pointing at another month's task would land its note on the wrong Plan page
  // and in the wrong stamp headline pool.
  let planTaskId = null;
  if (body.plan_task_id !== undefined && body.plan_task_id !== null) {
    planTaskId = Number(body.plan_task_id);
    const task = await env.DB.prepare('SELECT id FROM plan_tasks WHERE id = ? AND plan_id = ?')
      .bind(planTaskId, planId).first();
    if (!task) return json({ ok: false, error: 'That task is not in this month.' }, { status: 400 });
  }

  const minutes = cleanMinutes(body.minutes);
  if (minutes === undefined) {
    return json({ ok: false, error: 'That is not a number of minutes.' }, { status: 400 });
  }

  const created = await sessionStatement(env, {
    planId, planTaskId, minutes, note: cleanNote(body.note),
  }).first();

  // The whole plan back, like every other write in this app. A session changes
  // the card's state, the notes on Plan and the days-worked count, and a client
  // that has to merge three of those by hand gets one of them wrong.
  return json({ ok: true, session: created, ...(await planPayload(env, planId)) }, { status: 201 });
}
