// GET /admin/api/library — everything the editor page renders, in one fetch.
// GET/POST /admin/api/library.json — the backup, out and back in.
//
// The read route carries draw counts, which is the column that makes the task
// list worth opening: a template drawn nine times and one drawn never look
// identical in a seed file and completely different after a term.
//
// Countries arrive as a list with counts rather than with their hooks nested.
// 195 countries with hooks would be most of the payload, the country editor
// works one country at a time, and /admin/api/countries/:id already answers
// exactly that.

import { json } from '../lib/html.js';
import { readJson } from '../lib/body.js';
import { reachCounts, thin, NO_REACH } from './focuses.js';
import { kindKnobs } from './layouts.js';
import { KIND_NAMES, readSpec, pickSpec } from '../lib/worksheet.js';

export async function apiLibrary(request, env) {
  const [people, focuses, projectTypes, tasks, focusTags, promptTags,
         draws, countries, layouts] = await Promise.all([
    env.DB.prepare('SELECT id, name, color FROM people ORDER BY sort_order, id').all(),
    env.DB.prepare('SELECT id, slug, name, blurb, archived, origin FROM focuses ORDER BY id').all(),
    env.DB.prepare(`
      SELECT project_types.id, project_types.slug, project_types.name,
             project_types.materials, project_types.archived, project_types.origin,
             COUNT(task_templates.id) AS week4_templates
      FROM project_types
      LEFT JOIN task_templates
        ON task_templates.project_type_id = project_types.id
       AND task_templates.week_theme = 4
       AND task_templates.archived = 0
      GROUP BY project_types.id
      ORDER BY project_types.id
    `).all(),
    env.DB.prepare(`
      SELECT id, slug, title, prompt, week_theme, workbook_page, tier,
             project_type_id, position, archived, origin, updated_at,
             worksheet_layout_id, worksheet_spec
      FROM task_templates
      ORDER BY week_theme, project_type_id, position, id
    `).all(),
    env.DB.prepare('SELECT focus_id, tag, weight FROM focus_tags ORDER BY focus_id, tag').all(),
    // Every tag on every prompt, both namespaces. The focus grid needs the
    // topic vocabulary the library actually uses — a tag no prompt carries is
    // a weight on nothing — and the task list shows a prompt's own tags beside
    // it, which is the only place a mistyped tag is visible.
    env.DB.prepare(
      'SELECT task_template_id, namespace, tag FROM prompt_tags ORDER BY task_template_id, namespace, tag'
    ).all(),
    // By whom, not just how many: a task every kid has had is dead weight in a
    // way a task one kid drew twice is not.
    env.DB.prepare(`
      SELECT plan_tasks.task_template_id, month_plans.person_id, COUNT(*) AS n
      FROM plan_tasks
      JOIN month_plans ON month_plans.id = plan_tasks.plan_id
      GROUP BY plan_tasks.task_template_id, month_plans.person_id
    `).all(),
    env.DB.prepare(`
      SELECT countries.id, countries.name, countries.iso3, countries.continent,
             (SELECT COUNT(*) FROM country_hooks WHERE country_hooks.country_id = countries.id)
               AS hooks,
             (SELECT COUNT(*) FROM country_focus_affinity
               WHERE country_focus_affinity.country_id = countries.id) AS affinities
      FROM countries ORDER BY countries.name
    `).all(),
    // The bound count is the column that makes this tab worth opening: editing
    // a layout changes every task under it, and how many that is decides
    // whether a change is a nudge or a rewrite of the binder (§12).
    env.DB.prepare(`
      SELECT worksheet_layouts.id, worksheet_layouts.slug, worksheet_layouts.name,
             worksheet_layouts.kind, worksheet_layouts.height_thirds,
             worksheet_layouts.spec, worksheet_layouts.archived, worksheet_layouts.origin,
             COUNT(task_templates.id) AS bound
      FROM worksheet_layouts
      LEFT JOIN task_templates
        ON task_templates.worksheet_layout_id = worksheet_layouts.id
       AND task_templates.archived = 0
      GROUP BY worksheet_layouts.id
      ORDER BY worksheet_layouts.id
    `).all(),
  ]);

  const reaches = await reachCounts(env.DB);

  return json({
    ok: true,
    people: people.results,
    focuses: focuses.results.map((f) => {
      const reach = reaches.get(f.id) || { ...NO_REACH };
      return { ...f, reach, thin: thin(reach) };
    }),
    project_types: projectTypes.results,
    tasks: tasks.results,
    focus_tags: focusTags.results,
    prompt_tags: promptTags.results,
    draws: draws.results,
    countries: countries.results,
    layouts: layouts.results,
    // Which knobs each kind has. Sent with the payload so the form the editor
    // draws and the keys the server keeps cannot drift (§16).
    kind_knobs: kindKnobs(),
  });
}

