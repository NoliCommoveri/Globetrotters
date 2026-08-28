// /admin/api/tasks — the task list's writes (DESIGN.md §12).
//
// Edits propagate live. `plan_tasks` joins to `task_templates` rather than
// copying text, so a typo fixed here is fixed inside every active month. That
// is the desired behavior; rewriting a task into a different task mid-month is
// not, and the answer to that is archive-and-create, not an edit.
//
// Nothing here deletes. `archived = 1` removes a template from future draws and
// leaves every `plan_tasks` row that already points at it exactly where it is.

import { json } from '../lib/html.js';
import { readJson } from '../lib/body.js';
import { Fields, slugify, uniqueSlug, nowIso } from './fields.js';
import { pickSpec } from '../lib/worksheet.js';

const TIERS = ['core', 'focus', 'wild'];
const MAX_TITLE = 80;
const MAX_PROMPT = 600;
const MAX_PAGE = 32;

const COLUMNS = `id, slug, title, prompt, week_theme, workbook_page, tier,
                 project_type_id, position, archived, origin, updated_at,
                 worksheet_layout_id, worksheet_spec`;

const load = (env, id) =>
  env.DB.prepare(`SELECT ${COLUMNS} FROM task_templates WHERE id = ?`).bind(id).first();

// Week 4 is a sequence belonging to one project type, and weeks 1-3 are draws
// that belong to none. A row that gets this wrong is invisible until a draw
// throws ShortPoolError a month later, so it is refused at the edit.
async function checkProjectType(env, week, projectTypeId) {
  if (week === 4) {
    if (!Number.isInteger(projectTypeId)) {
      return 'A week 4 task belongs to a project type. Pick one.';
    }
    const row = await env.DB.prepare('SELECT id FROM project_types WHERE id = ?')
      .bind(projectTypeId).first();
    if (!row) return 'No such project type';
    return null;
  }
  if (projectTypeId != null) {
    return 'Only week 4 tasks belong to a project type.';
  }
  return null;
}

// The printed segment (§16). The layout is what form the task prints under; the
// spec is that layout's own knobs, overridden for this one task and read
// through the layout's kind so a key it does not have never reaches a page.
//
// Both are nullable and both clear on null: a task with no layout prints its
// prompt over ruled lines, which is a complete page and not a missing one.
async function readWorksheet(env, body, fields, existingLayoutId) {
  let layoutId = existingLayoutId ?? null;
  let kind = null;

  if (body.worksheet_layout_id !== undefined) {
    layoutId = body.worksheet_layout_id == null || body.worksheet_layout_id === ''
      ? null : Number(body.worksheet_layout_id);
    if (layoutId !== null && !Number.isInteger(layoutId)) return 'That is not a layout.';
    fields.set('worksheet_layout_id', layoutId);
  }

  if (layoutId !== null) {
    const layout = await env.DB.prepare('SELECT id, kind FROM worksheet_layouts WHERE id = ?')
      .bind(layoutId).first();
    if (!layout) return 'No such worksheet layout';
    kind = layout.kind;
  }

  if (body.worksheet_spec !== undefined) {
    const raw = body.worksheet_spec;
    if (raw == null || raw === '') {
      fields.set('worksheet_spec', null);
    } else if (!kind) {
      return 'Give the task a layout before overriding its fields.';
    } else if (typeof raw !== 'object' && typeof raw !== 'string') {
      return 'Worksheet fields must be a set of named values.';
    } else {
      fields.set('worksheet_spec', JSON.stringify(pickSpec(kind, raw)));
    }
  }

  return null;
}

function readShared(body) {
  return new Fields(body)
    .text('title', 'title', 'Title', { max: MAX_TITLE })
    .text('prompt', 'prompt', 'Prompt', { max: MAX_PROMPT })
    .int('week_theme', 'week_theme', 'Week', { min: 1, max: 4 })
    .oneOf('tier', 'tier', 'Tier', TIERS)
    .text('workbook_page', 'workbook_page', 'Workbook page', { max: MAX_PAGE, blank: true })
    .int('position', 'position', 'Position', { min: 1, max: 99 });
}

// A new task is always `origin = 'custom'`. Origin is not a field the form
// offers: a row typed in here did not come from a seed file, and claiming
// otherwise would make the next Run seed's "0 new" report a lie.
export async function apiCreateTask(request, env) {
  const body = await readJson(request);
  const fields = readShared(body);

  for (const required of ['title', 'prompt', 'week_theme', 'tier']) {
    if (!fields.has(required)) fields.fail(`${required.replace('_', ' ')} is required`);
  }
  if (fields.error) return json({ ok: false, error: fields.error }, { status: 400 });

  const projectTypeId = body.project_type_id == null ? null : Number(body.project_type_id);
  const problem = await checkProjectType(env, fields.value('week_theme'), projectTypeId);
  if (problem) return json({ ok: false, error: problem }, { status: 400 });

  const worksheet = await readWorksheet(env, body, fields, null);
  if (worksheet) return json({ ok: false, error: worksheet }, { status: 400 });

  const title = fields.value('title');
  const slug = await uniqueSlug(env.DB, 'task_templates', slugify(body.slug || title));

  const res = await env.DB.prepare(`
    INSERT INTO task_templates
      (slug, title, prompt, week_theme, workbook_page, tier, project_type_id,
       position, archived, origin, updated_at, worksheet_layout_id, worksheet_spec)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'custom', ?, ?, ?)
  `).bind(
    slug, title, fields.value('prompt'), fields.value('week_theme'),
    fields.value('workbook_page') ?? null, fields.value('tier'),
    projectTypeId, fields.value('position') ?? null, nowIso(),
    fields.value('worksheet_layout_id') ?? null, fields.value('worksheet_spec') ?? null,
  ).run();

  return json({ ok: true, task: await load(env, res.meta.last_row_id) }, { status: 201 });
}

export async function apiPatchTask(request, env, params) {
  const id = Number(params.id);
  const existing = await load(env, id);
  if (!existing) return json({ ok: false, error: 'No such task' }, { status: 404 });

  const body = await readJson(request);
  const fields = readShared(body).flag('archived', 'archived');
  if (fields.error) return json({ ok: false, error: fields.error }, { status: 400 });

  // Week and project type constrain each other, so both are resolved against
  // the row as it will be, not as it is.
  const week = fields.value('week_theme') ?? existing.week_theme;
  let projectTypeId = existing.project_type_id;
  if (body.project_type_id !== undefined) {
    projectTypeId = body.project_type_id == null ? null : Number(body.project_type_id);
    fields.set('project_type_id', projectTypeId);
  } else if (fields.has('week_theme') && week !== 4 && existing.project_type_id != null) {
    // Moving a week-4 task off week 4 takes its project type with it, rather
    // than leaving a row the sequence still counts.
    projectTypeId = null;
    fields.set('project_type_id', null);
  }

  const problem = await checkProjectType(env, week, projectTypeId);
  if (problem) return json({ ok: false, error: problem }, { status: 400 });

  const worksheet = await readWorksheet(env, body, fields, existing.worksheet_layout_id);
  if (worksheet) return json({ ok: false, error: worksheet }, { status: 400 });

  if (fields.empty) return json({ ok: false, error: 'Nothing to change' }, { status: 400 });

  fields.set('updated_at', nowIso());
  await env.DB.prepare(`UPDATE task_templates SET ${fields.columns.join(', ')} WHERE id = ?`)
    .bind(...fields.values, id).run();

  return json({ ok: true, task: await load(env, id) });
}
