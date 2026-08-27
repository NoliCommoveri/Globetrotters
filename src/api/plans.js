// Month plans: the draw, the reveal, and the three things the reveal can change
// (DESIGN.md §4, §6, §7 Month setup).
//
// Every one of these routes returns the same plan payload, because every one of
// them lands the client on the same screen. A redraw is not a different shape of
// answer from a create — it is the same twenty tasks, drawn again.
//
// The gate on all of them is the first check-off, and it is one rule: before it,
// everything is free and resettable; after it, the plan is fixed (Q-01, Q-02).

import { json } from '../lib/html.js';
import { drawPlan, drawDeepWeek, week4Rows, ShortPoolError } from '../lib/draw.js';
import { isMonth, inSchoolYear, monthsBetween, startDateFor, todayIn, weekOf } from '../lib/dates.js';

const WEEK_THEMES = { 1: 'Foundations', 2: 'Deep Dive', 3: 'Deep Dive', 4: 'Make & Present' };

// Three a month. Enough to fix a genuine mismatch, not enough to reroll a month
// into whatever looks easiest (§4). Derived from the rows, never stored — a
// redraw replaces all twenty and the budget goes with the tasks it bought.
export const SWAP_BUDGET = 3;

// Week 1's fifth slot and weeks 2-3. Not the four week-1 `core` tasks, which
// anchor workbook pages and are meant to repeat — swapping one leaves a physical
// page with nothing feeding it. Not week 4, which is an ordered sequence rather
// than a draw. And not a task already done.
export const swappable = (task) =>
  task.status === 'open' && task.week_no !== 4 && task.tier !== 'core';

// ------------------------------------------------------------------ reads --

// Not filtered by archived. A template archived in the library editor after it
// was drawn still has to render its title on a plan that already holds it —
// archived filters the draw and nothing else (§4).
async function planRow(env, id) {
  return env.DB.prepare(`
    SELECT month_plans.*,
           countries.name AS country_name, countries.iso3 AS country_iso3,
           countries.continent AS country_continent, countries.research_depth,
           focuses.name AS focus_name, focuses.slug AS focus_slug,
           project_types.name AS project_type_name,
           project_types.materials AS project_type_materials
    FROM month_plans
    JOIN countries ON countries.id = month_plans.country_id
    JOIN focuses ON focuses.id = month_plans.focus_id
    JOIN project_types ON project_types.id = month_plans.project_type_id
    WHERE month_plans.id = ?
  `).bind(id).first();
}

async function planTasks(env, id) {
  const { results } = await env.DB.prepare(`
    SELECT plan_tasks.id, plan_tasks.task_template_id, plan_tasks.week_no,
           plan_tasks.position, plan_tasks.status, plan_tasks.completed_at,
           plan_tasks.swapped_from,
           task_templates.title, task_templates.prompt,
           task_templates.workbook_page, task_templates.tier,
           task_templates.archived,
           -- The third card state. In progress is any open task with a session
           -- against it, and it needs no column: without a visible mark "Worked
           -- on it" reads as a dead button and the two-sittings case never
           -- surfaces again (§7).
           (SELECT COUNT(*) FROM sessions WHERE sessions.plan_task_id = plan_tasks.id)
             AS session_count,
           -- What this card replaced. Two prompts from the same week and focus
           -- often read alike, so without this a swap is indistinguishable from
           -- a bug (§4).
           replaced.title AS swapped_from_title
    FROM plan_tasks
    JOIN task_templates ON task_templates.id = plan_tasks.task_template_id
    LEFT JOIN task_templates AS replaced ON replaced.id = plan_tasks.swapped_from
    WHERE plan_tasks.plan_id = ?
    ORDER BY plan_tasks.week_no, plan_tasks.position
  `).bind(id).all();
  return results;
}