// ---------------------------------------------------------------------------
// Export and import.
//
// Keyed by slug and ISO3 throughout, never by id. Ids are what an autoincrement
// happened to hand out; a library carried into next school year has to land in
// a database whose numbering nobody controls, and the seed already joins on
// slugs for exactly this reason (§13).
// ---------------------------------------------------------------------------

// 2 since the weights table became two tag tables. A version 1 file carries a
// `weights` list this build has nowhere to put, and importing it silently would
// restore a library with no focus opinions in it at all — so the version check
// refuses it and says which version this build reads.
export const EXPORT_VERSION = 2;

export async function libraryExport(db) {
  const [focuses, projectTypes, tasks, focusTags, promptTags,
         hooks, affinities, layouts] = await Promise.all([
    db.prepare('SELECT slug, name, blurb, archived, origin FROM focuses ORDER BY slug').all(),
    db.prepare('SELECT slug, name, materials, archived, origin FROM project_types ORDER BY slug').all(),
    db.prepare(`
      SELECT t.slug, t.title, t.prompt, t.week_theme, t.workbook_page, t.tier,
             p.slug AS project_type, t.position, t.archived, t.origin,
             w.slug AS worksheet_layout, t.worksheet_spec
      FROM task_templates t
      LEFT JOIN project_types p ON p.id = t.project_type_id
      LEFT JOIN worksheet_layouts w ON w.id = t.worksheet_layout_id
      ORDER BY t.slug
    `).all(),
    db.prepare(`
      SELECT f.slug AS focus, ft.tag, ft.weight
      FROM focus_tags ft JOIN focuses f ON f.id = ft.focus_id
      ORDER BY f.slug, ft.tag
    `).all(),
    db.prepare(`
      SELECT t.slug AS task, pt.namespace, pt.tag
      FROM prompt_tags pt JOIN task_templates t ON t.id = pt.task_template_id
      ORDER BY t.slug, pt.namespace, pt.tag
    `).all(),
    db.prepare(`
      SELECT c.iso3 AS country, h.text, h.position, h.origin
      FROM country_hooks h JOIN countries c ON c.id = h.country_id
      ORDER BY c.iso3, h.position, h.id
    `).all(),
    db.prepare(`
      SELECT c.iso3 AS country, f.slug AS focus, a.score, a.reason
      FROM country_focus_affinity a
      JOIN countries c ON c.id = a.country_id
      JOIN focuses f ON f.id = a.focus_id
      ORDER BY c.iso3, f.slug
    `).all(),
    db.prepare(`
      SELECT slug, name, kind, height_thirds, spec, archived, origin
      FROM worksheet_layouts ORDER BY slug
    `).all(),
  ]);

  return {
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    focuses: focuses.results,
    project_types: projectTypes.results,
    tasks: tasks.results,
    focus_tags: focusTags.results,
    prompt_tags: promptTags.results,
    hooks: hooks.results,
    affinities: affinities.results,
    layouts: layouts.results,
  };
}

