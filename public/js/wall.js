// The wall tablet (DESIGN.md §8).
//
// A screen nobody touches, awake for nine months, read from six feet away. That
// shapes every decision in this file:
//
// - It never launches and never changes visibility, so the refresh every other
//   screen gets for free has to be built here: a five-minute heartbeat against
//   two aggregates, and a control big enough to hit from standing.
// - It reboots. The cookie survives that and so does the stamp watermark, which
//   is why both live outside memory.
// - It has no controls that write. Not one, anywhere below.
//
// The payoff is the stamp: someone finishes Peru in their bedroom and it lands
// in the kitchen within five minutes, full-screen, before settling into the grid.

import { el, ring, monthName, monthAbbr, left } from './dom.js';
import { getWall, getWallVersion, postAuth, SignedOut } from './api.js';
import { stampFace } from './stamp.js';

const root = document.getElementById('wall');
const statusLine = document.getElementById('status');

const say = (message) => { statusLine.textContent = message || ''; };

// Five minutes, against two rows and no payload. A 30-second poll of the whole
// view is three orders of magnitude more D1 reads for a screen that changes
// about three times a day, and the account's row budget is shared with every
// other database on it (§8).
const HEARTBEAT_MS = 5 * 60 * 1000;

// How often the "updated Nm ago" line re-reads the clock. No requests — this is
// arithmetic against a timestamp already in memory.
const TICK_MS = 30 * 1000;

// About half a minute per stamp, then it settles into the grid. Long enough
// that somebody who walks into the kitchen mid-landing still sees what happened.
const SHOWCASE_MS = 30 * 1000;

const state = {
  body: null,
  version: null,
  checkedAt: null,   // last successful contact with the server, heartbeat or full
  error: null,
  signedOut: false,
  refreshing: false,
};

// ------------------------------------------------------------- watermark --

// Which stamps this tablet has already played. Persisted, because the reboot the
// long-lived cookie exists to survive would otherwise take it — and seeded to the
// current time rather than to zero, because a wall that seeds to zero replays all
// twenty-seven stamps of the year in sequence the first time it comes back up
// (§8).
const WATERMARK = 'globetrotters.wall.watermark';

// The same shape `earned_at` is written in, so the two compare as strings.
const timestamp = (at) => at.toISOString().replace(/\.\d+Z$/, 'Z');

function writeMark(value) {
  try {
    localStorage.setItem(WATERMARK, value);
  } catch { /* private mode, or a quota. The in-memory copy still holds. */ }
}

function readMark() {
  try {
    const stored = localStorage.getItem(WATERMARK);
    if (stored) return stored;
  } catch { /* falls through to seeding, which is the safe direction */ }
  const now = timestamp(new Date());
  writeMark(now);
  return now;
}

let mark = readMark();

// ---------------------------------------------------------- stamp replay --

// Queued rather than stacked: if two people cross 20/20 inside one heartbeat
// window — which is what the last day of the month looks like — the second stamp
// waits for the first to finish (§8).
const queue = [];
let playing = false;

function decorate(stamp) {
  const person = state.body.people.find((p) => p.id === stamp.person_id);
  return {
    ...stamp,
    person_name: person ? person.name : 'Someone',
    person_color: person ? person.color : 'var(--paper)',
  };
}

