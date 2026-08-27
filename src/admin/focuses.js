// /admin/api/focuses — the focus editor and the weight grid (DESIGN.md §12).
//
// The grid is the reason this route exists as a bulk PUT rather than a row at a
// time: six focuses against twenty-six week 2-3 tasks is 156 cells today and
// several hundred after slice 09, and saving one cell per request would make
// tuning a focus a hundred round trips.
//
// It writes sparsely. A missing row means weight 1 (§5), so a cell left at 1
// stores nothing and a cell moved back to 1 deletes the row it had. Only
// opinions are stored, which is what keeps the table readable and the seed
// small.

import { json } from '../lib/html.js';
import { readJson } from '../lib/body.js';
import { Fields, slugify, uniqueSlug } from './fields.js';

const MAX_NAME = 40;
const MAX_BLURB = 160;

// The draw takes five tasks from each of weeks 2 and 3. Five out of thirteen is
// the same five months running; fifteen is the point where a focus stops
// feeling like one deck. Checked per week, because a focus rich in week 2 and
// bare in week 3 draws just as badly as one bare in both.
export const POOL_FLOOR = 15;

const COLUMNS = 'id, slug, name, blurb, archived, origin';

const load = (env, id) =>
  env.DB.prepare(`SELECT ${COLUMNS} FROM focuses WHERE id = ?`).bind(id).first();

// Effective weight, not stored weight: COALESCE(weight, 1) is the sparse rule
// written out, and it is why a focus with no rows at all counts every task.
export async function poolCounts(db) {
  const { results } = await db.prepare(`
    SELECT focuses.id AS focus_id, task_templates.week_theme AS week, COUNT(*) AS n
    FROM focuses
    JOIN task_templates
      ON task_templates.week_theme IN (2, 3) AND task_templates.archived = 0
    LEFT JOIN task_focus_weights
      ON task_focus_weights.task_template_id = task_templates.id
     AND task_focus_weights.focus_id = focuses.id
    WHERE COALESCE(task_focus_weights.weight, 1) >= 1
    GROUP BY focuses.id, task_templates.week_theme
  `).all();

  const pools = new Map();
  for (const row of results) {
    const pool = pools.get(row.focus_id) || { week2: 0, week3: 0 };
    pool[`week${row.week}`] = Number(row.n);
    pools.set(row.focus_id, pool);
  }
  return pools;
}

export const thin = (pool) => pool.week2 < POOL_FLOOR || pool.week3 < POOL_FLOOR;

export async function apiCreateFocus(request, env) {
  const body = await readJson(request);
  const fields = new Fields(body)
    .text('name', 'name', 'Name', { max: MAX_NAME })
    .text('blurb', 'blurb', 'Blurb', { max: MAX_BLURB, blank: true });

  if (!fields.has('name')) fields.fail('Name is required');
  if (fields.error) return json({ ok: false, error: fields.error }, { status: 400 });

  const name = fields.value('name');
  const slug = await uniqueSlug(env.DB, 'focuses', slugify(body.slug || name));

  const res = await env.DB.prepare(
    "INSERT INTO focuses (slug, name, blurb, archived, origin) VALUES (?, ?, ?, 0, 'custom')"
  ).bind(slug, name, fields.value('blurb') ?? null).run();

  // A focus is valid the moment it exists: zero weight rows means every task is
  // at 1 and the draw works. The warning is advice about the shape of the
  // month, not a gate on saving.
  const focus = await load(env, res.meta.last_row_id);
  const pool = (await poolCounts(env.DB)).get(focus.id) || { week2: 0, week3: 0 };
  return json({ ok: true, focus: { ...focus, pool, thin: thin(pool) } }, { status: 201 });
}

export async function apiPatchFocus(request, env, params) {
  const id = Number(params.id);
  if (!(await load(env, id))) return json({ ok: false, error: 'No such focus' }, { status: 404 });

  const fields = new Fields(await readJson(request))
    .text('name', 'name', 'Name', { max: MAX_NAME })
    .text('blurb', 'blurb', 'Blurb', { max: MAX_BLURB, blank: true })
    .flag('archived', 'archived');

  if (fields.error) return json({ ok: false, error: fields.error }, { status: 400 });
  if (fields.empty) return json({ ok: false, error: 'Nothing to change' }, { status: 400 });

  await env.DB.prepare(`UPDATE focuses SET ${fields.columns.join(', ')} WHERE id = ?`)
    .bind(...fields.values, id).run();
  return json({ ok: true, focus: await load(env, id) });
}

// The three states a cell cycles through. 0 excludes the task from this focus
// outright, 1 is no opinion, 3 favors it — the same three the draw's score()
// reads (§4).
const ALLOWED = [0, 1, 3];

// PUT, not PATCH: the body is the whole of this focus's column and what is
// absent from it is absent from the table. That is what makes the grid's save
// idempotent — press it twice and the second press writes the same rows.
export async function apiPutFocusWeights(request, env, params) {
  const id = Number(params.id);
  if (!(await load(env, id))) return json({ ok: false, error: 'No such focus' }, { status: 404 });

  const body = await readJson(request);
  const cells = Array.isArray(body.weights) ? body.weights : null;
  if (!cells) return json({ ok: false, error: 'weights must be a list' }, { status: 400 });

  const keep = new Map();
  for (const cell of cells) {
    const taskId = Number(cell?.task_template_id);
    const weight = Number(cell?.weight);
    if (!Number.isInteger(taskId)) {
      return json({ ok: false, error: 'Every cell needs a task_template_id' }, { status: 400 });
    }
    if (!ALLOWED.includes(weight)) {
      return json({ ok: false, error: `Weight must be one of ${ALLOWED.join(', ')}` }, { status: 400 });
    }
    keep.set(taskId, weight);
  }

  if (keep.size) {
    const ids = [...keep.keys()];
    const { results: known } = await env.DB.prepare(
      `SELECT id FROM task_templates WHERE id IN (${ids.map(() => '?').join(', ')})`
    ).bind(...ids).all();
    if (known.length !== ids.length) {
      return json({ ok: false, error: 'A cell names a task that does not exist' }, { status: 400 });
    }
  }

  // One batch, so a half-written grid is not a state the editor can leave
  // behind. Weight-1 cells are deleted rather than stored: the row and its
  // absence mean the same thing, and storing it would grow the table by the
  // size of the grid every time somebody opened it.
  const statements = [];
  for (const [taskId, weight] of keep) {
    statements.push(weight === 1
      ? env.DB.prepare(
          'DELETE FROM task_focus_weights WHERE focus_id = ? AND task_template_id = ?'
        ).bind(id, taskId)
      : env.DB.prepare(`
          INSERT INTO task_focus_weights (task_template_id, focus_id, weight)
          VALUES (?, ?, ?)
          ON CONFLICT (task_template_id, focus_id) DO UPDATE SET weight = excluded.weight
        `).bind(taskId, id, weight));
  }
  if (statements.length) await env.DB.batch(statements);

  const { results } = await env.DB.prepare(
    'SELECT task_template_id, weight FROM task_focus_weights WHERE focus_id = ? ORDER BY task_template_id'
  ).bind(id).all();
  const pool = (await poolCounts(env.DB)).get(id) || { week2: 0, week3: 0 };

  return json({ ok: true, focus_id: id, weights: results, pool, thin: thin(pool) });
}