// The month's notes, oldest first, accumulating down the Plan page. This is what
// makes "What surprised you?" worth answering, and it is the pool the stamp
// headline is picked from in slice 06 (§7).
async function planNotes(env, id) {
  const { results } = await env.DB.prepare(`
    SELECT sessions.id, sessions.plan_task_id, sessions.note, sessions.local_date,
           task_templates.title AS task_title
    FROM sessions
    LEFT JOIN plan_tasks ON plan_tasks.id = sessions.plan_task_id
    LEFT JOIN task_templates ON task_templates.id = plan_tasks.task_template_id
    WHERE sessions.plan_id = ? AND sessions.note IS NOT NULL AND sessions.note != ''
    ORDER BY sessions.local_date, sessions.id
  `).bind(id).all();
  return results;
}

// The one payload every route in this file answers with.
export async function planPayload(env, id) {
  const [plan, tasks, notes] = await Promise.all([
    planRow(env, id), planTasks(env, id), planNotes(env, id),
  ]);
  if (!plan) return null;

  const weeks = [1, 2, 3, 4].map((week) => ({
    week_no: week,
    theme: WEEK_THEMES[week],
    tasks: tasks.filter((t) => t.week_no === week).map((t) => ({ ...t, swappable: swappable(t) })),
  }));

  const done = tasks.filter((t) => t.status === 'done').length;
  const swapsUsed = tasks.filter((t) => t.swapped_from != null).length;
  return {
    plan,
    weeks,
    notes,
    done_count: done,
    total: tasks.length,
    // Which week This week is showing. Computed here rather than on the client
    // because the only clock that decides what day it is belongs to FAMILY_TZ —
    // a phone on a trip is in the wrong timezone (§5, §7).
    current_week: weekOf(plan.start_date, todayIn(env.FAMILY_TZ)),
    // The single gate. Named on the payload so the reveal does not have to
    // re-derive it from twenty rows to decide whether to offer Redraw.
    locked: done > 0,
    week4_locked: tasks.some((t) => t.week_no === 4 && t.status === 'done'),
    swaps_used: swapsUsed,
    swaps_left: Math.max(0, SWAP_BUDGET - swapsUsed),
  };
}

// ------------------------------------------------------------- draw inputs --

// Two lookups the pure engine takes as functions: what this focus thinks of a
// template, and how long since this person last drew it.
export async function drawInputs(env, { personId, month, focusId }) {
  const [templates, weights, history] = await Promise.all([
    env.DB.prepare(
      'SELECT id, week_theme, tier, project_type_id, position FROM task_templates WHERE archived = 0'
    ).all(),
    env.DB.prepare(
      'SELECT task_template_id, weight FROM task_focus_weights WHERE focus_id = ?'
    ).bind(focusId).all(),
    // Strictly earlier months, which is what lets a redraw work at all: the plan
    // being drawn is in `month` itself, and counting it would score everything
    // it just drew at zero and exclude it.
    env.DB.prepare(`
      SELECT plan_tasks.task_template_id AS id, MAX(month_plans.month) AS last_month
      FROM plan_tasks
      JOIN month_plans ON month_plans.id = plan_tasks.plan_id
      WHERE month_plans.person_id = ? AND month_plans.month < ?
      GROUP BY plan_tasks.task_template_id
    `).bind(personId, month).all(),
  ]);

  // Sparse on purpose: a missing row means weight 1, and only opinions are
  // stored (§5). Reading it as a Map keeps that default in one expression.
  const weightById = new Map(weights.results.map((w) => [w.task_template_id, w.weight]));
  const monthsById = new Map(
    history.results.map((h) => [h.id, monthsBetween(h.last_month, month)])
  );

  return {
    templates: templates.results,
    focusWeight: (id) => (weightById.has(id) ? weightById.get(id) : 1),
    monthsSince: (id) => (monthsById.has(id) ? monthsById.get(id) : null),
  };
}

const insertTask = (env, planId, row) => env.DB.prepare(
  `INSERT INTO plan_tasks (plan_id, task_template_id, week_no, position, status)
   VALUES (?, ?, ?, ?, 'open')`
).bind(planId, row.task_template_id, row.week_no, row.position);

export function shortPool(err) {
  return json({
    ok: false,
    error: err.week === 4
      ? 'That project type has no week 4 yet. Pick another one.'
      : `The library is short of week ${err.week} tasks — it offers ${err.available} and a week needs ${err.needed}.`,
  }, { status: 409 });
}

