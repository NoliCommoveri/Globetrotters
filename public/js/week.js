// This week — the default view, and the screen this app is mostly made of
// (DESIGN.md §7 This week, §10).
//
// Used ~180 times per person. Everything else in the app is occasional, so
// everything here is built around one question: can a kid standing at a table
// with a pencil in the other hand check something off without thinking about it.
//
// One card up, not five. The rest of the week is a row of pips underneath. Order
// stays free — you just stop being asked which one to do every single day, and
// a missed Tuesday shifts forward instead of leaving a dead card behind.

import { el, svg, monthName, left } from './dom.js';
import { getPlan, patchTask, postSession, SignedOut } from './api.js';

const WEEK_THEMES = { 1: 'Foundations', 2: 'Deep Dive', 3: 'Deep Dive', 4: 'Make & Present' };

const WEEK_LENGTH = 5;

// Three card states, not two. Without a visible mark, "Worked on it" reads as a
// dead button — tapped once, nothing changes, never tapped again, and the
// two-sittings case the schema was designed for never surfaces (§7).
function stateOf(task) {
  if (task.status === 'done') return 'done';
  return task.session_count > 0 ? 'progress' : 'open';
}

const STATE_LABEL = {
  open: '',
  progress: 'Started',
  done: 'Done',
};

