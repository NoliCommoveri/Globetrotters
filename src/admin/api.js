// /admin/api/* — JSON, behind the same admin cookie as the pages above it.
//
// Not /api/admin/*. Cookie paths match on whole segments, so a cookie scoped
// Path=/admin is never sent to /api/admin/..., and every admin write would
// arrive unauthenticated (DESIGN.md §3).

import { json } from '../lib/html.js';
import { applyPending, resetMonth } from '../lib/migrations.js';
import { MIGRATIONS } from '../migrations/index.js';

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function apiMigrate(request, env) {
  try {
    const result = await applyPending(env.DB, MIGRATIONS);
    return json(result, { status: result.ok ? 200 : 500 });
  } catch (err) {
    return json({ ok: false, applied: [], failure: { error: err.message } }, { status: 500 });
  }
}

// The typed confirmation is the plan's own month rather than a fixed word: a
// word you type every time stops being a confirmation, and this one cannot be
// muscle memory because it names the thing being destroyed.
export async function apiResetMonth(request, env) {
  const body = await readJson(request);
  const planId = Number(body.plan_id);
  if (!Number.isInteger(planId)) {
    return json({ ok: false, error: 'plan_id required' }, { status: 400 });
  }

  const plan = await env.DB.prepare('SELECT id, month FROM month_plans WHERE id = ?')
    .bind(planId).first();
  if (!plan) return json({ ok: false, error: 'No such plan' }, { status: 404 });

  if (String(body.confirm ?? '').trim() !== plan.month) {
    return json({ ok: false, error: `Type ${plan.month} to confirm.` }, { status: 400 });
  }

  const deleted = await resetMonth(env.DB, planId);
  return json({ ok: true, plan_id: planId, month: plan.month, deleted });
}