export async function apiLibraryExport(request, env) {
  const body = JSON.stringify(await libraryExport(env.DB), null, 2);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      // Without this the browser renders it and the backup is a tab, not a file.
      'content-disposition': `attachment; filename="globetrotters-library-${day}.json"`,
    },
  });
}

// Nothing here deletes, and nothing here is keyed on anything but a natural
// key. A row in the file that is already in the database is compared field by
// field and written only where it differs, which is what makes a second import
// of the same file report zeros rather than rewriting every row.
function differs(existing, wanted, columns) {
  return columns.some((c) => (existing[c] ?? null) !== (wanted[c] ?? null));
}

const clean = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
};

const flag = (value) => (value === 1 || value === '1' || value === true ? 1 : 0);

class Importer {
  constructor(db) {
    this.db = db;
    this.counts = {};
  }

  count(kind, key) {
    this.counts[kind][key] += 1;
  }

  async index(sql, key = 'slug') {
    const { results } = await this.db.prepare(sql).all();
    return new Map(results.map((r) => [r[key], r]));
  }
}

async function importFocuses(im, rows) {
  const columns = ['name', 'blurb', 'archived', 'origin'];
  const existing = await im.index('SELECT id, slug, name, blurb, archived, origin FROM focuses');
  for (const row of rows) {
    const slug = clean(row.slug);
    if (!slug || !clean(row.name)) { im.count('focuses', 'skipped'); continue; }
    const wanted = {
      name: clean(row.name), blurb: clean(row.blurb),
      archived: flag(row.archived), origin: clean(row.origin) || 'seed',
    };
    const found = existing.get(slug);
    if (!found) {
      await im.db.prepare(
        'INSERT INTO focuses (slug, name, blurb, archived, origin) VALUES (?, ?, ?, ?, ?)'
      ).bind(slug, ...columns.map((c) => wanted[c])).run();
      im.count('focuses', 'inserted');
    } else if (differs(found, wanted, columns)) {
      await im.db.prepare('UPDATE focuses SET name = ?, blurb = ?, archived = ?, origin = ? WHERE id = ?')
        .bind(...columns.map((c) => wanted[c]), found.id).run();
      im.count('focuses', 'updated');
    }
  }
}

async function importProjectTypes(im, rows) {
  const columns = ['name', 'materials', 'archived', 'origin'];
  const existing = await im.index('SELECT id, slug, name, materials, archived, origin FROM project_types');
  for (const row of rows) {
    const slug = clean(row.slug);
    if (!slug || !clean(row.name)) { im.count('project_types', 'skipped'); continue; }
    const wanted = {
      name: clean(row.name), materials: clean(row.materials),
      archived: flag(row.archived), origin: clean(row.origin) || 'seed',
    };
    const found = existing.get(slug);
    if (!found) {
      await im.db.prepare(
        'INSERT INTO project_types (slug, name, materials, archived, origin) VALUES (?, ?, ?, ?, ?)'
      ).bind(slug, ...columns.map((c) => wanted[c])).run();
      im.count('project_types', 'inserted');
    } else if (differs(found, wanted, columns)) {
      await im.db.prepare(
        'UPDATE project_types SET name = ?, materials = ?, archived = ?, origin = ? WHERE id = ?'
      ).bind(...columns.map((c) => wanted[c]), found.id).run();
      im.count('project_types', 'updated');
    }
  }
}

// Layouts come in before tasks, because a task's binding is resolved against
// them. Keyed on slug like everything else in the file: a layout retuned this
// year has to land in next year's database without carrying this one's ids.
const LAYOUT_COLUMNS = ['name', 'kind', 'height_thirds', 'spec', 'archived', 'origin'];

