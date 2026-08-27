// The shell: state, the four screens slice 03 owns, and what re-renders them.
//
// Three steps, once per device — passcode, then which of the three you are, then
// the empty state — and then never a login screen again for nine months
// (DESIGN.md §2, §7). Everything below exists to make the third step the only
// one anybody sees twice.

import { getMe, postAuth, patchMe, SignedOut } from './api.js';
import { start, onRoute, go, path } from './router.js';
import { el, monthName } from './dom.js';
import { setupScreen } from './setup.js';
import { planScreen } from './plan.js';
import { weekScreen } from './week.js';

const main = document.getElementById('main');
const chrome = document.getElementById('chrome');
const statusLine = document.getElementById('status');

const state = {
  signedIn: false,
  me: null,      // { person_id, people, plans } once /api/me has answered
  error: null,   // a message from the last failed call, shown on the screen
  loading: true,
};

// ---------------------------------------------------------------- helpers --

// el() and the two shared labels live in ./dom.js — three screens build
// elements now, and a country name has to survive an apostrophe in every one of
// them.

function say(message) {
  statusLine.textContent = message || '';
}

function currentPerson() {
  if (!state.me || state.me.person_id == null) return null;
  return state.me.people.find((p) => p.id === state.me.person_id) || null;
}

// The current person's ink, live, as the one variable the whole stylesheet
// reads. Cleared when nobody is picked: before you say who you are, nothing on
// screen is yours and nothing on screen is colorful (§11).
function paintInk(person) {
  document.documentElement.style.setProperty('--ink', person ? person.color : 'var(--paper)');
}

// --------------------------------------------------------------- screens --

function passcodeScreen() {
  const input = el('input', {
    type: 'password',
    id: 'passcode',
    name: 'passcode',
    autocomplete: 'current-password',
    autocapitalize: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'go',
  });
  const button = el('button', { class: 'primary', type: 'submit', text: 'Enter' });
  const error = el('p', { class: 'error', role: 'alert', text: state.error || '' });

  const form = el('form', {
    class: 'card',
    on: {
      async submit(event) {
        event.preventDefault();
        button.disabled = true;
        button.textContent = 'Checking…';
        state.error = null;
        try {
          await postAuth(input.value);
          say('');
          await load();
        } catch (err) {
          state.error = err instanceof SignedOut ? 'That passcode is not right' : err.message;
          render();
          document.getElementById('passcode')?.focus();
        }
      },
    },
  }, [
    el('label', { for: 'passcode', text: 'Family passcode' }),
    input,
    button,
  ]);

  // Autofocus is right here and nowhere else in the app: this screen exists to
  // be typed into, and it is shown once per device.
  queueMicrotask(() => input.focus());

  return el('section', { class: 'panel' }, [
    el('h1', { text: 'Globetrotters' }),
    el('p', { class: 'lede', text: 'One country a month, ten minutes a day.' }),
    form,
    state.error ? error : null,
    el('p', { class: 'note', text: 'Typed once on this device, then not again for a year.' }),
  ]);
}

function personScreen() {
  const list = el('ul', { class: 'people' }, state.me.people.map((person) => el('li', {}, [
    el('button', {
      class: 'person',
      type: 'button',
      style: `--ink:${person.color}`,
      on: {
        async click(event) {
          const button = event.currentTarget;
          button.disabled = true;
          try {
            await patchMe(person.id);
            await load();
            say(`You are ${person.name}.`);
          } catch (err) {
            button.disabled = false;
            state.error = err instanceof SignedOut ? null : err.message;
            if (err instanceof SignedOut) state.signedIn = false;
            render();
          }
        },
      },
    }, [
      el('span', { class: 'swatch', 'aria-hidden': 'true' }),
      el('span', { text: person.name }),
    ]),
  ])));

  return el('section', { class: 'panel' }, [
    el('h1', { text: 'Who is this?' }),
    el('p', { class: 'lede', text: 'This device remembers. You can change it in settings.' }),
    list,
    state.error ? el('p', { class: 'error', role: 'alert', text: state.error }) : null,
  ]);
}

// The empty state is an invitation (§11), and the month it names comes from the
// family's own clock rather than from the device's — a phone on a trip is in the
// wrong timezone, and over the summer the invitation points at the September
// ahead.
function emptyState(month, unfinished) {
  return el('section', { class: 'panel' }, [
    el('h2', { text: monthName(month) }),
    el('p', { class: 'invitation', text: `Pick a country to start ${monthName(month)}` }),
    el('button', {
      class: 'primary', type: 'button', text: 'Pick a country',
      on: { click: () => go('/setup') },
    }),
    // A month that ran past its own end is not a reason to hide the invitation
    // to the next one — the finish line is the month, and there is no lockout
    // anywhere in this app (§15). It is a reason to keep a way back to it.
    unfinished ? el('p', { class: 'note' }, [
      el('a', {
        class: 'chrome-link', href: `/plan/${unfinished.id}`, 'data-route': true,
        text: `${monthName(unfinished.month)} is still open — ${unfinished.country_name}`,
      }),
    ]) : null,
  ]);
}

// The month this person is on right now, if there is one. An older month left
// unfinished is not it — it is the way back on the empty state.
function homePlan(person) {
  const mine = state.me.plans.filter((p) => p.person_id === person.id);
  return { plan: mine.find((p) => p.month === state.me.month) || null, unfinished: mine[0] };
}

