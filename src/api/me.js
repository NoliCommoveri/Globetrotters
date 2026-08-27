// GET /api/me — who the family is, who this device is, and what is running
// right now. One fetch, called on every launch and every visibilitychange
// (DESIGN.md §2, §7).
//
// PATCH /api/me — which of the three this device is. It writes person_id into
// the signed cookie server-side, not localStorage: Safari caps script-writable
// storage at seven days, which over spring break would quietly forget who
// someone is while leaving them logged in (§2).

import { json } from '../lib/html.js';
import { issueSessionCookie } from '../lib/auth.js';
import { todayIn, setupMonthFor } from '../lib/dates.js';

// The whole family, not just the cookie's person. The picker needs three, and
// so does every screen from slice 06 on — the passport is shared and the point
// of it is seeing the other two.
async function people(env) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, color, sort_order FROM people ORDER BY sort_order, id'
  ).all();
  return results;
}

// Active plans for all three, not just this person's. "Who hasn't started yet"
// is a family-visible fact by design (§7), and three rows is not a payload.
async function activePlans(env) {
  const { results } = await env.DB.prepare(`
    SELECT month_plans.id, month_plans.person_id, month_plans.month,
           month_plans.start_date, month_plans.country_id, month_plans.focus_id,
           month_plans.project_type_id, month_plans.status,
           countries.name AS country_name, focuses.name AS focus_name
    FROM month_plans
    JOIN countries ON countries.id = month_plans.country_id
    JOIN focuses ON focuses.id = month_plans.focus_id
    WHERE month_plans.status = 'active'
    ORDER BY month_plans.month DESC, month_plans.person_id
  `).all();
  return results;
}

export async function apiMe(request, env, session) {
  const [list, plans] = await Promise.all([people(env), activePlans(env)]);

  // A person id in a valid cookie that names nobody — the row was deleted, or
  // the seed was reset — sends the device back to the picker rather than to a
  // screen with no owner.
  const known = list.some((p) => p.id === session.personId);

  // The family's own today, from FAMILY_TZ. The client cannot know it — a phone
  // on a trip is in the wrong timezone and a Worker answers from wherever it
  // runs — and every screen from here on needs it: which month setup opens, and
  // from slice 05 which week the ring is counting.
  const today = todayIn(env.FAMILY_TZ);

  return json({
    ok: true,
    person_id: known ? session.personId : null,
    people: list,
    plans,
    today,
    month: setupMonthFor(today),
  });
}

export async function apiPatchMe(request, env, session) {
  const body = await request.json().catch(() => ({}));
  const id = Number(body.person_id);
  if (!Number.isInteger(id)) {
    return json({ ok: false, error: 'person_id must be one of the three people' }, { status: 400 });
  }

  const person = await env.DB.prepare('SELECT id FROM people WHERE id = ?').bind(id).first();
  if (!person) return json({ ok: false, error: 'No such person' }, { status: 404 });

  // A fresh cookie carrying the new person, which also slides the year forward.
  return json({ ok: true, person_id: id }, {
    headers: { 'set-cookie': await issueSessionCookie(env, id) },
  });
}
