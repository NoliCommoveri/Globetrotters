// /admin/api/project-types — name, materials, and the ordered week-4 sequence
// (DESIGN.md §12).
//
// Week 4 is not a draw. It is five rows in a fixed order — pick the artifact,
// gather, build, build, present — so the editor's one non-obvious control is
// the order itself, and it writes `position` on the task templates rather than
// anything on the project type.

import { json } from '../lib/html.js';
import { readJson } from '../lib/body.js';
import { Fields, slugify, uniqueSlug, nowIso } from './fields.js';

const MAX_NAME = 40;
const MAX_MATERIALS = 240;

const COLUMNS = 'id, slug, name, materials, archived, origin';

const load = (env, id) =>
  env.DB.prepare(`SELECT ${COLUMNS} FROM project_types WHERE id = ?`).bind(id).first();

export async function apiCreateProjectType(request, env) {
  const body = await readJson(request);
  const fields = new Fields(body)
    .text('name', 'name', 'Name', { max: MAX_NAME })
    .text('materials', 'materials', 'Materials', { max: MAX_MATERIALS, blank: true });

  if (!fields.has('name')) fields.fail('Name is required');
  if (fields.error) return json({ ok: false, error: fields.error }, { status: 400 });

  const name = fields.value('name');
  const slug = await uniqueSlug(env.DB, 'project_types', slugify(body.slug || name));
  const res = await env.DB.prepare(
    "INSERT INTO project_types (slug, name, materials, archived, origin) VALUES (?, ?, ?, 0, 'custom')"
  ).bind(slug, name, fields.value('materials') ?? null).run();

  // Offered by setup only once its week 4 is filled: a project type with an
  // empty sequence is a month that ends in five blank cards (§6), so a new one
  // is invisible to the kids until five templates point at it.
  return json({ ok: true, project_type: { ...await load(env, res.meta.last_row_id), week4_templates: 0 } },
    { status: 201 });
}

export async function apiPatchProjectType(request, env, params) {
  const id = Number(params.id);
  if (!(await load(env, id))) {
    return json({ ok: false, error: 'No such project type' }, { status: 404 });
  }

  const body = await readJson(request);
  const fields = new Fields(body)
    .text('name', 'name', 'Name', { max: MAX_NAME })
    .text('materials', 'materials', 'Materials', { max: MAX_MATERIALS, blank: true })
    .flag('archived', 'archived');
  if (fields.error) return json({ ok: false, error: fields.error }, { status: 400 });

  // The reorder arrives as the whole sequence in its new order, not as a pair
  // of swapped ids: two buttons pressed quickly on a slow connection can arrive
  // out of order, and a list is the one shape where the second arrival cannot
  // leave two tasks sharing position 3.
  let ordered = null;
  if (body.order !== undefined) {
    if (!Array.isArray(body.order)) {
      return json({ ok: false, error: 'order must be a list of task ids' }, { status: 400 });
    }
    const ids = body.order.map(Number);
    if (ids.some((n) => !Number.isInteger(n)) || new Set(ids).size !== ids.length) {
      return json({ ok: false, error: 'order must be distinct task ids' }, { status: 400 });
    }
    const { results } = await env.DB.prepare(
      'SELECT id FROM task_templates WHERE week_theme = 4 AND project_type_id = ?'
    ).bind(id).all();
    const mine = new Set(results.map((r) => r.id));
    if (ids.length !== mine.size || ids.some((n) => !mine.has(n))) {
      return json({ ok: false, error: 'order must name this project type\'s week 4 tasks, all of them' },
        { status: 400 });
    }
    ordered = ids;
  }

  if (fields.empty && !ordered) {
    return json({ ok: false, error: 'Nothing to change' }, { status: 400 });
  }

  const statements = [];
  if (!fields.empty) {
    statements.push(env.DB.prepare(`UPDATE project_types SET ${fields.columns.join(', ')} WHERE id = ?`)
      .bind(...fields.values, id));
  }
  if (ordered) {
    const at = nowIso();
    ordered.forEach((taskId, i) => {
      statements.push(env.DB.prepare(
        'UPDATE task_templates SET position = ?, updated_at = ? WHERE id = ?'
      ).bind(i + 1, at, taskId));
    });
  }
  await env.DB.batch(statements);

  const { results: sequence } = await env.DB.prepare(`
    SELECT id, title, position FROM task_templates
    WHERE week_theme = 4 AND project_type_id = ?
    ORDER BY position, id
  `).bind(id).all();

  return json({ ok: true, project_type: await load(env, id), sequence });
}
