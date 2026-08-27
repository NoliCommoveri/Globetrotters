// The reveal — all twenty tasks, the moment you find out what your September
// looks like (DESIGN.md §7 Month setup).
//
// It is the end of setup and it is also where the month gets fixed. Everything
// on it is free until the first check-off and closed after: that is one rule
// with three doors, and the payload names it `locked` so the screen does not
// have to re-derive it from twenty rows (Q-01, Q-02).
//
// Redraw alone would be the wrong lever. It re-rolls with the same weighting,
// and when twenty tasks look wrong the focus is usually why — so change focus
// sits beside it, at the same size.

import { el, monthName, adventure, longDate } from './dom.js';
import { getPlan, redrawPlan, patchPlan, getFocusSamples, getCatalog, SignedOut } from './api.js';

const WEEK_NOTE = {
  1: 'The four pages every country gets, and one more.',
  2: 'Your focus shapes this week.',
  3: 'Your focus shapes this week too.',
  4: 'No new research. Build it and show it.',
};

export function planScreen(ctx) {
  const root = el('section', { class: 'panel' });

  const local = {
    body: ctx.preloaded || null,
    catalog: null,
    error: null,
    busy: null,          // 'redraw' | 'focus' | 'country' | 'project'
    open: null,          // which changer is expanded
    query: '',
    samples: new Map(),
  };

  const set = (patch) => { Object.assign(local, patch); paint(); };

  async function load() {
    try {
      const [body, catalog] = await Promise.all([
        local.body ? Promise.resolve(local.body) : getPlan(ctx.id),
        getCatalog(),
      ]);
      set({ body, catalog, error: null });
    } catch (err) {
      if (err instanceof SignedOut) return ctx.refresh();
      set({ error: err.message });
    }
  }

  // Every changer answers with the whole plan, because every one of them lands
  // on this same screen. There is no partial update to merge.
  async function change(kind, fn) {
    set({ busy: kind, error: null });
    try {
      set({ body: await fn(), busy: null, open: null, query: '' });
      ctx.say(MESSAGES[kind]);
      // Country and focus are on the home screen's summary, so the shell's copy
      // of /api/me is stale the moment either changes.
      if (kind !== 'redraw') ctx.refresh();
    } catch (err) {
      if (err instanceof SignedOut) return ctx.refresh();
      set({ busy: null, error: err.message });
    }
  }

  const MESSAGES = {
    redraw: 'Drawn again.',
    focus: 'New focus. Weeks 2 and 3 are new too.',
    country: 'Country changed. Your tasks are the same — they always work anywhere.',
    project: 'Week 4 is new.',
  };

  // ------------------------------------------------------------- fragments --

  function header(plan) {
    return el('div', { class: 'stack' }, [
      el('p', { class: 'eyebrow', text: monthName(plan.month) }),
      el('h1', { class: 'reveal-country', text: plan.country_name }),
      el('p', { class: 'meta' }, [
        el('span', { class: 'pill', text: plan.focus_name }),
        el('span', { class: 'pill', text: adventure(plan.research_depth) }),
      ]),
      el('p', { class: 'note', text: `Starts ${longDate(plan.start_date)}. ${plan.project_type_name} in week 4.` }),
      // Materials stay visible because nobody reopens setup, and the foam board
      // has to be bought before week 4 rather than during it.
      plan.project_type_materials
        ? el('p', { class: 'note', text: `You’ll want: ${plan.project_type_materials}` })
        : null,
    ]);
  }

  function taskCard(task) {
    return el('li', { class: 'task' }, [
      el('span', { class: 'task-no', text: String(task.position) }),
      el('span', { class: 'task-body' }, [
        el('span', { class: 'task-title', text: task.title }),
        el('span', { class: 'task-prompt', text: task.prompt }),
        task.workbook_page ? el('span', { class: 'task-page', text: `${task.workbook_page} page` }) : null,
      ]),
    ]);
  }

  function week(group) {
    return el('div', { class: 'week' }, [
      el('h2', { text: `Week ${group.week_no} · ${group.theme}` }),
      el('p', { class: 'note', text: WEEK_NOTE[group.week_no] }),
      el('ol', { class: 'tasks' }, group.tasks.map(taskCard)),
    ]);
  }

  // ---------------------------------------------------------------- levers --

  function disclosure(kind, label, contents) {
    const open = local.open === kind;
    return el('div', { class: 'changer' }, [
      el('button', {
        class: 'quiet', type: 'button', text: label,
        'aria-expanded': open ? 'true' : 'false',
        disabled: local.busy != null,
        on: { click: () => set({ open: open ? null : kind, query: '' }) },
      }),
      open ? el('div', { class: 'stack changer-body' }, contents()) : null,
    ]);
  }

  function focusChanger(plan) {
    return () => local.catalog.focuses.map((focus) => {
      const current = focus.id === plan.focus_id;
      if (!local.samples.has(focus.id) && !current) {
        getFocusSamples(focus.id).then((body) => {
          local.samples.set(focus.id, body.samples);
          if (local.open === 'focus') paint();
        }).catch(() => {});
      }
      const titles = local.samples.get(focus.id);
      return el('button', {
        class: 'focus-pick', type: 'button',
        'aria-current': current ? 'true' : null,
        disabled: current || local.busy != null,
        on: { click: () => change('focus', () => patchPlan(ctx.id, { focus_id: focus.id })) },
      }, [
        el('span', { class: 'focus-name', text: focus.name }),
        focus.blurb ? el('span', { class: 'note', text: focus.blurb }) : null,
        !current && titles?.length
          ? el('span', { class: 'note', text: titles.map((t) => t.title).join(' · ') })
          : null,
      ]);
    });
  }

  // Search only, not the whole picker. Country is free at any time because tasks
  // are country-agnostic, so this is a correction rather than a decision — the
  // decision was made on setup and the ceremony does not need repeating.
  function countryChanger(plan) {
    return () => {
      const input = el('input', {
        type: 'text', id: 'change-country', name: 'change-country',
        placeholder: 'Search all 195', value: local.query,
        autocapitalize: 'words', autocorrect: 'off', spellcheck: 'false',
        on: { input: (event) => { local.query = event.target.value; paintHits(); } },
      });
      const hits = el('div', { class: 'stack' });
      function paintHits() {
        const q = local.query.trim().toLowerCase();
        const found = q
          ? local.catalog.countries
            .filter((c) => c.name.toLowerCase().includes(q) && c.id !== plan.country_id)
            .slice(0, 12)
          : [];
        hits.replaceChildren(...found.map((country) => el('button', {
          class: 'focus-pick', type: 'button',
          disabled: local.busy != null,
          on: { click: () => change('country', () => patchPlan(ctx.id, { country_id: country.id })) },
        }, [
          el('span', { class: 'focus-name', text: country.name }),
          el('span', { class: 'note', text: adventure(country.research_depth) }),
        ])));
      }
      paintHits();
      return [el('label', { for: 'change-country', text: 'Somewhere else' }), input, hits];
    };
  }

  function projectChanger(plan) {
    return () => local.catalog.project_types
      .filter((p) => p.week4_templates > 0)
      .map((project) => el('button', {
        class: 'focus-pick', type: 'button',
        'aria-current': project.id === plan.project_type_id ? 'true' : null,
        disabled: project.id === plan.project_type_id || local.busy != null,
        on: { click: () => change('project', () => patchPlan(ctx.id, { project_type_id: project.id })) },
      }, [
        el('span', { class: 'focus-name', text: project.name }),
        project.materials ? el('span', { class: 'note', text: project.materials }) : null,
      ]));
  }

  function levers(body) {
    const plan = body.plan;
    const mine = ctx.personId === plan.person_id;
    if (!mine) return el('p', { class: 'note', text: 'This is someone else’s month.' });

    if (body.locked) {
      // The first check-off is the only gate, and it is on both doors: redraw and
      // change focus reroll the same weeks under the same condition, so a limit
      // on one and not the other is two doors onto one room.
      return el('div', { class: 'stack' }, [
        el('p', { class: 'note', text: `${body.done_count} of ${body.total} done. The draw is set now.` }),
        !body.week4_locked ? disclosure('project', 'Change what you’ll make', projectChanger(plan)) : null,
        disclosure('country', 'Change country', countryChanger(plan)),
      ]);
    }

    return el('div', { class: 'stack' }, [
      el('p', { class: 'note', text: 'Nothing is fixed until you check off your first task.' }),
      el('button', {
        class: 'primary', type: 'button',
        disabled: local.busy != null,
        text: local.busy === 'redraw' ? 'Drawing…' : 'Draw twenty new ones',
        on: { click: () => change('redraw', () => redrawPlan(ctx.id)) },
      }),
      disclosure('focus', 'Change focus', focusChanger(plan)),
      disclosure('project', 'Change what you’ll make', projectChanger(plan)),
      disclosure('country', 'Change country', countryChanger(plan)),
    ]);
  }

  // ---------------------------------------------------------------- render --

  function paint() {
    if (!local.body || !local.catalog) {
      root.replaceChildren(
        local.error
          ? el('p', { class: 'error', role: 'alert', text: local.error })
          : el('p', { class: 'note', text: 'Loading…' }),
      );
      return;
    }

    root.replaceChildren(...[
      header(local.body.plan),
      el('div', { class: 'stack' }, local.body.weeks.map(week)),
      levers(local.body),
      local.error ? el('p', { class: 'error', role: 'alert', text: local.error }) : null,
      el('p', { class: 'note' }, [
        el('a', { class: 'chrome-link', href: '/', 'data-route': true, text: 'Home' }),
      ]),
    ].filter(Boolean));
  }

  paint();
  load();
  return root;
}
