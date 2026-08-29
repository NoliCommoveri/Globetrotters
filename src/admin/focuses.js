// /admin/api/focuses — the focus editor and the tag grid (DESIGN.md §12).
//
// A focus's opinion is a set of weighted topic tags, not a list of prompts. The
// grid is fifty tags against a 0-3 weight rather than 153 prompts, which is a
// smaller and a more honest screen: it says what a focus is about, and every
// prompt written afterwards is drawn correctly the moment it is tagged.
//
// A bulk PUT rather than a row at a time, for the same reason the grid is one
// screen: tuning a focus is moving four or five tags at once and looking at
// what it did, and one request per cell would make that a round trip a click.
//
// It writes sparsely. A missing row is no opinion, so a cell left at 0 stores
// nothing and a cell moved back to 0 deletes the row it had.

import { json } from '../lib/html.js';
import { readJson } from '../lib/body.js';
import { Fields, slugify, uniqueSlug } from './fields.js';

const MAX_NAME = 40;
const MAX_BLURB = 160;

const COLUMNS = 'id, slug, name, blurb, archived, origin';

const load = (env, id) =>
  env.DB.prepare(`SELECT ${COLUMNS} FROM focuses WHERE id = ?`).bind(id).first();

export const NO_REACH = { week2: 0, week3: 0 };

// How many drawable weeks 2-3 prompts this focus lifts above baseline, split by
// the prompt's natural half. Not "on-theme", which is a hand audit nothing here
// can compute — this is every prompt sharing a tag the focus weights, a single
// weight-1 tag included.
//
// The split is worth showing even though the draw ignores it: the deal has to
// put four prompts in each week, and a focus that reaches twelve prompts on one
// side and one on the other is the content gap the merged pool exists to
// survive rather than to hide (LIBRARY_v3.md §3).
export async function reachCounts(db) {
  const { results } = await db.prepare(`
    SELECT focus_tags.focus_id, task_templates.week_theme AS week,
           COUNT(DISTINCT task_templates.id) AS n
    FROM focus_tags
    JOIN prompt_tags
      ON prompt_tags.tag = focus_tags.tag AND prompt_tags.namespace = 'topic'
    JOIN task_templates
      ON task_templates.id = prompt_tags.task_template_id
     AND task_templates.week_theme IN (2, 3)
     AND task_templates.tier != 'fixed'
     AND task_templates.archived = 0
    GROUP BY focus_tags.focus_id, task_templates.week_theme
  `).all();

  const reach = new Map();
  for (const row of results) {
    const found = reach.get(row.focus_id) || { ...NO_REACH };
    found[`week${row.week}`] = Number(row.n);
    reach.set(row.focus_id, found);
  }
  return reach;
}

// Zero, and only zero. There is no weight-0 any more — `fw` floors at 1, so
// every prompt is reachable by every focus and no amount of tuning can shrink
// the pool the draw takes eight from. What is left to warn about is a focus
// whose tags match no prompt at all: it is valid, it draws, and it draws
// exactly what picking nothing would.
export const thin = (reach) => reach.week2 + reach.week3 === 0;

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

  // A focus is valid the moment it exists: zero tag rows means every prompt is
  // at the baseline 1 and the draw works. The warning is advice about the shape
  // of the month, not a gate on saving.
  const focus = await load(env, res.meta.last_row_id);
  const reach = (await reachCounts(env.DB)).get(focus.id) || { ...NO_REACH };
  return json({ ok: true, focus: { ...focus, reach, thin: thin(reach) } }, { status: 201 });
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

// The four states a cell cycles through. 0 is no opinion and stores no row; 1,
// 2 and 3 are the weights `fw = 1 + 2 * SUM(weight)` sums (§4). There is no
// exclusion any more, which is the point: a focus says what it is about and
// never what the library may not offer.
const ALLOWED = [0, 1, 2, 3];

// A tag is lowercase letters, digits and hyphens, and the grid can mint one the
// library has never seen — that is what makes a new tag reachable without a
// deploy. Bounded and shaped, because the value is a join key and it will
// appear on a page.
const TAG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_TAG = 40;
const MAX_TAGS = 200;

// PUT, not PATCH: the body is the whole of this focus's tag set and what is
// absent from it is absent from the table. That is what makes the grid's save
// idempotent — press it twice and the second press writes the same rows.
export async function apiPutFocusTags(request, env, params) {
  const id = Number(params.id);
  if (!(await load(env, id))) return json({ ok: false, error: 'No such focus' }, { status: 404 });

  const body = await readJson(request);
  const cells = Array.isArray(body.tags) ? body.tags : null;
  if (!cells) return json({ ok: false, error: 'tags must be a list' }, { status: 400 });
  if (cells.length > MAX_TAGS) {
    return json({ ok: false, error: `That is more than ${MAX_TAGS} tags` }, { status: 400 });
  }

  const keep = new Map();
  for (const cell of cells) {
    const tag = String(cell?.tag ?? '').trim().toLowerCase();
    const weight = Number(cell?.weight);
    if (!TAG.test(tag) || tag.length > MAX_TAG) {
      return json({ ok: false, error: 'A tag is lowercase words joined by hyphens' }, { status: 400 });
    }
    if (!ALLOWED.includes(weight)) {
      return json({ ok: false, error: `Weight must be one of ${ALLOWED.join(', ')}` }, { status: 400 });
    }
    keep.set(tag, weight);
  }

  // One batch, so a half-written grid is not a state the editor can leave
  // behind. Weight-0 cells are deleted rather than stored: the row and its
  // absence mean the same thing, and storing it would grow the table by the
  // size of the grid every time somebody opened it.
  const statements = [];
  for (const [tag, weight] of keep) {
    statements.push(weight === 0
      ? env.DB.prepare('DELETE FROM focus_tags WHERE focus_id = ? AND tag = ?').bind(id, tag)
      : env.DB.prepare(`
          INSERT INTO focus_tags (focus_id, tag, weight) VALUES (?, ?, ?)
          ON CONFLICT (focus_id, tag) DO UPDATE SET weight = excluded.weight
        `).bind(id, tag, weight));
  }
  if (statements.length) await env.DB.batch(statements);

  const { results } = await env.DB.prepare(
    'SELECT tag, weight FROM focus_tags WHERE focus_id = ? ORDER BY tag'
  ).bind(id).all();
  const reach = (await reachCounts(env.DB)).get(id) || { ...NO_REACH };

  return json({ ok: true, focus_id: id, tags: results, reach, thin: thin(reach) });
}