// ctx: { id, say, refresh }. No `go` and no `personId` — every control on this
// screen writes to the plan it is already looking at, and checking off is open
// to the family rather than to the plan's owner (§15).
export function weekScreen(ctx) {
  const root = el('section', { class: 'panel week-panel' });

  const local = {
    body: null,
    error: null,
    busy: null,      // 'done' | 'undo' | 'session' | 'note'
    showing: null,   // the card that is up; null means "work it out from the plan"
    asking: null,    // the task whose "What surprised you?" line is open
    draft: '',
  };

  const set = (patch) => { Object.assign(local, patch); paint(); };

  async function load() {
    try {
      set({ body: await getPlan(ctx.id), error: null });
    } catch (err) {
      if (err instanceof SignedOut) return ctx.refresh();
      set({ error: err.message });
    }
  }

  // Every write answers with the whole plan, so there is nothing to merge and no
  // state that can disagree with the server about what is done.
  async function act(kind, fn) {
    set({ busy: kind, error: null });
    try {
      set({ body: await fn(), busy: null });
    } catch (err) {
      if (err instanceof SignedOut) return ctx.refresh();
      set({ busy: null, error: err.message });
    }
  }

  // ---------------------------------------------------------- the reading --

  const tasks = () => local.body.weeks.flatMap((w) => w.tasks);
  const current = () => local.body.current_week;
  const weekTasks = () => local.body.weeks.find((w) => w.week_no === current()).tasks;

  // Unfinished tasks from earlier weeks. Never blocking, never a lockout — the
  // finish line is the month, not the week (§7).
  const carried = () => tasks().filter((t) => t.week_no < current() && t.status === 'open');
  const ahead = () => tasks().filter((t) => t.week_no > current() && t.status === 'open');

  // The lowest-position open task in the current week. Not "today's task":
  // plan_tasks has no date, and a missed Tuesday must not leave a dead card
  // behind. When the week is clear the strip is next, and then the week ahead.
  function defaultCard() {
    const open = weekTasks().find((t) => t.status === 'open');
    if (open) return open;
    return carried()[0] || ahead()[0] || tasks().at(-1) || null;
  }

  function showing() {
    const found = local.showing && tasks().find((t) => t.id === local.showing);
    return found || defaultCard();
  }

  // ------------------------------------------------------------- progress --

  // A 0-5 ring, drawn as five separate arcs rather than one sweep: five tasks map
  // to five weekdays, and a continuous arc at three-fifths reads as a percentage,
  // which is the one thing §10 rules out.
  function ring(done) {
    const segments = Array.from({ length: WEEK_LENGTH }, (_, i) => svg('circle', {
      class: i < done ? 'ring-seg is-done' : 'ring-seg',
      cx: 24, cy: 24, r: 20,
      pathLength: WEEK_LENGTH,
      'stroke-dasharray': `0.78 ${WEEK_LENGTH - 0.78}`,
      'stroke-dashoffset': -i,
    }));
    return svg('svg', {
      class: 'ring', viewBox: '0 0 48 48', width: 48, height: 48, 'aria-hidden': 'true',
    }, segments);
  }

  function progress(body) {
    const week = weekTasks();
    const remaining = week.filter((t) => t.status === 'open').length;
    return el('div', { class: 'progress' }, [
      ring(week.length - remaining),
      el('div', { class: 'progress-text' }, [
        el('p', { class: 'progress-week', text: `${left(remaining)} this week` }),
        el('p', { class: 'note', text: `${body.done_count} of ${body.total} this month` }),
      ]),
    ]);
  }

  // ----------------------------------------------------------- the card --

  function actions(task) {
    if (local.busy) return el('p', { class: 'note', text: 'Saving…' });

    if (task.status === 'done') {
      // One tap to check off is one tap to mis-check. Undo reopens the task and
      // leaves the session row alone: days worked is the number specced never to
      // go down (§10).
      return el('div', { class: 'today-actions' }, [
        el('button', {
          class: 'quiet', type: 'button', text: 'Undo',
          on: {
            click: async () => {
              set({ asking: null, draft: '' });
              await act('undo', () => patchTask(task.id, 'open'));
              ctx.say('Back open.');
            },
          },
        }),
      ]);
    }

    return el('div', { class: 'today-actions' }, [
      el('button', {
        class: 'primary', type: 'button', text: 'Done',
        on: {
          click: async () => {
            await act('done', () => patchTask(task.id, 'done'));
            // The card stays put through the check-off so the note prompt has
            // something to hang off. Answering it, or skipping it, is what moves
            // the screen on.
            if (!local.error) set({ showing: task.id, asking: task.id, draft: '' });
            ctx.say('Done.');
          },
        },
      }),
      el('button', {
        class: 'secondary', type: 'button', text: 'Worked on it',
        on: {
          click: async () => {
            await act('session', () => postSession({
              plan_id: local.body.plan.id, plan_task_id: task.id,
            }));
            ctx.say('Logged. The card stays open.');
          },
        },
      }),
    ]);
  }

  // One optional line, one tap to skip. By month's end there are twenty of them
  // and the stamp headline writes itself — and they accumulate visibly on Plan,
  // so writing one feels like adding to something rather than paying a toll.
  function askNote(task) {
    const input = el('input', {
      type: 'text', id: 'surprise', name: 'surprise', value: local.draft,
      placeholder: 'One line, or skip', maxlength: '280',
      autocapitalize: 'sentences', enterkeyhint: 'done',
      on: { input: (event) => { local.draft = event.target.value; } },
    });

    const move = () => set({ asking: null, draft: '', showing: null });

    return el('form', {
      class: 'ask',
      on: {
        async submit(event) {
          event.preventDefault();
          const note = local.draft.trim();
          if (!note) return move();
          await act('note', () => postSession({
            plan_id: local.body.plan.id, plan_task_id: task.id, note,
          }));
          if (!local.error) move();
          ctx.say('Written down.');
        },
      },
    }, [
      el('label', { for: 'surprise', text: 'What surprised you?' }),
      input,
      el('div', { class: 'today-actions' }, [
        el('button', { class: 'primary', type: 'submit', text: 'Save' }),
        el('button', { class: 'quiet', type: 'button', text: 'Skip', on: { click: move } }),
      ]),
    ]);
  }

  function card(task) {
    const state = stateOf(task);
    const behind = task.week_no < current();
    const eyebrow = `Week ${task.week_no} · ${WEEK_THEMES[task.week_no]}`;

    return el('article', { class: 'today', 'data-state': state }, [
      el('p', { class: 'eyebrow', text: behind ? `${eyebrow} · carried forward` : eyebrow }),
      el('p', { class: 'today-label', text: task.title }),
      // The prompt is the screen. It gets the largest type on the phone, because
      // it is read at arm's length by someone standing over a workbook.
      el('h1', { class: 'today-prompt', text: task.prompt }),
      // The physical workbook is the point of the whole project, and this is the
      // line that removes the daily where-do-I-write-this friction.
      task.workbook_page ? el('p', { class: 'today-page', text: `${task.workbook_page} page` }) : null,
      task.swapped_from_title
        ? el('p', { class: 'note', text: `Swapped in for “${task.swapped_from_title}”` })
        : null,
      STATE_LABEL[state] ? el('p', { class: 'today-state', text: STATE_LABEL[state] }) : null,
      // Undo stays on the card through the note prompt. One tap to check off has
      // to be one tap to un-check off, and burying it behind Skip would make a
      // mis-tap cost three (§7).
      actions(task),
      local.asking === task.id ? askNote(task) : null,
    ]);
  }

  // ------------------------------------------------------------- the pips --

  function pips(up) {
    return el('ul', { class: 'pips' }, weekTasks().map((task, i) => el('li', {}, [
      el('button', {
        class: 'pip', type: 'button',
        'data-state': stateOf(task),
        'aria-current': task.id === up.id ? 'true' : null,
        'aria-label': `${i + 1}. ${task.title}${STATE_LABEL[stateOf(task)] ? `, ${STATE_LABEL[stateOf(task)].toLowerCase()}` : ''}`,
        on: { click: () => set({ showing: task.id, asking: null, draft: '' }) },
      }, [el('span', { 'aria-hidden': 'true', text: String(i + 1) })]),
    ])));
  }

  function strip(up) {
    const rows = carried();
    if (!rows.length) return null;
    return el('div', { class: 'carry' }, [
      el('h2', { text: 'Still open from earlier' }),
      el('ul', { class: 'carry-list' }, rows.map((task) => el('li', {}, [
        el('button', {
          class: 'carry-item', type: 'button',
          'aria-current': task.id === up.id ? 'true' : null,
          'data-state': stateOf(task),
          on: { click: () => set({ showing: task.id, asking: null, draft: '' }) },
        }, [
          el('span', { class: 'carry-week', text: `Week ${task.week_no}` }),
          el('span', { text: task.title }),
        ]),
      ]))),
    ]);
  }

  // ---------------------------------------------------------------- render --

  function paint() {
    if (!local.body) {
      root.replaceChildren(
        local.error
          ? el('p', { class: 'error', role: 'alert', text: local.error })
          : el('p', { class: 'note', text: 'Loading…' }),
      );
      return;
    }

    const body = local.body;
    const up = showing();

    root.replaceChildren(...[
      el('div', { class: 'week-head' }, [
        el('p', { class: 'eyebrow', text: monthName(body.plan.month) }),
        el('p', { class: 'week-country', text: body.plan.country_name }),
      ]),
      progress(body),
      up ? card(up) : null,
      up ? pips(up) : null,
      up ? strip(up) : null,
      local.error ? el('p', { class: 'error', role: 'alert', text: local.error }) : null,
      el('p', { class: 'note' }, [
        el('a', {
          class: 'chrome-link', href: `/plan/${body.plan.id}`, 'data-route': true,
          text: 'The whole month',
        }),
      ]),
    ].filter(Boolean));
  }

  paint();
  load();

  // The shell refetches on every return to the tab, and a plan sitting in a
  // background tab is stale in three ways at once: someone else checked
  // something off, midnight moved the week on, or a swap landed from a laptop.
  root.reload = load;
  return root;
}
