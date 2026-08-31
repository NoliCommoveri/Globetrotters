// Plan — the whole month at once, and the reveal it starts life as (DESIGN.md
// §7 Month setup, §7 Plan).
//
// One screen, because they are one screen: the reveal is this page on the day it
// is drawn. It is where the month gets fixed — everything on it is free until
// the first check-off and closed after, one rule with three doors, and the
// payload names it `locked` so the screen does not re-derive it from twenty rows
// (Q-01, Q-02).
//
// Redraw alone would be the wrong lever. It re-rolls with the same weighting,
// and when twenty tasks look wrong the focus is usually why — so change focus
// sits beside it, at the same size.
//
// It is also the only screen that can hold month-scale state, so it holds all of
// it: swap and its remaining budget, the month's notes accumulating down the
// page, the materials for week 4 from week 1, and days worked.

import { el, monthName, adventure, longDate, shortDate, weeksSpan, weeksEnd, left } from './dom.js';
import {
  getPlan, redrawPlan, patchPlan, swapTask, getStats, getFocusSamples, getCatalog, SignedOut,
} from './api.js';

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
    stats: null,
    error: null,
    busy: null,          // 'redraw' | 'focus' | 'country' | 'project' | 'swap'
    open: null,          // which changer is expanded
    query: '',
    samples: new Map(),
  };

  const set = (patch) => { Object.assign(local, patch); paint(); };

  async function load({ refetch = false } = {}) {
    try {
      const [body, catalog, stats] = await Promise.all([
        local.body && !refetch ? Promise.resolve(local.body) : getPlan(ctx.id),
        local.catalog ? Promise.resolve(local.catalog) : getCatalog(),
        getStats(),
      ]);
      set({ body, catalog, stats: stats.stats[0] || null, error: null });
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
      const body = await fn();
      set({ body, busy: null, open: null, query: '' });
      ctx.say(messageFor(kind, body));
      // Country and focus are on the home screen's summary, so the shell's copy
      // of /api/me is stale the moment either changes. A swap is not: it changes
      // one card inside a plan the shell only knows the country of.
      if (kind !== 'redraw' && !kind.startsWith('swap-')) ctx.refresh();
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
    start: 'Moved. The same twenty tasks, on new weeks — print again if a week is already on paper.',
  };

  // A swap names its week, because the sheets for that week are already in the
  // binder and the new card is not on any of them. Printing again is one week,
  // never seven (§16).
  function messageFor(kind, body) {
    if (!kind.startsWith('swap-')) return MESSAGES[kind];
    const id = Number(kind.slice(5));
    const group = body.weeks.find((w) => w.tasks.some((t) => t.id === id));
    const reprint = group ? ` Print week ${group.week_no} again if it is on paper.` : '';
    return `Swapped. ${left(body.swaps_left)} this month.${reprint}`;
  }

  // ------------------------------------------------------------- fragments --

  function header(plan) {
    return el('div', { class: 'stack' }, [
      el('p', { class: 'eyebrow', text: monthName(plan.month) }),
      el('h1', { class: 'reveal-country', text: plan.country_name }),
      el('p', { class: 'meta' }, [
        el('span', { class: 'pill', text: plan.focus_name }),
        el('span', { class: 'pill', text: adventure(plan.research_depth) }),
      ]),
      el('p', {
        class: 'note',
        text: `Starts ${longDate(plan.start_date)}, ends ${shortDate(weeksEnd(plan.start_date))}. `
          + `${plan.project_type_name} in week 4.`,
      }),
      // Materials stay visible because nobody reopens setup, and the foam board
      // has to be bought before week 4 rather than during it.
      plan.project_type_materials
        ? el('p', { class: 'note', text: `You’ll want: ${plan.project_type_materials}` })
        : null,
    ]);
  }

  // The same three states This week shows, because they are the same twenty
  // cards. In progress is an open task with a session against it.
  const stateOf = (task) => (
    task.status === 'done' ? 'done' : (task.session_count > 0 ? 'progress' : 'open')
  );

  const STATE_LABEL = { open: null, progress: 'Started', done: 'Done' };

  // Offered on the fifth week-1 slot and on weeks 2-3, never on the four week-1
  // core tasks or on week 4, and never on a task already done — the payload has
  // already worked all of that out per row (§4). The budget is the plan's, so
  // the button goes quiet for every row at once when it runs out.
  function swapButton(body, task) {
    if (!task.swappable) return null;
    const spent = body.swaps_left <= 0;
    return el('button', {
      class: 'quiet task-swap', type: 'button',
      disabled: spent || local.busy != null,
      text: local.busy === `swap-${task.id}` ? 'Drawing…' : 'Swap',
      title: spent ? 'No swaps left this month' : `${left(body.swaps_left)} this month`,
      on: { click: () => change(`swap-${task.id}`, () => swapTask(task.id)) },
    });
  }

  function taskCard(body, task) {
    const state = stateOf(task);
    return el('li', { class: 'task', 'data-state': state }, [
      el('span', { class: 'task-no', text: String(task.position) }),
      el('span', { class: 'task-body' }, [
        el('span', { class: 'task-title', text: task.title }),
        el('span', { class: 'task-prompt', text: task.prompt }),
        task.workbook_page ? el('span', { class: 'task-page', text: `${task.workbook_page} page` }) : null,
        // Two prompts from the same week and focus often read alike, so a swap
        // that does not say what it replaced is indistinguishable from a bug.
        task.swapped_from_title
          ? el('span', { class: 'task-page', text: `Swapped in for “${task.swapped_from_title}”` })
          : null,
      ]),
      el('span', { class: 'task-side' }, [
        STATE_LABEL[state] ? el('span', { class: 'task-state', text: STATE_LABEL[state] }) : null,
        ctx.personId === body.plan.person_id ? swapButton(body, task) : null,
      ]),
    ]);
  }

  // The printed pages, one week at a time (§16). A week is the unit because a
  // week is what the sheets break on: printing the month up front means a swap
  // in week 3 stales pages that are already in the binder, and reprinting the
  // month to fix it reprints weeks 1 and 2 that nothing changed.
  //
  // Not a data-route link. It is a Worker-rendered document with its own
  // stylesheet, so the router must let the browser have it.
  function printWeek(body, group) {
    return el('a', {
      class: 'chrome-link week-print',
      href: `/print/${body.plan.id}?week=${group.week_no}`,
      target: '_blank', rel: 'noopener',
      text: 'Print week ↗',
      title: `Week ${group.week_no}'s sheets, ready for the binder`,
    });
  }

  function week(body, group) {
    return el('div', { class: 'week' }, [
      el('div', { class: 'week-head' }, [
        el('h2', { text: `Week ${group.week_no} · ${group.theme}` }),
        printWeek(body, group),
      ]),
      el('p', { class: 'note', text: WEEK_NOTE[group.week_no] }),
      el('ol', { class: 'tasks' }, group.tasks.map((task) => taskCard(body, task))),
    ]);
  }

  // Days worked, cumulative across the whole year. It replaces the streak and it
  // has no other home in the app (§10) — a streak is the only mechanic here that
  // can punish, and nine months contain a flu and a winter break.
  function counters(body) {
    return el('p', { class: 'meta' }, [
      el('span', { class: 'pill', text: `${body.done_count} of ${body.total} done` }),
      local.stats
        ? el('span', {
          class: 'pill',
          text: `${local.stats.days_worked} ${local.stats.days_worked === 1 ? 'day' : 'days'} worked`,
        })
        : null,
    ]);
  }

  // The month's notes, accumulating down the page. This is what makes "What
  // surprised you?" worth answering — twenty of them by month's end, and the
  // pool the stamp headline is picked from.
  function notes(body) {
    if (!body.notes.length) {
      return el('div', { class: 'stack notes' }, [
        el('h2', { text: 'What surprised you' }),
        el('p', { class: 'note', text: 'Nothing written down yet. The line after a check-off lands here.' }),
      ]);
    }
    return el('div', { class: 'stack notes' }, [
      el('h2', { text: 'What surprised you' }),
      el('ul', { class: 'note-list' }, body.notes.map((row) => el('li', {}, [
        el('span', { class: 'note-text', text: row.note }),
        el('span', { class: 'note-from', text: row.task_title || row.local_date }),
      ]))),
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

  // Free at any time, like the country and unlike the focus (Q-22). Nothing is
  // redrawn: tasks carry no dates, so this moves the anchor and the same twenty
  // cards re-sort themselves into four new weeks. It is the control for a month
  // interrupted rather than a month mis-drawn.
  function startChanger(plan) {
    return () => [
      el('p', { class: 'note', text: 'Four weeks from the Monday you pick.' }),
      el('div', { class: 'chips' }, local.body.start_weeks.map((date) => {
        const current = date === plan.start_date;
        return el('button', {
          class: 'chip', type: 'button',
          'aria-current': current ? 'true' : null,
          disabled: current || local.busy != null,
          text: shortDate(date),
          title: weeksSpan(date),
          on: { click: () => change('start', () => patchPlan(ctx.id, { start_date: date })) },
        });
      })),
      el('p', { class: 'note', text: `Now: ${weeksSpan(plan.start_date)}.` }),
    ];
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

    // A stamped month is finished. Country and project type are still technically
    // open, but offering them here would invite an edit to a month whose stamp
    // already says what it was — and the stamp is a frozen record (§7). The
    // controls that still apply to it live next to it, on the passport.
    if (body.stamp) {
      return el('div', { class: 'stack' }, [
        el('p', { class: 'note', text: 'This month is stamped.' }),
        el('p', { class: 'note' }, [
          el('a', {
            class: 'chrome-link', href: '/passport', 'data-route': true,
            text: 'See it on the passport',
          }),
        ]),
      ]);
    }

    // A month that is over has one Monday in its window — this week's — and no
    // choice to make, so the lever is not offered on it.
    const movable = body.start_weeks.length > 1;

    if (body.locked) {
      // The first check-off is the only gate, and it is on both doors: redraw and
      // change focus reroll the same weeks under the same condition, so a limit
      // on one and not the other is two doors onto one room. The start week is
      // behind neither door: it destroys nothing.
      return el('div', { class: 'stack' }, [
        el('p', { class: 'note', text: 'You have started this month. The draw is set now.' }),
        movable ? disclosure('start', 'Move the start week', startChanger(plan)) : null,
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
      movable ? disclosure('start', 'Move the start week', startChanger(plan)) : null,
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
      counters(local.body),
      el('div', { class: 'stack' }, local.body.weeks.map((group) => week(local.body, group))),
      notes(local.body),
      levers(local.body),
      local.error ? el('p', { class: 'error', role: 'alert', text: local.error }) : null,
      el('p', { class: 'note' }, [
        el('a', { class: 'chrome-link', href: '/', 'data-route': true, text: 'Home' }),
      ]),
    ].filter(Boolean));
  }

  paint();
  load();

  // Refetched on every return to the tab, like every other screen: someone else
  // may have checked something off, and a note written on a phone belongs on the
  // laptop's copy of this page.
  root.reload = () => load({ refetch: true });
  return root;
}