async function importLayouts(im, rows) {
  const existing = await im.index(`
    SELECT id, slug, name, kind, height_thirds, spec, archived, origin FROM worksheet_layouts
  `);
  for (const row of rows) {
    const slug = clean(row.slug);
    const kind = clean(row.kind);
    const thirds = Number(row.height_thirds);
    // A kind with no renderer, or a height a sheet cannot hold, is a row that
    // would print as a hole. Skipped and counted, like every other bad anchor.
    if (!slug || !clean(row.name) || !KIND_NAMES.includes(kind)
        || !(thirds >= 1 && thirds <= 3)) {
      im.count('layouts', 'skipped');
      continue;
    }
    const wanted = {
      name: clean(row.name), kind, height_thirds: Math.round(thirds),
      spec: JSON.stringify(readSpec(kind, row.spec)),
      archived: flag(row.archived), origin: clean(row.origin) || 'seed',
    };
    const found = existing.get(slug);
    if (!found) {
      await im.db.prepare(`
        INSERT INTO worksheet_layouts (slug, name, kind, height_thirds, spec, archived, origin)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(slug, ...LAYOUT_COLUMNS.map((c) => wanted[c])).run();
      im.count('layouts', 'inserted');
    } else if (differs(found, wanted, LAYOUT_COLUMNS)) {
      await im.db.prepare(`
        UPDATE worksheet_layouts SET
          name = ?, kind = ?, height_thirds = ?, spec = ?, archived = ?, origin = ?
        WHERE id = ?
      `).bind(...LAYOUT_COLUMNS.map((c) => wanted[c]), found.id).run();
      im.count('layouts', 'updated');
    }
  }
}

const TASK_COLUMNS = ['title', 'prompt', 'week_theme', 'workbook_page', 'tier',
                      'project_type_id', 'position', 'archived', 'origin',
                      'worksheet_layout_id', 'worksheet_spec'];

async function importTasks(im, rows) {
  const projectTypes = await im.index('SELECT id, slug FROM project_types');
  const layouts = await im.index('SELECT id, slug, kind FROM worksheet_layouts');
  const existing = await im.index(`
    SELECT id, slug, title, prompt, week_theme, workbook_page, tier,
           project_type_id, position, archived, origin,
           worksheet_layout_id, worksheet_spec
    FROM task_templates
  `);

  for (const row of rows) {
    const slug = clean(row.slug);
    const week = Number(row.week_theme);
    const projectSlug = clean(row.project_type);
    // A task naming a project type this database does not have is skipped
    // rather than inserted with a dangling reference — the file is a backup,
    // not a migration, and half a week 4 is worse than none.
    const project = projectSlug ? projectTypes.get(projectSlug) : null;
    if (!slug || !clean(row.title) || !clean(row.prompt)
        || !(week >= 1 && week <= 4) || (projectSlug && !project)) {
      im.count('tasks', 'skipped');
      continue;
    }
    // A task naming a layout this database does not have keeps everything else
    // and loses only the binding, which prints as ruled lines. That is a
    // complete page; skipping the task the way a dangling project type does
    // would leave the week short one.
    const layout = layouts.get(clean(row.worksheet_layout)) || null;
    const wanted = {
      title: clean(row.title), prompt: clean(row.prompt), week_theme: week,
      workbook_page: clean(row.workbook_page), tier: clean(row.tier) || 'focus',
      project_type_id: project ? project.id : null,
      position: row.position == null ? null : Number(row.position),
      archived: flag(row.archived), origin: clean(row.origin) || 'seed',
      worksheet_layout_id: layout ? layout.id : null,
      worksheet_spec: layout && row.worksheet_spec
        ? JSON.stringify(pickSpec(layout.kind, row.worksheet_spec)) : null,
    };
    const found = existing.get(slug);
    if (!found) {
      await im.db.prepare(`
        INSERT INTO task_templates
          (slug, title, prompt, week_theme, workbook_page, tier, project_type_id,
           position, archived, origin, worksheet_layout_id, worksheet_spec)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(slug, ...TASK_COLUMNS.map((c) => wanted[c])).run();
      im.count('tasks', 'inserted');
    } else if (differs(found, wanted, TASK_COLUMNS)) {
      await im.db.prepare(`
        UPDATE task_templates SET
          title = ?, prompt = ?, week_theme = ?, workbook_page = ?, tier = ?,
          project_type_id = ?, position = ?, archived = ?, origin = ?,
          worksheet_layout_id = ?, worksheet_spec = ?, updated_at = ?
        WHERE id = ?
      `).bind(...TASK_COLUMNS.map((c) => wanted[c]), new Date().toISOString(), found.id).run();
      im.count('tasks', 'updated');
    }
  }
}

// A tag is not an anchor: it is a value, and a focus is free to weight one no
// prompt carries yet. So the only thing resolved here is the focus slug, and a
// tag outside the shape the editor writes is skipped rather than stored.
const TAG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function importFocusTags(im, rows) {
  const focuses = await im.index('SELECT id, slug FROM focuses');
  const { results } = await im.db.prepare('SELECT focus_id, tag, weight FROM focus_tags').all();
  const existing = new Map(results.map((r) => [`${r.focus_id}:${r.tag}`, r.weight]));

  for (const row of rows) {
    const focus = focuses.get(clean(row.focus));
    const tag = (clean(row.tag) || '').toLowerCase();
    const weight = Number(row.weight);
    if (!focus || !TAG.test(tag) || !(weight >= 1 && weight <= 3)) {
      im.count('focus_tags', 'skipped');
      continue;
    }
    const key = `${focus.id}:${tag}`;
    if (!existing.has(key)) {
      await im.db.prepare('INSERT INTO focus_tags (focus_id, tag, weight) VALUES (?, ?, ?)')
        .bind(focus.id, tag, Math.round(weight)).run();
      im.count('focus_tags', 'inserted');
    } else if (existing.get(key) !== Math.round(weight)) {
      await im.db.prepare('UPDATE focus_tags SET weight = ? WHERE focus_id = ? AND tag = ?')
        .bind(Math.round(weight), focus.id, tag).run();
      im.count('focus_tags', 'updated');
    }
  }
}

// Three columns and all three are the key, so a row is either there or it is
// not: there is nothing on a prompt tag to update. A namespace outside the two
// is skipped rather than written, because a third namespace would be weighted
// by nothing and constrain nothing.
async function importPromptTags(im, rows) {
  const tasks = await im.index('SELECT id, slug FROM task_templates');
  const { results } = await im.db.prepare(
    'SELECT task_template_id, namespace, tag FROM prompt_tags'
  ).all();
  const existing = new Set(results.map((r) => `${r.task_template_id}:${r.namespace}:${r.tag}`));

  for (const row of rows) {
    const task = tasks.get(clean(row.task));
    const namespace = clean(row.namespace);
    const tag = (clean(row.tag) || '').toLowerCase();
    if (!task || !['topic', 'mode'].includes(namespace) || !TAG.test(tag)) {
      im.count('prompt_tags', 'skipped');
      continue;
    }
    if (existing.has(`${task.id}:${namespace}:${tag}`)) continue;
    await im.db.prepare(
      'INSERT INTO prompt_tags (task_template_id, namespace, tag) VALUES (?, ?, ?)'
    ).bind(task.id, namespace, tag).run();
    im.count('prompt_tags', 'inserted');
  }
}

// A hook has no unique key in the schema, so the import keys it on the pair
// that means something: this country, this text. Two identical hooks on one
// country are the same hook, and re-importing must not make a second copy.
async function importHooks(im, rows) {
  const countries = await im.index('SELECT id, iso3 FROM countries', 'iso3');
  const { results } = await im.db.prepare('SELECT id, country_id, text, position FROM country_hooks').all();
  const existing = new Map(results.map((r) => [`${r.country_id} ${r.text}`, r]));

  for (const row of rows) {
    const c = countries.get(clean(row.country));
    const text = clean(row.text);
    if (!c || !text) { im.count('hooks', 'skipped'); continue; }
    const position = row.position == null ? 0 : Number(row.position);
    const found = existing.get(`${c.id} ${text}`);
    if (!found) {
      await im.db.prepare(
        'INSERT INTO country_hooks (country_id, text, position, origin) VALUES (?, ?, ?, ?)'
      ).bind(c.id, text, position, clean(row.origin) || 'seed').run();
      im.count('hooks', 'inserted');
    } else if (found.position !== position) {
      await im.db.prepare('UPDATE country_hooks SET position = ? WHERE id = ?')
        .bind(position, found.id).run();
      im.count('hooks', 'updated');
    }
  }
}

async function importAffinities(im, rows) {
  const countries = await im.index('SELECT id, iso3 FROM countries', 'iso3');
  const focuses = await im.index('SELECT id, slug FROM focuses');
  const { results } = await im.db.prepare(
    'SELECT country_id, focus_id, score, reason FROM country_focus_affinity'
  ).all();
  const existing = new Map(results.map((r) => [`${r.country_id}:${r.focus_id}`, r]));

  for (const row of rows) {
    const c = countries.get(clean(row.country));
    const f = focuses.get(clean(row.focus));
    const score = Number(row.score);
    if (!c || !f || (score !== 2 && score !== 3)) { im.count('affinities', 'skipped'); continue; }
    const reason = clean(row.reason);
    const found = existing.get(`${c.id}:${f.id}`);
    if (!found) {
      await im.db.prepare(
        'INSERT INTO country_focus_affinity (country_id, focus_id, score, reason) VALUES (?, ?, ?, ?)'
      ).bind(c.id, f.id, score, reason).run();
      im.count('affinities', 'inserted');
    } else if (found.score !== score || (found.reason ?? null) !== reason) {
      await im.db.prepare(
        'UPDATE country_focus_affinity SET score = ?, reason = ? WHERE country_id = ? AND focus_id = ?'
      ).bind(score, reason, c.id, f.id).run();
      im.count('affinities', 'updated');
    }
  }
}

const KINDS = ['focuses', 'project_types', 'layouts', 'tasks',
               'focus_tags', 'prompt_tags', 'hooks', 'affinities'];

// Order matters: tasks reference project types, prompt tags reference tasks,
// focus tags and affinities reference focuses. Import in dependency order and a
// single pass is enough.
export async function libraryImport(db, file) {
  const im = new Importer(db);
  for (const kind of KINDS) im.counts[kind] = { inserted: 0, updated: 0, skipped: 0 };

  const list = (key) => (Array.isArray(file?.[key]) ? file[key] : []);
  await importFocuses(im, list('focuses'));
  await importProjectTypes(im, list('project_types'));
  await importLayouts(im, list('layouts'));
  await importTasks(im, list('tasks'));
  await importFocusTags(im, list('focus_tags'));
  await importPromptTags(im, list('prompt_tags'));
  await importHooks(im, list('hooks'));
  await importAffinities(im, list('affinities'));
  return im.counts;
}

export async function apiLibraryImport(request, env) {
  const file = await readJson(request);
  if (KINDS.every((k) => !Array.isArray(file[k]))) {
    return json({ ok: false, error: 'That file has no library in it.' }, { status: 400 });
  }
  if (file.version !== undefined && Number(file.version) !== EXPORT_VERSION) {
    return json({ ok: false, error: `This build reads version ${EXPORT_VERSION} exports.` },
      { status: 400 });
  }

  try {
    const counts = await libraryImport(env.DB, file);
    const changed = Object.values(counts).some((c) => c.inserted || c.updated);
    return json({ ok: true, counts, changed });
  } catch (err) {
    return json({ ok: false, error: err.message }, { status: 500 });
  }
}