// ------------------------------------------------------------------ writes --

async function validSetup(env, body) {
  const country = await env.DB.prepare('SELECT id FROM countries WHERE id = ?')
    .bind(Number(body.country_id)).first();
  if (!country) return 'Pick a country.';

  const focus = await env.DB.prepare('SELECT id FROM focuses WHERE id = ? AND archived = 0')
    .bind(Number(body.focus_id)).first();
  if (!focus) return 'Pick a focus.';

  const project = await env.DB.prepare(
    'SELECT id FROM project_types WHERE id = ? AND archived = 0'
  ).bind(Number(body.project_type_id)).first();
  if (!project) return 'Pick what you will make.';

  return null;
}

export async function apiCreatePlan(request, env, session) {
  if (session.personId == null) {
    return json({ ok: false, error: 'Pick who you are first.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const month = String(body.month || '');
  if (!isMonth(month)) return json({ ok: false, error: 'That is not a month.' }, { status: 400 });
  if (!inSchoolYear(month)) {
    return json({ ok: false, error: 'The year runs September through May.' }, { status: 400 });
  }

  const invalid = await validSetup(env, body);
  if (invalid) return json({ ok: false, error: invalid }, { status: 400 });

  const startDate = startDateFor(month, todayIn(env.FAMILY_TZ));

  let planId;
  try {
    const created = await env.DB.prepare(`
      INSERT INTO month_plans
        (person_id, month, start_date, country_id, focus_id, project_type_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      RETURNING id
    `).bind(
      session.personId, month, startDate,
      Number(body.country_id), Number(body.focus_id), Number(body.project_type_id),
    ).first();
    planId = created.id;
  } catch (err) {
    // UNIQUE (person_id, month). Two devices, or a double-tap on a slow
    // connection — a route, not an error screen (§7).
    const existing = await env.DB.prepare(
      'SELECT id FROM month_plans WHERE person_id = ? AND month = ?'
    ).bind(session.personId, month).first();
    if (existing) {
      return json({ ok: false, error: 'That month is already set up.', plan_id: existing.id }, { status: 409 });
    }
    throw err;
  }

  try {
    const inputs = await drawInputs(env, { personId: session.personId, month, focusId: Number(body.focus_id) });
    const rows = drawPlan({ ...inputs, projectTypeId: Number(body.project_type_id) });
    await env.DB.batch(rows.map((row) => insertTask(env, planId, row)));
  } catch (err) {
    // A plan with no tasks is worse than no plan: it holds the UNIQUE row that
    // stops the kid from trying again.
    await env.DB.prepare('DELETE FROM month_plans WHERE id = ?').bind(planId).run();
    if (err instanceof ShortPoolError) return shortPool(err);
    throw err;
  }

  return json({ ok: true, ...(await planPayload(env, planId)) }, { status: 201 });
}

// The plan is family-visible — the passport is shared and so is the wall — but
// only its owner rerolls it. There are no roles in this app, and this is the one
// place that costs something: a sibling on a shared phone redrawing a month.
export async function owned(env, session, id) {
  const plan = await env.DB.prepare('SELECT * FROM month_plans WHERE id = ?').bind(id).first();
  if (!plan) return { error: json({ ok: false, error: 'No such plan.' }, { status: 404 }) };
  if (plan.person_id !== session.personId) {
    return { error: json({ ok: false, error: 'That month belongs to someone else.' }, { status: 403 }) };
  }
  return { plan };
}

export async function apiGetPlan(request, env, session, params) {
  const payload = await planPayload(env, Number(params.id));
  if (!payload) return json({ ok: false, error: 'No such plan.' }, { status: 404 });
  return json({ ok: true, ...payload });
}

export async function apiRedrawPlan(request, env, session, params) {
  const id = Number(params.id);
  const { plan, error } = await owned(env, session, id);
  if (error) return error;

  const payload = await planPayload(env, id);
  if (payload.locked) {
    return json({
      ok: false,
      error: 'You have already started this month. Redraw is closed.',
    }, { status: 409 });
  }

  try {
    const inputs = await drawInputs(env, { personId: plan.person_id, month: plan.month, focusId: plan.focus_id });
    const rows = drawPlan({ ...inputs, projectTypeId: plan.project_type_id });
    await env.DB.batch([
      env.DB.prepare('DELETE FROM plan_tasks WHERE plan_id = ?').bind(id),
      ...rows.map((row) => insertTask(env, id, row)),
    ]);
  } catch (err) {
    if (err instanceof ShortPoolError) return shortPool(err);
    throw err;
  }

  return json({ ok: true, ...(await planPayload(env, id)) });
}

// Country any time, project type until week 4 starts being done, focus until the
// first check-off anywhere (§6). Three different gates because the three fields
// reach three different parts of the plan.
export async function apiPatchPlan(request, env, session, params) {
  const id = Number(params.id);
  const { plan, error } = await owned(env, session, id);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const payload = await planPayload(env, id);
  const statements = [];

  if (body.country_id !== undefined) {
    const country = await env.DB.prepare('SELECT id FROM countries WHERE id = ?')
      .bind(Number(body.country_id)).first();
    if (!country) return json({ ok: false, error: 'No such country.' }, { status: 400 });
    // Free, always. Tasks are country-agnostic, so changing it touches nothing
    // that was drawn — the property that lets a kid change countries mid-month.
    statements.push(env.DB.prepare('UPDATE month_plans SET country_id = ? WHERE id = ?')
      .bind(Number(body.country_id), id));
  }

  const focusId = body.focus_id === undefined ? plan.focus_id : Number(body.focus_id);
  const projectTypeId = body.project_type_id === undefined
    ? plan.project_type_id : Number(body.project_type_id);

  if (body.focus_id !== undefined && focusId !== plan.focus_id) {
    if (payload.locked) {
      return json({
        ok: false,
        error: 'You have already started this month. The focus is set.',
      }, { status: 409 });
    }
    const focus = await env.DB.prepare('SELECT id FROM focuses WHERE id = ? AND archived = 0')
      .bind(focusId).first();
    if (!focus) return json({ ok: false, error: 'No such focus.' }, { status: 400 });

    try {
      const inputs = await drawInputs(env, { personId: plan.person_id, month: plan.month, focusId });
      const rows = [...drawDeepWeek(2, inputs), ...drawDeepWeek(3, inputs)];
      statements.push(
        env.DB.prepare('UPDATE month_plans SET focus_id = ? WHERE id = ?').bind(focusId, id),
        env.DB.prepare('DELETE FROM plan_tasks WHERE plan_id = ? AND week_no IN (2, 3)').bind(id),
        ...rows.map((row) => insertTask(env, id, row)),
      );
    } catch (err) {
      if (err instanceof ShortPoolError) return shortPool(err);
      throw err;
    }
  }

  if (body.project_type_id !== undefined && projectTypeId !== plan.project_type_id) {
    if (payload.week4_locked) {
      return json({
        ok: false,
        error: 'Week 4 has already started. What you are making is set.',
      }, { status: 409 });
    }
    const project = await env.DB.prepare(
      'SELECT id FROM project_types WHERE id = ? AND archived = 0'
    ).bind(projectTypeId).first();
    if (!project) return json({ ok: false, error: 'No such project type.' }, { status: 400 });

    try {
      const templates = await env.DB.prepare(
        'SELECT id, week_theme, project_type_id, position FROM task_templates WHERE archived = 0'
      ).all();
      const rows = week4Rows(templates.results, projectTypeId);
      statements.push(
        env.DB.prepare('UPDATE month_plans SET project_type_id = ? WHERE id = ?').bind(projectTypeId, id),
        env.DB.prepare('DELETE FROM plan_tasks WHERE plan_id = ? AND week_no = 4').bind(id),
        ...rows.map((row) => insertTask(env, id, row)),
      );
    } catch (err) {
      if (err instanceof ShortPoolError) return shortPool(err);
      throw err;
    }
  }

  if (statements.length) await env.DB.batch(statements);
  return json({ ok: true, ...(await planPayload(env, id)) });
}
