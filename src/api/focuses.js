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
// The three heaviest, by the same `fw = 1 + 2 * SUM(shared topic tag weights)`
// the draw uses. Sampling everything a focus "would pull in" returns mostly
// baseline tasks and every focus previews identically — the failure that makes
// the preview worse than no preview.

import { json } from '../lib/html.js';

// One from week 2, then one from week 3, then back. Weeks 2 and 3 are one draw
// now, but they are still two weeks of paper: taking the three heaviest outright
// would show all of them from whichever natural half this focus leans to, and
// preview half the month.
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

  // Ordered heaviest first, then interleaved by natural half. The two pinned
  // prompts are excluded: they land whatever is picked, so previewing one says
  // nothing about the choice being made.
  const { results } = await env.DB.prepare(`
    SELECT task_templates.id, task_templates.title, task_templates.week_theme,
           1 + 2 * SUM(focus_tags.weight) AS fw
    FROM prompt_tags
    JOIN focus_tags ON focus_tags.tag = prompt_tags.tag AND focus_tags.focus_id = ?
    JOIN task_templates ON task_templates.id = prompt_tags.task_template_id
    WHERE prompt_tags.namespace = 'topic'
      AND task_templates.archived = 0
      AND task_templates.week_theme IN (2, 3)
      AND task_templates.tier != 'fixed'
    GROUP BY task_templates.id
    ORDER BY fw DESC, task_templates.id
  `).bind(id).all();

  return json({
    ok: true,
    focus,
    samples: interleave(results, 3),
    // Every prompt this focus gives any lift at all, a single weight-1 tag
    // included. Not the same number as on-theme, which is a hand audit and not
    // something the app can compute. A focus whose tags reach nothing previews
    // empty, and that is a true thing about it rather than a loading state.
    above_baseline: results.length,
  });
}
