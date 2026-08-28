// /admin/api/layouts — the worksheet layout editor's writes (DESIGN.md §12, §16).
//
// Twelve rows, edited by a parent, that decide what ninety printed segments
// look like. Editing one changes every task bound to it, which is the point of
// there being twelve rather than ninety.
//
// Every field is a named value the renderer reads and escapes. There is no
// markup field, here or anywhere, because this form is the one place a typed
// string reaches a printed page — so the spec is not stored as it arrives: it
// is read through the kind's own knobs, and a key that kind does not have is
// dropped rather than written.
//
// Nothing here deletes. `archived = 1` takes a layout out of use and every
// template bound to it falls back to ruled lines, which is a printable month
// rather than a hole.

import { json } from '../lib/html.js';
import { readJson } from '../lib/body.js';
import { Fields, slugify, uniqueSlug } from './fields.js';
import { KINDS, KIND_NAMES, readSpec } from '../lib/worksheet.js';

const MAX_NAME = 60;

const COLUMNS = 'id, slug, name, kind, height_thirds, spec, archived, origin';

const load = (env, id) =>
  env.DB.prepare(`SELECT ${COLUMNS} FROM worksheet_layouts WHERE id = ?`).bind(id).first();

// What the editor renders a form from: the knobs this kind has, and nothing
// else. Sent with the payload so the page and the server cannot disagree about
// which fields exist.
export const kindKnobs = () => Object.fromEntries(
  Object.entries(KINDS).map(([kind, schema]) => [kind, Object.fromEntries(
    Object.entries(schema).map(([key, read]) => [key, {
      type: read.type, min: read.min, max: read.max,
    }])
  )])
);

// The spec arrives as an object of knobs and is written as JSON. Reading it
// through the kind is what makes the round trip safe: unknown keys are dropped,
// out-of-range numbers fall to the kind's default, and what comes back out is
// the same fixed set of keys whatever went in.
function specFor(kind, raw) {
  if (raw === undefined) return undefined;
  if (raw !== null && typeof raw !== 'object' && typeof raw !== 'string') return null;
  return JSON.stringify(readSpec(kind, raw ?? {}));
}

export async function apiCreateLayout(request, env) {
  const body = await readJson(request);
  const fields = new Fields(body)
    .text('name', 'name', 'Name', { max: MAX_NAME })
    .oneOf('kind', 'kind', 'Kind', KIND_NAMES)
    .int('height_thirds', 'height_thirds', 'Height in thirds', { min: 1, max: 3 });

  for (const required of ['name', 'kind', 'height_thirds']) {
    if (!fields.has(required)) fields.fail(`${required.replace(/_/g, ' ')} is required`);
  }
  if (fields.error) return json({ ok: false, error: fields.error }, { status: 400 });

  const kind = fields.value('kind');
  const spec = specFor(kind, body.spec ?? {});
  if (spec === null) return json({ ok: false, error: 'Spec must be a set of named values.' }, { status: 400 });

  const name = fields.value('name');
  const slug = await uniqueSlug(env.DB, 'worksheet_layouts', slugify(body.slug || name));

  const res = await env.DB.prepare(`
    INSERT INTO worksheet_layouts (slug, name, kind, height_thirds, spec, archived, origin)
    VALUES (?, ?, ?, ?, ?, 0, 'custom')
  `).bind(slug, name, kind, fields.value('height_thirds'), spec).run();

  return json({ ok: true, layout: await load(env, res.meta.last_row_id) }, { status: 201 });
}

export async function apiPatchLayout(request, env, params) {
  const id = Number(params.id);
  const existing = await load(env, id);
  if (!existing) return json({ ok: false, error: 'No such layout' }, { status: 404 });

  const body = await readJson(request);
  const fields = new Fields(body)
    .text('name', 'name', 'Name', { max: MAX_NAME })
    .oneOf('kind', 'kind', 'Kind', KIND_NAMES)
    .int('height_thirds', 'height_thirds', 'Height in thirds', { min: 1, max: 3 })
    .flag('archived', 'archived');
  if (fields.error) return json({ ok: false, error: fields.error }, { status: 400 });

  // The kind decides which knobs the spec is allowed to carry, so it is
  // resolved against the row as it will be. Changing a kind rereads the spec
  // through the new one, which is what stops a `lines` count surviving a move
  // to `storyboard` as a key nothing reads.
  const kind = fields.value('kind') ?? existing.kind;
  const raw = body.spec !== undefined ? body.spec : (fields.has('kind') ? existing.spec : undefined);
  const spec = specFor(kind, raw);
  if (spec === null) return json({ ok: false, error: 'Spec must be a set of named values.' }, { status: 400 });
  if (spec !== undefined) fields.set('spec', spec);

  if (fields.empty) return json({ ok: false, error: 'Nothing to change' }, { status: 400 });

  await env.DB.prepare(`UPDATE worksheet_layouts SET ${fields.columns.join(', ')} WHERE id = ?`)
    .bind(...fields.values, id).run();

  return json({ ok: true, layout: await load(env, id) });
}
