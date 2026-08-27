// /admin/api/countries — hooks and focus affinities, per country (DESIGN.md §12).
//
// This is the spot-check surface for slice 09's generated content. A hook is a
// lead, not a fact (§9), and generated leads are wrong often enough that fixing
// one has to be a tap.
//
// Hooks are the one thing in the library that can be deleted, and the archive
// rule is the reason why: `archived = 1` exists because `plan_tasks` and
// `month_plans` reference templates, focuses and project types, and a hard
// delete would break a month already in progress. Nothing references a hook. A
// junk hook with no replacement to type over it has nowhere else to go.

import { json } from '../lib/html.js';
import { readJson } from '../lib/body.js';
import { Fields } from './fields.js';

const MAX_HOOK = 200;
const MAX_REASON = 120;

const country = (env, id) =>
  env.DB.prepare('SELECT id, name, iso3 FROM countries WHERE id = ?').bind(id).first();

const hooksOf = (env, countryId) =>
  env.DB.prepare(
    'SELECT id, country_id, text, position, origin FROM country_hooks WHERE country_id = ? ORDER BY position, id'
  ).bind(countryId).all();

const affinitiesOf = (env, countryId) =>
  env.DB.prepare(
    'SELECT country_id, focus_id, score, reason FROM country_focus_affinity WHERE country_id = ? ORDER BY focus_id'
  ).bind(countryId).all();

export async function apiCountry(request, env, params) {
  const id = Number(params.id);
  const row = await country(env, id);
  if (!row) return json({ ok: false, error: 'No such country' }, { status: 404 });

  const [hooks, affinities] = await Promise.all([hooksOf(env, id), affinitiesOf(env, id)]);
  return json({ ok: true, country: row, hooks: hooks.results, affinities: affinities.results });
}

// Appended at the end. Position is a display order, not a key, and a new hook
// belongs after the ones already checked rather than in the middle of them.
export async function apiCreateHook(request, env, params) {
  const id = Number(params.id);
  if (!(await country(env, id))) {
    return json({ ok: false, error: 'No such country' }, { status: 404 });
  }

  const fields = new Fields(await readJson(request)).text('text', 'text', 'Hook', { max: MAX_HOOK });
  if (!fields.has('text')) fields.fail('Hook is required');
  if (fields.error) return json({ ok: false, error: fields.error }, { status: 400 });

  const last = await env.DB.prepare(
    'SELECT MAX(position) AS p FROM country_hooks WHERE country_id = ?'
  ).bind(id).first();

  await env.DB.prepare(
    "INSERT INTO country_hooks (country_id, text, position, origin) VALUES (?, ?, ?, 'custom')"
  ).bind(id, fields.value('text'), Number(last?.p ?? 0) + 1).run();

  return json({ ok: true, hooks: (await hooksOf(env, id)).results }, { status: 201 });
}

export async function apiPatchHook(request, env, params) {
  const id = Number(params.id);
  const hook = await env.DB.prepare('SELECT id, country_id FROM country_hooks WHERE id = ?')
    .bind(id).first();
  if (!hook) return json({ ok: false, error: 'No such hook' }, { status: 404 });

  const fields = new Fields(await readJson(request))
    .text('text', 'text', 'Hook', { max: MAX_HOOK })
    .int('position', 'position', 'Position', { min: 0, max: 99 });
  if (fields.error) return json({ ok: false, error: fields.error }, { status: 400 });
  if (fields.empty) return json({ ok: false, error: 'Nothing to change' }, { status: 400 });

  await env.DB.prepare(`UPDATE country_hooks SET ${fields.columns.join(', ')} WHERE id = ?`)
    .bind(...fields.values, id).run();

  return json({ ok: true, hooks: (await hooksOf(env, hook.country_id)).results });
}

export async function apiDeleteHook(request, env, params) {
  const id = Number(params.id);
  const hook = await env.DB.prepare('SELECT id, country_id FROM country_hooks WHERE id = ?')
    .bind(id).first();
  if (!hook) return json({ ok: false, error: 'No such hook' }, { status: 404 });

  await env.DB.prepare('DELETE FROM country_hooks WHERE id = ?').bind(id).run();
  return json({ ok: true, hooks: (await hooksOf(env, hook.country_id)).results });
}

// Affinities are the whole set for one country, same shape as the weight grid
// and for the same reason: a country has six cells, each of them off, 2 or 3,
// and a save is one press. Off stores no row — `score` is CHECK (2, 3) and an
// absent row is the third state.
export async function apiPutAffinities(request, env, params) {
  const id = Number(params.id);
  if (!(await country(env, id))) {
    return json({ ok: false, error: 'No such country' }, { status: 404 });
  }

  const body = await readJson(request);
  const rows = Array.isArray(body.affinities) ? body.affinities : null;
  if (!rows) return json({ ok: false, error: 'affinities must be a list' }, { status: 400 });

  const { results: focuses } = await env.DB.prepare('SELECT id FROM focuses').all();
  const known = new Set(focuses.map((f) => f.id));

  const keep = new Map();
  for (const row of rows) {
    const focusId = Number(row?.focus_id);
    if (!known.has(focusId)) {
      return json({ ok: false, error: 'A cell names a focus that does not exist' }, { status: 400 });
    }
    const score = row?.score == null || row.score === 0 || row.score === '0' ? null : Number(row.score);
    if (score !== null && score !== 2 && score !== 3) {
      return json({ ok: false, error: 'Affinity must be off, 2 or 3' }, { status: 400 });
    }
    const reason = String(row?.reason ?? '').trim();
    if (reason.length > MAX_REASON) {
      return json({ ok: false, error: `Reason is longer than ${MAX_REASON} characters` }, { status: 400 });
    }
    keep.set(focusId, score === null ? null : { score, reason: reason || null });
  }

  const statements = [];
  for (const [focusId, cell] of keep) {
    statements.push(cell === null
      ? env.DB.prepare(
          'DELETE FROM country_focus_affinity WHERE country_id = ? AND focus_id = ?'
        ).bind(id, focusId)
      : env.DB.prepare(`
          INSERT INTO country_focus_affinity (country_id, focus_id, score, reason)
          VALUES (?, ?, ?, ?)
          ON CONFLICT (country_id, focus_id)
          DO UPDATE SET score = excluded.score, reason = excluded.reason
        `).bind(id, focusId, cell.score, cell.reason));
  }
  if (statements.length) await env.DB.batch(statements);

  return json({ ok: true, affinities: (await affinitiesOf(env, id)).results });
}
