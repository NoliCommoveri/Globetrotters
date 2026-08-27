// GET /api/focuses/:id/samples — three task titles that say what a focus will
// actually do to the month (DESIGN.md §7 Month setup, Q-06).
//
// "people-and-power" means nothing to an 11-year-old. Three titles it would pull
// in do, and they are the only honest way to show the consequence of a choice
// whose effect is otherwise invisible until the reveal.
//
// One fetch per focus tapped rather than three more strings on the catalog. The
// setup screen memoizes what it gets, so a focus tapped twice is one request.
//
// From `weight = 3` rows only. Weights are sparse and a missing row means 1, so
// sampling everything a focus "would pull in" returns mostly neutral tasks and
// every focus previews identically — the failure that makes the preview worse
// than no preview.

import { json } from '../lib/html.js';

// One from week 2, then one from week 3, then back. A focus holds three on-theme
// tasks in each week; taking the first three in id order would show all of them
// from the Deep Dive week that happens to sort first, and preview half the month.
function interleave(rows, count) {
  const byWeek = new Map();
  for (const row of rows) {
    if (!byWeek.has(row.week_theme)) byWeek.set(row.week_theme, []);
    byWeek.get(row.week_theme).push(row);
  }

  const queues = [...byWeek.keys()].sort((a, b) => a - b).map((w) => byWeek.get(w));
  const out = [];
  while (out.length < count && queues.some((q) => q.length)) {
    for (const queue of queues) {
      if (out.length >= count) break;
      if (queue.length) out.push(queue.shift());
    }
  }
  return out;
}

export async function apiFocusSamples(request, env, session, params) {
  const id = Number(params.id);
  const focus = await env.DB.prepare(
    'SELECT id, slug, name, blurb FROM focuses WHERE id = ? AND archived = 0'
  ).bind(id).first();
  if (!focus) return json({ ok: false, error: 'No such focus.' }, { status: 404 });

  const { results } = await env.DB.prepare(`
    SELECT task_templates.id, task_templates.title, task_templates.week_theme
    FROM task_focus_weights
    JOIN task_templates ON task_templates.id = task_focus_weights.task_template_id
    WHERE task_focus_weights.focus_id = ?
      AND task_focus_weights.weight = 3
      AND task_templates.archived = 0
      AND task_templates.week_theme IN (2, 3)
    ORDER BY task_templates.week_theme, task_templates.id
  `).bind(id).all();

  return json({
    ok: true,
    focus,
    samples: interleave(results, 3),
    // What the preview cannot show: a focus with no opinions previews empty, and
    // that is a true thing about it rather than a loading state.
    on_theme: results.length,
  });
}
