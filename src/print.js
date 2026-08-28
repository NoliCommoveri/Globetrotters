// GET /print/:planId — the month's pages, as the document that comes out of the
// printer (DESIGN.md §16).
//
// Worker-rendered and not under /api/, for the same reason /admin and /wall are:
// the app shell is one static mobile-first document, and a print stylesheet
// bolted onto it would spend its life fighting the phone layout. This document
// has its own stylesheet, its own @page rules, and ink on white.
//
// Nothing is stored and nothing is finalized. It renders live from plan_tasks
// every time it is asked, because the plan deliberately is not frozen — redraw,
// change focus, swap and change country all keep working after a month has been
// printed, and a stored set of pages would go stale on the first one.
//
// ?week=N renders one week. That is the reprint-after-swap path, and sheets are
// numbered within their week in both cases, so a reprinted sheet is the same
// sheet and drops straight back into the binder.

import { escapeHtml } from './lib/html.js';
import { packSheets, renderSegment, segmentFor, readSpec, renderForm } from './lib/worksheet.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const monthName = (month) => {
  const [year, m] = String(month).split('-');
  return `${MONTHS[Number(m) - 1] || month} ${year}`;
};

// The ink is editable on /admin, so it is checked rather than trusted: anything
// that is not a plain hex colour prints black rather than reaching the style
// attribute.
const ink = (color) => (/^#[0-9a-fA-F]{3,8}$/.test(String(color || '')) ? String(color) : '#000000');

function document_(title, body) {
  return new Response(`<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/css/print.css">
${body}
`, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export function printProblem(status, message) {
  return new Response(`<!doctype html>
<meta charset="utf-8">
<title>Globetrotters</title>
<p>${escapeHtml(message)}</p>
`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

// ------------------------------------------------------------------ reading --

// One query for the tasks, joined out to the template and its layout. Archived
// filters the draw and nothing else (§5), so nothing here filters on it: a
// template archived after it was drawn still has to print on the plan that
// holds it.
async function planTasks(env, planId) {
  const { results } = await env.DB.prepare(`
    SELECT plan_tasks.id, plan_tasks.week_no, plan_tasks.position,
           task_templates.slug, task_templates.title, task_templates.prompt,
           task_templates.workbook_page, task_templates.worksheet_spec,
           worksheet_layouts.kind AS layout_kind,
           worksheet_layouts.height_thirds AS layout_height_thirds,
           worksheet_layouts.spec AS layout_spec
    FROM plan_tasks
    JOIN task_templates ON task_templates.id = plan_tasks.task_template_id
    LEFT JOIN worksheet_layouts
      ON worksheet_layouts.id = task_templates.worksheet_layout_id
     AND worksheet_layouts.archived = 0
    WHERE plan_tasks.plan_id = ?
    ORDER BY plan_tasks.week_no, plan_tasks.position
  `).bind(planId).all();
  return results;
}

async function planHead(env, planId) {
  return env.DB.prepare(`
    SELECT month_plans.id, month_plans.month,
           people.name AS person_name, people.color AS person_color,
           countries.name AS country_name,
           project_types.name AS project_type_name,
           project_types.materials AS project_type_materials
    FROM month_plans
    JOIN people ON people.id = month_plans.person_id
    JOIN countries ON countries.id = month_plans.country_id
    JOIN project_types ON project_types.id = month_plans.project_type_id
    WHERE month_plans.id = ?
  `).bind(planId).first();
}

// The two forms week 4's sheet is composed from, read by slug so that editing
// them in the library editor changes the printed sheet like every other layout.
async function namedLayouts(env, slugs) {
  const marks = slugs.map(() => '?').join(', ');
  const { results } = await env.DB.prepare(
    `SELECT slug, kind, height_thirds, spec FROM worksheet_layouts
      WHERE archived = 0 AND slug IN (${marks})`
  ).bind(...slugs).all();
  return new Map(results.map((r) => [r.slug, r]));
}

// -------------------------------------------------------------- the sheets --

function sheetHeader(head, week, n, of) {
  const bits = [
    escapeHtml(head.person_name),
    escapeHtml(head.country_name),
    escapeHtml(monthName(head.month)),
  ];
  return `<header class="band" style="--ink:${ink(head.person_color)}">
<span class="who">${bits.join('<span class="dot">·</span>')}</span>
<span class="where">Week ${week}<span class="dot">·</span>sheet ${n} of ${of}</span>
</header>`;
}

const sheet = (head, week, n, of, body) =>
  `<article class="sheet">${sheetHeader(head, week, n, of)}<div class="segments">${body}</div></article>`;

// Weeks 1-3. Every task gets a segment; a template with no binding falls through
// to ruled lines, so the binder never has a hole.
function researchWeek(head, week, tasks) {
  const segments = tasks.map(segmentFor);
  const sheets = packSheets(segments);
  return sheets.map((s, i) => sheet(
    head, week, i + 1, sheets.length,
    s.segments.map(renderSegment).join('\n'),
  )).join('\n');
}

// Materials arrive as one freeform line — "foam board, glue, markers" — and the
// checklist wants them one to a row. Split on the two separators that line is
// ever written with, and fall back to the whole string.
function materialItems(materials) {
  const parts = String(materials || '')
    .split(/[;,]|\band\b/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean);
  return parts.length ? parts.slice(0, 12) : [];
}

// Week 4 is production, not research (§4), so it is one composed sheet rather
// than five packed segments: the project type's materials as a checklist, its
// five steps as check-off lines, and a storyboard for the one task that is
// genuinely planning work. Four of the five tasks get no segment at all — a
// ruled page under "rehearse it twice" is a page that goes in the bin.
function makeWeek(head, tasks, layouts) {
  const checklist = layouts.get('checklist');
  const storyboard = layouts.get('storyboard');
  const items = materialItems(head.project_type_materials);

  const materials = renderForm('checklist', readSpec(
    'checklist',
    checklist ? checklist.spec : '{"items":8}',
    { labels: items, items: Math.max(items.length, 4) },
  ));

  const steps = tasks.map((t) => `<li><span class="tick-box"></span>
<span class="label"><b>${escapeHtml(t.title)}</b> ${escapeHtml(t.prompt)}</span></li>`).join('');

  // The planning task is the one bound to a storyboard. Every project type's
  // sequence binds its first step (§13); a sequence that binds none falls to the
  // first step by position, which is the same task under a different name.
  const planner = tasks.find((t) => t.layout_kind === 'storyboard') || tasks[0];
  const panels = renderForm('storyboard', readSpec(
    'storyboard',
    storyboard ? storyboard.spec : '{"panels":6}',
  ));

  const body = `<section class="segment make-materials">
<header class="seg-head"><span class="seg-page">materials</span><h2>What you will need</h2></header>
<p class="seg-prompt">${escapeHtml(head.project_type_name)}. Tick these off before you start.${
    items.length ? '' : ` ${escapeHtml(head.project_type_materials || 'Work out what you need.')}`
  }</p>
<div class="seg-form">${materials}</div>
</section>
<section class="segment make-steps">
<header class="seg-head"><span class="seg-page">the week</span><h2>Five steps</h2></header>
<div class="seg-form"><ul class="checklist steps">${steps}</ul></div>
</section>
<section class="segment make-plan">
<header class="seg-head"><span class="seg-page">plan</span><h2>${
    escapeHtml(planner ? planner.title : 'Plan it')
  }</h2></header>
<p class="seg-prompt">${escapeHtml(planner ? planner.prompt : '')}</p>
<div class="seg-form">${panels}</div>
</section>`;

  return sheet(head, 4, 1, 1, body);
}

// ------------------------------------------------------------------- route --

export async function printPlan(request, env, session, params) {
  const planId = Number(params.id);
  const head = await planHead(env, planId);
  if (!head) return printProblem(404, 'No such month.');

  const url = new URL(request.url);
  const raw = url.searchParams.get('week');
  let only = null;
  if (raw !== null) {
    only = Number(raw);
    if (!Number.isInteger(only) || only < 1 || only > 4) {
      return printProblem(400, 'A week is 1, 2, 3 or 4.');
    }
  }

  const [tasks, layouts] = await Promise.all([
    planTasks(env, planId),
    namedLayouts(env, ['checklist', 'storyboard']),
  ]);
  if (!tasks.length) return printProblem(404, 'That month has no tasks yet.');

  const weeks = (only ? [only] : [1, 2, 3, 4]);
  const sheets = weeks.map((week) => {
    const rows = tasks.filter((t) => t.week_no === week);
    if (!rows.length) return '';
    return week === 4 ? makeWeek(head, rows, layouts) : researchWeek(head, week, rows);
  }).filter(Boolean).join('\n');

  const title = `${head.person_name} — ${head.country_name}, ${monthName(head.month)}`
    + (only ? `, week ${only}` : '');

  return document_(title, `<main class="pages">
${sheets}
</main>
`);
}
