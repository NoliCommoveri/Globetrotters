// The passport — the shared family wall, and the artifact the year produces
// (DESIGN.md §7 Passport, §11).
//
// Three columns, nine rows, September through May, drawn whole from day one. An
// unfilled passport is a far stronger invitation than an absent one: it shows
// the shape of the goal in September and makes the full page something you can
// see coming for nine months.
//
// A table rather than a grid of divs, because that is what it is: months down
// the side, people across the top. A screen reader gets the row and column
// headers for free, and it prints as a table without being told to.

import { el, monthName, monthAbbr } from './dom.js';
import { getPassport, getPlan, patchStamp, uncompletePlan, SignedOut } from './api.js';
import { stampFace, headlineChooser } from './stamp.js';

// Which stamps this device has already watched land. Per viewer, not per stamp:
// the phone that earned it, the wall in the kitchen and the other two people on
// next open each get the moment exactly once (§8, §11). Keyed on `earned_at` so
// an un-complete and a re-complete is a new landing rather than a silent one.
const SEEN = 'globetrotters.stamps.seen';

function seen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN) || '{}');
  } catch {
    // Private mode, or a storage quota. A stamp that animates twice is a much
    // smaller failure than a passport that will not render.
    return {};
  }
}

function markSeen(stamps) {
  try {
    const map = seen();
    for (const stamp of stamps) map[stamp.id] = stamp.earned_at;
    localStorage.setItem(SEEN, JSON.stringify(map));
  } catch { /* nothing to do, and nothing worth telling anyone about */ }
}

const isNew = (map, stamp) => map[stamp.id] !== stamp.earned_at;

