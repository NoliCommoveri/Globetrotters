// /admin/api/people — the three names and inks, editable in a browser.
//
// Its own module rather than a section of api.js, and for the same reason
// lib/migrations.js takes its list as an argument: api.js imports the `.sql`
// text bundles, which exist only inside the Worker. Keeping these two handlers
// clear of that import is what lets them be tested against a real SQLite.

import { json } from '../lib/html.js';

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function apiPeople(request, env) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, color, sort_order, created_at FROM people ORDER BY sort_order, id'
  ).all();
  return json({ ok: true, people: results });
}

// Ink is a six-digit hex, normalized to uppercase on the way in. Three-digit
// shorthand is rejected rather than expanded: `people.color` is rendered into
// SVG and CSS in slices 06-07, and one canonical form there is worth one
// rejection here.
const HEX = /^#[0-9a-fA-F]{6}$/;

// A name is what a kid taps to say "that's me" and what the stamp is printed
// over. Blank breaks the picker; long breaks the stamp face.
const MAX_NAME = 24;

export async function apiPatchPerson(request, env, params) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: 'Bad id' }, { status: 400 });

  const body = await readJson(request);
  const fields = [];
  const values = [];

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return json({ ok: false, error: 'Name cannot be blank' }, { status: 400 });
    if (name.length > MAX_NAME) {
      return json({ ok: false, error: `Name is longer than ${MAX_NAME} characters` }, { status: 400 });
    }
    fields.push('name = ?');
    values.push(name);
  }

  if (body.color !== undefined) {
    const color = String(body.color).trim();
    if (!HEX.test(color)) {
      return json({ ok: false, error: 'Ink must be a six-digit hex like #5B2A86' }, { status: 400 });
    }
    fields.push('color = ?');
    values.push(color.toUpperCase());
  }

  if (body.sort_order !== undefined) {
    const order = Number(body.sort_order);
    if (!Number.isInteger(order)) {
      return json({ ok: false, error: 'Sort order must be a whole number' }, { status: 400 });
    }
    fields.push('sort_order = ?');
    values.push(order);
  }

  if (fields.length === 0) {
    return json({ ok: false, error: 'Nothing to change' }, { status: 400 });
  }

  const res = await env.DB.prepare(`UPDATE people SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values, id).run();
  if ((res.meta?.changes ?? 0) === 0) {
    return json({ ok: false, error: 'No such person' }, { status: 404 });
  }

  const person = await env.DB.prepare(
    'SELECT id, name, color, sort_order, created_at FROM people WHERE id = ?'
  ).bind(id).first();
  return json({ ok: true, person });
}
