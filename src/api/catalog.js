// GET /api/catalog — everything the country picker and the setup screen need,
// in one fetch: countries, hooks, focus affinities, focuses, project types
// (DESIGN.md §6).
//
// It is one request rather than five because setup is a screen a kid scrolls,
// and five round trips on a phone on house wifi is a screen that arrives in
// pieces. ~60KB is small enough to hold and large enough to want caching.
//
// Cached by ETag (Q-05). The body is hashed, the hash is the ETag, and a
// browser that already has it sends If-None-Match and gets a 304 with no body.
// The alternative — a version field the client compares itself — needs a second
// endpoint and a hand-rolled cache in localStorage to do what the browser
// already does. The cost is one ~200-byte revalidation per load, which is the
// price of the slice 08 editor being able to fix a wrong hook on a device that
// already loaded the old one.
//
// `no-cache` is not `no-store`: it means "cache it, but ask before reusing it".
// Without it the browser would never revalidate and the ETag would be dead
// weight.

import { checksum } from '../lib/sql.js';

export async function apiCatalog(request, env) {
  const [countries, focuses, projectTypes, hooks, affinities] = await Promise.all([
    env.DB.prepare(
      'SELECT id, name, iso3, continent, region, research_depth FROM countries ORDER BY name'
    ).all(),
    env.DB.prepare(
      'SELECT id, slug, name, blurb FROM focuses WHERE archived = 0 ORDER BY id'
    ).all(),
    // week4_templates is what setup hides an unfilled project type on. Seed v0
    // fills trifold-board only, and a project type whose week 4 is empty is a
    // month that ends in five blank cards.
    env.DB.prepare(`
      SELECT project_types.id, project_types.slug, project_types.name, project_types.materials,
             COUNT(task_templates.id) AS week4_templates
      FROM project_types
      LEFT JOIN task_templates
        ON task_templates.project_type_id = project_types.id
       AND task_templates.week_theme = 4
       AND task_templates.archived = 0
      WHERE project_types.archived = 0
      GROUP BY project_types.id
      ORDER BY project_types.id
    `).all(),
    env.DB.prepare(
      'SELECT country_id, text, position FROM country_hooks ORDER BY country_id, position'
    ).all(),
    env.DB.prepare(
      'SELECT country_id, focus_id, score, reason FROM country_focus_affinity ORDER BY country_id'
    ).all(),
  ]);

  // Flat arrays keyed by country_id rather than hooks nested inside each
  // country: the client indexes them once, and 195 countries with two empty
  // arrays each is several KB of nothing.
  const body = JSON.stringify({
    // `ok` on every family payload, this one included. The client's one fetch
    // wrapper reads it as the success flag, and a route that omits it is a route
    // that reads as a failure with a 200 on it.
    ok: true,
    countries: countries.results,
    focuses: focuses.results,
    project_types: projectTypes.results,
    hooks: hooks.results,
    affinities: affinities.results,
  });

  const etag = `"${(await checksum(body)).slice(0, 16)}"`;
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-cache',
    etag,
  };

  // If-None-Match may carry a list, and a proxy may have made the tag weak.
  const ifNoneMatch = request.headers.get('if-none-match') || '';
  const matched = ifNoneMatch
    .split(',')
    .map((t) => t.trim().replace(/^W\//, ''))
    .includes(etag);
  if (matched) return new Response(null, { status: 304, headers });

  return new Response(body, { status: 200, headers });
}