// The watermark moves the moment a stamp is queued, not when it finishes
// playing. A refetch always lands inside a showcase — the heartbeat keeps
// running — and a watermark that waited for the animation would queue the same
// stamp again on the next pass.
function enqueue(stamps) {
  const fresh = stamps
    .filter((s) => s.earned_at > mark)
    .sort((a, b) => (a.earned_at < b.earned_at ? -1 : 1));
  if (!fresh.length) return;

  for (const stamp of fresh) queue.push(decorate(stamp));
  mark = fresh[fresh.length - 1].earned_at;
  writeMark(mark);
  play();
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// Full-screen, over everything, for about half a minute. The overlay is appended
// rather than rendered into the view, so a repaint underneath it — and the
// heartbeat causes those — cannot cut the app's signature moment short.
async function showcase(stamp) {
  const face = stampFace(stamp, { size: 'wall' });
  face.classList.add('is-landing');

  const overlay = el('div', { class: 'wall-showcase', style: `--ink:${stamp.person_color}` }, [
    el('p', { class: 'wall-showcase-lede', text: `${stamp.person_name} finished ${stamp.country_name}` }),
    face,
    stamp.headline ? el('p', { class: 'wall-showcase-line', text: stamp.headline }) : null,
  ]);

  document.body.append(overlay);
  say(`${stamp.person_name} finished ${stamp.country_name}.`);
  await wait(SHOWCASE_MS);
  overlay.remove();
}

async function play() {
  if (playing) return;
  playing = true;
  while (queue.length) await showcase(queue.shift());
  playing = false;
  // The grid underneath may have been rebuilt several times while that ran.
  paint();
}

// ------------------------------------------------------------- the fetch --

async function loadFull() {
  const body = await getWall();
  state.body = body;
  state.checkedAt = new Date();
  state.error = null;
  state.signedOut = false;
  paint();
  enqueue(body.stamps);
}

// The heartbeat. Compared for inequality and not for growth: undo nulls
// `completed_at` and removing a stamp deletes the row behind MAX(earned_at), so
// this value can move backwards, and a `>` here leaves the wall permanently
// stale after any undo (Q-09).
async function beat() {
  try {
    const { version } = await getWallVersion();
    state.checkedAt = new Date();
    if (version !== state.version) {
      state.version = version;
      await loadFull();
    } else {
      tick();
    }
  } catch (err) {
    fail(err);
  }
}

async function refresh() {
  state.refreshing = true;
  state.error = null;
  paint();
  try {
    // The version is read before the payload, here and in the heartbeat, and
    // never after it. A write landing between the two then leaves the stored
    // version older than what is on screen, which costs one extra fetch on the
    // next beat — the other order leaves it newer, and the wall goes stale until
    // something else changes.
    const { version } = await getWallVersion();
    state.version = version;
    await loadFull();
    say('Up to date.');
  } catch (err) {
    fail(err);
  } finally {
    state.refreshing = false;
    paint();
  }
}

function fail(err) {
  if (err instanceof SignedOut) {
    state.signedOut = true;
    state.body = null;
  } else {
    // The last good view stays on screen behind the message. A kitchen tablet
    // that blanks itself because the wifi dropped for ninety seconds is worse
    // than one showing a view from ten minutes ago and saying so.
    state.error = err.message;
  }
  paint();
}

// -------------------------------------------------------------- the view --

// "Updated 4m ago", from the last successful contact with the server — the
// heartbeat counts, because a heartbeat that answers with the same version is
// proof the screen is current. When the network goes, this is what grows.
function updatedAgo() {
  if (!state.checkedAt) return 'Not updated yet';
  const minutes = Math.floor((Date.now() - state.checkedAt.getTime()) / 60000);
  if (minutes < 1) return 'Updated just now';
  if (minutes === 1) return 'Updated 1 minute ago';
  if (minutes < 60) return `Updated ${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? 'Updated an hour ago' : `Updated ${hours} hours ago`;
}

// Three columns, always three, always in `people.sort_order`. Nothing on this
// screen sorts by progress and nothing on it compares two people: no
// percentages, no ahead or behind, and no month count — which is why the payload
// does not carry one (§8).
function column(person, entry) {
  const plan = entry ? entry.plan : null;

  const body = plan
    ? [
      el('p', { class: 'wall-country', text: plan.country_name }),
      el('p', { class: 'wall-focus', text: plan.focus_name }),
      el('div', { class: 'wall-ring' }, [
        ring(plan.week_done, plan.week_total || 5),
        el('p', {
          class: 'wall-week',
          // A finished month is not counting anything any more. It says so
          // rather than showing a ring the calendar has walked past.
          text: plan.status === 'complete'
            ? 'Stamped'
            : `${left(Math.max(0, plan.week_total - plan.week_done))} this week`,
        }),
      ]),
    ]
    // The blank column, which is what September 1st looks like. An invitation,
    // not a deficit: §7 hands all of this app's "nobody has started yet"
    // pressure to this screen and it gets written rather than left as an empty
    // box (§8).
    : [
      el('p', { class: 'wall-country is-empty', text: 'No country yet' }),
      el('p', { class: 'wall-focus', text: 'Pick one and this fills in' }),
    ];

  return el('li', { class: 'wall-column', style: `--ink:${person.color}` }, [
    el('p', { class: 'wall-who', text: person.name }),
    ...body,
  ]);
}

function columns() {
  return el('ol', { class: 'wall-columns' }, state.body.people.map((person) => column(
    person,
    state.body.columns.find((c) => c.person_id === person.id),
  )));
}

// The same nine rows the passport draws, and drawn blank from day one for the
// same reason: an unfilled year shows the shape of the goal. No buttons in it —
// there is no detail view here and nothing to open.
function grid() {
  const { people, months, stamps, plans, today } = state.body;
  const now = today.slice(0, 7);

  const cell = (month, person) => {
    const stamp = stamps.find((s) => s.month === month && s.person_id === person.id);
    // Wrapped in the same .slot-inner the passport uses: a table cell's height
    // is a minimum rather than a definite value, so a stamp asked to fill one
    // fills nothing. The block inside it is what holds the nine rows equal.
    if (stamp) {
      return el('td', { class: 'slot is-stamped' }, [
        el('div', { class: 'slot-inner' }, [stampFace(decorate(stamp), { compact: true })]),
      ]);
    }

    const plan = plans.find((p) => p.month === month && p.person_id === person.id);
    if (plan) {
      return el('td', { class: 'slot is-running' }, [
        el('div', { class: 'slot-inner' }, [
          el('span', { class: 'slot-country', text: plan.country_name }),
        ]),
      ]);
    }
    return el('td', { class: month <= now ? 'slot is-empty' : 'slot is-ahead' }, [
      el('div', { class: 'slot-inner' }),
    ]);
  };

  return el('table', { class: 'passport wall-grid' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { class: 'passport-gutter', scope: 'col' }, [el('span', { class: 'vh', text: 'Month' })]),
        ...people.map((person) => el('th', {
          class: 'passport-who', scope: 'col', style: `--ink:${person.color}`,
        }, [el('span', { text: person.name })])),
      ]),
    ]),
    el('tbody', {}, months.map((month) => el('tr', {
      'aria-current': month === now ? 'true' : null,
    }, [
      el('th', { class: 'passport-month', scope: 'row' }, [
        el('span', { 'aria-hidden': 'true', text: monthAbbr(month) }),
        el('span', { class: 'vh', text: monthName(month) }),
      ]),
      ...people.map((person) => cell(month, person)),
    ]))),
  ]);
}

// The family number is the headline and the individual rings are quiet
// underneath it. That order is the rule: three people doing an identical
// twenty-task structure side by side is implicitly a leaderboard, and the one
// number that belongs to everybody is the one that gets to be huge (§8).
function headline() {
  const count = state.body.stamp_count;
  if (count === 0) {
    return el('div', { class: 'wall-headline' }, [
      el('p', { class: 'wall-count', text: 'No stamps yet' }),
      el('p', { class: 'wall-lede', text: 'Nine months, twenty-seven stamps. It starts when somebody picks a country.' }),
    ]);
  }
  return el('div', { class: 'wall-headline' }, [
    el('p', { class: 'wall-count', text: `${count} ${count === 1 ? 'stamp' : 'stamps'}` }),
    el('p', { class: 'wall-lede', text: 'this year' }),
  ]);
}

// Sized to be hit from standing, with a pencil in the other hand. Every other
// screen in the app refreshes on launch and on visibilitychange; this one never
// launches and never changes visibility, which is exactly why it needs a control.
function foot() {
  return el('div', { class: 'wall-foot' }, [
    el('button', {
      class: 'wall-refresh', type: 'button',
      text: state.refreshing ? 'Checking…' : 'Refresh',
      disabled: state.refreshing,
      on: { click: refresh },
    }),
    el('p', { class: 'wall-updated', text: updatedAgo() }),
    state.error ? el('p', { class: 'error', role: 'alert', text: state.error }) : null,
  ]);
}

// The one thing on this screen anybody types into, and they type into it once.
function passcode() {
  const input = el('input', {
    type: 'password', id: 'wall-passcode', name: 'passcode',
    autocomplete: 'current-password', autocapitalize: 'off', autocorrect: 'off',
    spellcheck: 'false', enterkeyhint: 'go',
  });
  const button = el('button', { class: 'primary', type: 'submit', text: 'Enter' });

  const form = el('form', {
    class: 'card',
    on: {
      async submit(event) {
        event.preventDefault();
        button.disabled = true;
        button.textContent = 'Checking…';
        try {
          // The wall's own cookie, not the family's. It reaches two read routes
          // and is refused on every write in the app (§8, Q-10).
          await postAuth(input.value, { wall: true });
          state.signedOut = false;
          state.error = null;
          await refresh();
        } catch (err) {
          state.error = err instanceof SignedOut ? 'That passcode is not right' : err.message;
          paint();
          document.getElementById('wall-passcode')?.focus();
        }
      },
    },
  }, [
    el('label', { for: 'wall-passcode', text: 'Family passcode' }),
    input,
    button,
  ]);

  queueMicrotask(() => input.focus());

  return el('section', { class: 'panel' }, [
    el('h1', { text: 'Globetrotters' }),
    el('p', { class: 'lede', text: 'The kitchen screen.' }),
    form,
    state.error ? el('p', { class: 'error', role: 'alert', text: state.error }) : null,
    el('p', { class: 'note', text: 'Typed once on this tablet, then not again for a year. This screen only ever reads.' }),
  ]);
}

function paint() {
  if (state.signedOut) return root.replaceChildren(passcode());
  if (!state.body) {
    return root.replaceChildren(
      state.error
        ? el('section', { class: 'panel' }, [el('p', { class: 'error', role: 'alert', text: state.error })])
        : el('section', { class: 'panel' }, [el('p', { class: 'note', text: 'Loading…' })]),
    );
  }
  root.replaceChildren(el('div', { class: 'wall-view' }, [headline(), columns(), grid(), foot()]));
}

// Only the one line moves. Rebuilding the whole view every thirty seconds would
// restart the grid's stamp animations on a screen that is meant to sit still.
function tick() {
  const line = root.querySelector('.wall-updated');
  if (line) line.textContent = updatedAgo();
}

// ------------------------------------------------------------- wake lock --

// It drops on every visibilitychange and it does not exist at all on older iPad
// Safari, which is a fair description of a wall tablet (D-14). Where it is
// missing the fallback is the tablet's own display-sleep and Guided Access
// settings, not a workaround here.
let lock = null;

async function keepAwake() {
  if (!('wakeLock' in navigator)) return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => { lock = null; });
  } catch {
    // Denied, or the tab is not visible. Trying again on the next
    // visibilitychange is the whole recovery.
    lock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  keepAwake();
  // The tablet was asleep or backgrounded, so the heartbeat may have been
  // throttled to nothing while it was. Catch up rather than wait out the
  // remainder of a five-minute window.
  beat();
});

// -------------------------------------------------------------- start up --

paint();
keepAwake();
refresh();
setInterval(beat, HEARTBEAT_MS);
setInterval(tick, TICK_MS);