function settingsScreen() {
  const person = currentPerson();

  const list = el('ul', { class: 'people' }, state.me.people.map((other) => el('li', {}, [
    el('button', {
      class: 'person',
      type: 'button',
      style: `--ink:${other.color}`,
      'aria-current': other.id === person.id ? 'true' : null,
      on: {
        async click() {
          if (other.id === person.id) return;
          try {
            await patchMe(other.id);
            await load();
            say(`You are ${other.name}.`);
          } catch (err) {
            state.error = err.message;
            render();
          }
        },
      },
    }, [
      el('span', { class: 'swatch', 'aria-hidden': 'true' }),
      el('span', { text: other.name }),
      other.id === person.id ? el('span', { class: 'person-mine', text: 'You' }) : null,
    ]),
  ])));

  return el('section', { class: 'panel' }, [
    el('h1', { text: 'Settings' }),
    el('h2', { text: 'Who is using this device' }),
    list,
    state.error ? el('p', { class: 'error', role: 'alert', text: state.error }) : null,
    el('p', {
      class: 'note',
      text: 'Switching is instant and changes nothing but this device. Everyone’s work stays theirs.',
    }),
    el('p', { class: 'note' }, [el('a', { class: 'chrome-link', href: '/', 'data-route': true, text: 'Back' })]),
  ]);
}

// ---------------------------------------------------------------- render --

// Setup and the reveal own state the shell does not have — which stage you are
// on, which country you tapped through to — so they are built once per route and
// reused. Every return to the tab calls load(), and rebuilding them there would
// throw away a half-finished setup every time a kid checked a message.
let mounted = null;

// The plan the reveal would otherwise have to fetch: POST /api/plans already
// answered with it, and re-asking for it is a spinner over a screen that is the
// whole point of the ceremony.
let preloaded = null;

function goWith(to, body) {
  preloaded = body || null;
  go(to);
  // A plan was just created, so the shell's copy of /api/me — which is what the
  // home screen reads — is a month out of date. Refreshing it here is what keeps
  // Home from inviting someone to start a month they are already looking at.
  if (body) load();
}

function screenFor(person) {
  const here = path();
  const planId = here.match(/^\/plan\/(\d+)$/)?.[1];

  // This week is the default view, so it lives at `/` rather than on a route of
  // its own. It is keyed on the plan and not on the path: a month rolling over
  // has to build a new screen, and a return to the tab must not throw away which
  // card is up.
  if (here === '/') {
    const { plan, unfinished } = homePlan(person);
    if (!plan) { mounted = null; return emptyState(state.me.month, unfinished); }
    const key = `/week/${plan.id}`;
    if (mounted?.key === key) return mounted.node;
    const node = weekScreen({ id: plan.id, say, refresh: load });
    mounted = { key, node };
    return node;
  }

  if (mounted && mounted.key === here) return mounted.node;

  if (here === '/setup') {
    const node = setupScreen({
      month: state.me.month,
      say,
      go: goWith,
      refresh: load,
    });
    mounted = { key: here, node };
    return node;
  }

  if (planId) {
    const body = preloaded;
    preloaded = null;
    const node = planScreen({
      id: Number(planId),
      personId: person.id,
      preloaded: body && String(body.plan.id) === planId ? body : null,
      say,
      go: goWith,
      refresh: load,
    });
    mounted = { key: here, node };
    return node;
  }

  mounted = null;
  return settingsScreen();
}


function render() {
  const person = currentPerson();
  paintInk(person);

  // The first two steps are not routes. A device without a passcode or without
  // a person gets that screen whatever the URL says, because there is nothing
  // else it could correctly be shown.
  let view;
  if (state.loading && !state.me) view = el('section', { class: 'panel' }, [el('p', { class: 'note', text: 'Loading…' })]);
  else if (!state.signedIn || !person) {
    // Signing out or losing the person drops whatever was mounted: a setup
    // half-finished by one person must not come back under another.
    mounted = null;
    view = state.signedIn ? personScreen() : passcodeScreen();
  } else view = screenFor(person);

  chrome.hidden = !person;
  main.replaceChildren(view);
}

// Called on launch, after every screen-changing write, and on every return to
// the tab. Identity is per-device and the same person is equally real on a
// phone and a laptop (§2), so a screen that has been sitting in a background
// tab is assumed stale rather than current.
async function load() {
  try {
    state.me = await getMe();
    state.signedIn = true;
    state.error = null;
  } catch (err) {
    if (err instanceof SignedOut) {
      state.signedIn = false;
      state.me = null;
    } else {
      state.error = err.message;
      say(err.message);
    }
  } finally {
    state.loading = false;
    render();
    // A screen that owns its own fetch is stale for the same reason the shell
    // was: it has been sitting in a background tab. render() reuses the mounted
    // node rather than rebuilding it, so the refetch has to be asked for.
    mounted?.node?.reload?.();
  }
}

start();
onRoute(render);

// Refetch on launch and on visibilitychange, app-wide (§2). pageshow catches
// the case visibilitychange does not: iOS Safari restoring the page whole from
// the back-forward cache, where the tab was never hidden.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') load();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) load();
});

// A path the shell has no screen for is a bookmark from a later slice or a
// typo. Land it on the default view rather than on nothing.
const KNOWN = [/^\/$/, /^\/settings$/, /^\/setup$/, /^\/plan\/\d+$/];
if (!KNOWN.some((p) => p.test(path()))) go('/', { replace: true });

load();
