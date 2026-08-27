// Completion and the stamp (DESIGN.md §6, §7 Passport, §11).
//
// Completion is a consequence, not a button. The gate is 20 of 20 and nothing
// else — there is no completion control sitting in a corner all month, because
// one that exists in week two gets tapped in week two and burns the stamp. The
// twentieth check-off is what offers this route.
//
// A stamp is a frozen record of what was earned, not a live view. person,
// country and focus are denormalized off the plan at the moment it is written,
// so changing country in March does not rewrite what February says — the whole
// point of an artifact is that it stops moving.
//
// None of these three is owner-gated. There are no roles in this app (§15):
// checking off is open to the family and so is the check-off that happens to be
// the twentieth. What guards the destructive one is a confirm step on the
// client, which is what §7 specs — typed confirmation is overkill, a confirm
// step is not.

import { json } from '../lib/html.js';
import { cleanNote } from './sessions.js';
import { planPayload, stampFor } from './plans.js';

// ------------------------------------------------------------- complete --

export async function apiCompletePlan(request, env, session, params) {
  const id = Number(params.id);
  const plan = await env.DB.prepare('SELECT * FROM month_plans WHERE id = ?').bind(id).first();
  if (!plan) return json({ ok: false, error: 'No such plan.' }, { status: 404 });

  const payload = await planPayload(env, id);
  if (payload.stamp) {
    // Two devices, or a double-tap on the one screen the whole app builds
    // towards. Not an error page: the client reads this as "you are already
    // stamped" and goes to the passport, the same way a duplicate setup is a
    // route rather than a failure (§7).
    return json({
      ok: false,
      error: 'That month is already stamped.',
      stamp: payload.stamp,
    }, { status: 409 });
  }

  if (payload.total === 0 || payload.done_count < payload.total) {
    return json({
      ok: false,
      error: `That is ${payload.done_count} of ${payload.total}. The stamp needs all twenty.`,
    }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO stamps (plan_id, person_id, country_id, focus_id, earned_at, headline)
      VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?)
    `).bind(id, plan.person_id, plan.country_id, plan.focus_id, cleanNote(body.headline)),
    env.DB.prepare(`
      UPDATE month_plans SET status = 'complete',
        completed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?
    `).bind(id),
  ]);

  return json({ ok: true, ...(await planPayload(env, id)) }, { status: 201 });
}

// ----------------------------------------------------------- un-complete --

// The only destructive control outside /admin. It destroys an earned stamp, so
// the client confirms first — but it does not refuse: a month stamped by a
// sibling's mis-tap has to be undoable, and re-completing re-stamps.
//
// The plan goes back to 'active' and its twenty tasks are left alone. Nothing
// about the month changed; only the fact that it was declared finished did.
export async function apiUncompletePlan(request, env, session, params) {
  const id = Number(params.id);
  const plan = await env.DB.prepare('SELECT id FROM month_plans WHERE id = ?').bind(id).first();
  if (!plan) return json({ ok: false, error: 'No such plan.' }, { status: 404 });

  const stamp = await stampFor(env, id);
  if (!stamp) {
    return json({ ok: false, error: 'That month is not stamped.' }, { status: 409 });
  }

  await env.DB.batch([
    env.DB.prepare('DELETE FROM stamps WHERE plan_id = ?').bind(id),
    env.DB.prepare(`UPDATE month_plans SET status = 'active', completed_at = NULL WHERE id = ?`)
      .bind(id),
  ]);

  return json({ ok: true, ...(await planPayload(env, id)) });
}

// -------------------------------------------------------------- headline --

// The stamp's one line, editable from the passport forever after. It is the
// permanent text on the year's artifact and it is chosen at the single moment of
// least care — the tap that ends the month — so it cannot be write-once (§7).
//
// An empty string clears it. `headline` is nullable and a stamp with no line is
// a legitimate stamp: the note prompt is skippable twenty times.
export async function apiPatchStamp(request, env, session, params) {
  const id = Number(params.id);
  const stamp = await env.DB.prepare('SELECT plan_id FROM stamps WHERE id = ?').bind(id).first();
  if (!stamp) return json({ ok: false, error: 'No such stamp.' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  if (body.headline !== undefined && body.headline !== null && typeof body.headline !== 'string') {
    return json({ ok: false, error: 'A headline is one line of text.' }, { status: 400 });
  }

  await env.DB.prepare('UPDATE stamps SET headline = ? WHERE id = ?')
    .bind(cleanNote(body.headline), id).run();

  return json({ ok: true, stamp: await stampFor(env, stamp.plan_id) });
}