export function passportScreen(ctx) {
  const root = el('section', { class: 'panel passport-panel' });

  const local = {
    body: null,
    error: null,
    selected: null,     // the stamp id whose detail is open
    editing: null,      // the plan payload the headline chooser is reading
    confirming: false,  // un-complete asks first
    busy: null,         // 'headline' | 'remove'
    // Resolved once per load, before the grid is built: the moment the DOM
    // exists the stamps are already marked seen, so a refetch two minutes later
    // does not replay the animation. A Map rather than a Set because the stagger
    // order has to survive stamps dropping out of it as they finish landing.
    landing: new Map(),
  };

  const set = (patch) => { Object.assign(local, patch); paint(); };

  async function load() {
    try {
      const body = await getPassport();
      const map = seen();
      const fresh = body.stamps.filter((s) => isNew(map, s));
      markSeen(fresh);

      // Anything still in the air stays in the air. A stamp is marked seen the
      // moment it is drawn, so a refetch landing inside the animation — and one
      // always does, because completing refreshes /api/me and every screen
      // reloads behind it — would otherwise rebuild the face without the class
      // and cut the app's signature moment at 100ms.
      const landing = new Map(local.landing);
      for (const stamp of fresh) if (!landing.has(stamp.id)) landing.set(stamp.id, landing.size);

      set({ body, landing, error: null });
    } catch (err) {
      if (err instanceof SignedOut) return ctx.refresh();
      set({ error: err.message });
    }
  }

  // ------------------------------------------------------------ the reading --

  // /api/passport carries the people and the stamps separately — the wall reads
  // the same payload and needs them that way. The face wants one row, so the
  // ink and the name are joined here rather than in a second query.
  function decorate(stamp) {
    const person = local.body.people.find((p) => p.id === stamp.person_id);
    return {
      ...stamp,
      person_name: person ? person.name : 'Someone',
      person_color: person ? person.color : 'var(--paper)',
    };
  }

  const stampAt = (month, personId) => {
    const found = local.body.stamps.find((s) => s.month === month && s.person_id === personId);
    return found ? decorate(found) : null;
  };

  const planAt = (month, personId) =>
    local.body.plans.find((p) => p.month === month && p.person_id === personId) || null;

  const selected = () => {
    if (local.selected == null) return null;
    const found = local.body.stamps.find((s) => s.id === local.selected);
    return found ? decorate(found) : null;
  };

  // ---------------------------------------------------------------- cells --

  function stampCell(stamp) {
    const face = stampFace(stamp);
    if (local.landing.has(stamp.id)) {
      face.classList.add('is-landing');
      // Staggered, so the first open after a weekend where two people finished
      // reads as two stamps rather than one blur.
      face.style.setProperty('--delay', `${(local.landing.get(stamp.id) * 0.22).toFixed(2)}s`);
      // Dropped from the set when it has actually landed, not on the next
      // repaint: opening a stamp's detail mid-flight must not cut the animation
      // off, and a stamp that has finished must not replay it.
      face.addEventListener('animationend', () => local.landing.delete(stamp.id), { once: true });
    }

    return el('button', {
      class: 'slot-button',
      type: 'button',
      'aria-pressed': local.selected === stamp.id ? 'true' : 'false',
      'aria-label': `${stamp.person_name}, ${stamp.country_name}, ${monthName(stamp.month)}, ${stamp.focus_name}`,
      on: {
        click: () => set({
          selected: local.selected === stamp.id ? null : stamp.id,
          editing: null,
          confirming: false,
        }),
      },
    }, [face]);
  }

  // The current month's slot is not blank. In October, September is stamped and
  // October would otherwise look identical to May — throwing away the one piece
  // of live state a family screen can carry (§7).
  function cell(month, person) {
    const stamp = stampAt(month, person.id);
    if (stamp) return el('td', { class: 'slot is-stamped' }, [stampCell(stamp)]);

    const plan = planAt(month, person.id);
    if (plan) {
      return el('td', { class: 'slot is-running' }, [
        el('div', { class: 'slot-inner' }, [
          el('span', { class: 'slot-country', text: plan.country_name }),
          el('span', { class: 'slot-state', text: 'Working on it' }),
        ]),
      ]);
    }

    // A month that has already arrived and has nobody in it says so. A month
    // still ahead is a blank slot, which is the invitation.
    const started = month <= local.body.today.slice(0, 7);
    return el('td', { class: started ? 'slot is-empty' : 'slot is-ahead' }, [
      el('div', { class: 'slot-inner' }, [
        started ? el('span', { class: 'slot-state', text: 'Not started' }) : null,
      ].filter(Boolean)),
    ]);
  }

  function grid() {
    const people = local.body.people;
    return el('table', { class: 'passport' }, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', { class: 'passport-gutter', scope: 'col' }, [
            el('span', { class: 'vh', text: 'Month' }),
          ]),
          ...people.map((person) => el('th', {
            class: 'passport-who', scope: 'col', style: `--ink:${person.color}`,
          }, [el('span', { text: person.name })])),
        ]),
      ]),
      el('tbody', {}, local.body.months.map((month) => el('tr', {
        'aria-current': month === local.body.today.slice(0, 7) ? 'true' : null,
      }, [
        el('th', { class: 'passport-month', scope: 'row' }, [
          el('span', { 'aria-hidden': 'true', text: monthAbbr(month) }),
          el('span', { class: 'vh', text: monthName(month) }),
        ]),
        ...people.map((person) => cell(month, person)),
      ]))),
    ]);
  }

  // --------------------------------------------------------------- detail --

  async function editHeadline(stamp) {
    set({ busy: 'headline' });
    try {
      // The chooser reads the month's notes, and the passport payload does not
      // carry them — twenty-seven months of notes is not a family screen's
      // payload. One fetch, when the pencil is actually picked up.
      set({ editing: await getPlan(stamp.plan_id), busy: null });
    } catch (err) {
      if (err instanceof SignedOut) return ctx.refresh();
      set({ busy: null, error: err.message });
    }
  }

  async function saveHeadline(stamp, headline) {
    set({ busy: 'headline', error: null });
    try {
      await patchStamp(stamp.id, headline);
      set({ editing: null, busy: null });
      await load();
      ctx.say('Saved.');
    } catch (err) {
      if (err instanceof SignedOut) return ctx.refresh();
      set({ busy: null, error: err.message });
    }
  }

  async function remove(stamp) {
    set({ busy: 'remove', error: null });
    try {
      await uncompletePlan(stamp.plan_id);
      set({ busy: null, selected: null, confirming: false, editing: null });
      await load();
      // The month is active again and back on the home screen, so the shell's
      // copy of /api/me is a month out of date.
      ctx.refresh();
      ctx.say(`${stamp.country_name} is open again.`);
    } catch (err) {
      if (err instanceof SignedOut) return ctx.refresh();
      set({ busy: null, error: err.message });
    }
  }

  function removeControl(stamp) {
    if (!local.confirming) {
      return el('button', {
        class: 'quiet', type: 'button', text: 'Remove this stamp',
        disabled: local.busy != null,
        on: { click: () => set({ confirming: true }) },
      });
    }
    // The only destructive control outside /admin. A confirm step, not a typed
    // one: it destroys an earned stamp, and there are no roles here to lean on.
    return el('div', { class: 'stack confirm' }, [
      el('p', { class: 'note', text: `Remove the ${monthName(stamp.month)} stamp? ${stamp.country_name} goes back to twenty of twenty, unstamped.` }),
      el('div', { class: 'today-actions' }, [
        el('button', {
          class: 'danger', type: 'button',
          text: local.busy === 'remove' ? 'Removing…' : 'Remove it',
          disabled: local.busy != null,
          on: { click: () => remove(stamp) },
        }),
        el('button', {
          class: 'quiet', type: 'button', text: 'Keep it',
          disabled: local.busy != null,
          on: { click: () => set({ confirming: false }) },
        }),
      ]),
    ]);
  }

  function detail() {
    const stamp = selected();
    if (!stamp) return null;

    if (local.editing) {
      return el('div', { class: 'stack detail' }, [
        el('h2', { text: `${monthName(stamp.month)} · ${stamp.country_name}` }),
        headlineChooser({
          body: local.editing,
          current: stamp.headline,
          confirm: 'Save',
          busy: local.busy === 'headline',
          onPick: (headline) => saveHeadline(stamp, headline),
          onCancel: () => set({ editing: null }),
        }),
      ]);
    }

    return el('div', { class: 'stack detail' }, [
      stampFace(stamp, { size: 'large' }),
      stamp.headline
        ? el('p', { class: 'detail-headline', text: stamp.headline })
        : el('p', { class: 'note', text: 'No line on this one yet.' }),
      el('div', { class: 'today-actions' }, [
        el('button', {
          class: 'secondary', type: 'button',
          text: local.busy === 'headline' && !local.editing ? 'Opening…' : 'Change the line',
          disabled: local.busy != null,
          on: { click: () => editHeadline(stamp) },
        }),
      ]),
      removeControl(stamp),
    ]);
  }

  // ---------------------------------------------------------------- render --

  function summary() {
    const count = local.body.stamps.length;
    if (count === 0) {
      return el('p', { class: 'invitation', text: 'Nine months, twenty-seven stamps. None of them yet.' });
    }
    return el('p', { class: 'note', text: `${count} of 27 stamped.` });
  }

  function paint() {
    if (!local.body) {
      root.replaceChildren(
        local.error
          ? el('p', { class: 'error', role: 'alert', text: local.error })
          : el('p', { class: 'note', text: 'Loading…' }),
      );
      return;
    }

    root.replaceChildren(...[
      el('div', { class: 'stack passport-head' }, [
        el('h1', { text: 'Passport' }),
        summary(),
      ]),
      grid(),
      detail(),
      local.error ? el('p', { class: 'error', role: 'alert', text: local.error }) : null,
      el('div', { class: 'passport-foot' }, [
        el('button', {
          class: 'quiet', type: 'button', text: 'Print',
          on: { click: () => window.print() },
        }),
        el('a', { class: 'chrome-link', href: '/', 'data-route': true, text: 'Home' }),
      ]),
    ].filter(Boolean));
  }

  paint();
  load();

  // Refetched on every return to the tab, like every screen. This is the one
  // where that matters most: it is the family screen, and what changes on it is
  // somebody else finishing a month.
  root.reload = load;
  return root;
}
