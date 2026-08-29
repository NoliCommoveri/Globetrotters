// /admin/api/* — JSON, behind the same admin cookie as the pages above it.
//
// Not /api/admin/*. Cookie paths match on whole segments, so a cookie scoped
// Path=/admin is never sent to /api/admin/..., and every admin write would
// arrive unauthenticated (DESIGN.md §3).

import { json } from '../lib/html.js';
import { readJson } from '../lib/body.js';
import { applyPending, eraseAll, resetMonth } from '../lib/migrations.js';
import { runSeed } from '../lib/seed.js';
import { MIGRATIONS, SEEDS } from '../migrations/index.js';

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

// Run seed. Safe to press twice and expected to be: the second press reports
// zero inserted everywhere, which is the check that the seed is idempotent
// (DESIGN.md §3).
export async function apiSeed(request, env) {
  try {
    const result = await runSeed(env.DB, SEEDS);
    return json(result, { status: result.ok ? 200 : 500 });
  } catch (err) {
    return json({ ok: false, files: [], inserted: {}, error: err.message }, { status: 500 });
  }
}

export const ERASE_PHRASE = 'erase everything';

// Erase everything (§3). Drops every table, `_migrations` included, so Apply
// pending starts from nothing again.
//
// The typed confirmation is a fixed phrase and not the name of the thing being
// destroyed, which is the opposite of Reset month above. The argument there —
// a word you type every time stops being a confirmation — holds for a control
// pressed against one of several plans while the others must survive. This one
// takes the whole database or none of it, there is nothing to name, and it is
// pressed while rebuilding the schema rather than during a month.
export async function apiEraseAll(request, env) {
  const body = await readJson(request);
  if (String(body.confirm ?? '').trim().toLowerCase() !== ERASE_PHRASE) {
    return json({ ok: false, error: `Type ${ERASE_PHRASE} to confirm.` }, { status: 400 });
  }

  try {
    const result = await eraseAll(env.DB);
    return json(result, { status: result.ok ? 200 : 500 });
  } catch (err) {
    return json({ ok: false, dropped: [], remaining: [], error: err.message }, { status: 500 });
  }
}
