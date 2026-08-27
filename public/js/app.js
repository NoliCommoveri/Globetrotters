// The shell: state, the four screens slice 03 owns, and what re-renders them.
//
// Three steps, once per device — passcode, then which of the three you are, then
// the empty state — and then never a login screen again for nine months
// (DESIGN.md §2, §7). Everything below exists to make the third step the only
// one anybody sees twice.

import { getMe, postAuth, patchMe, SignedOut } from './api.js';
import { start, onRoute, go, path } from './router.js';

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

// Elements are built, never interpolated. A person's name comes from the
// database and is typed by a parent on /admin; building it into a string is how
// an apostrophe in a name becomes a rendering bug.
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'on') for (const [type, fn] of Object.entries(value)) node.addEventListener(type, fn);
    else if (key === 'style') node.setAttribute('style', value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

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

// The empty state is an invitation (§11). The country picker it points at is
// slice 04, so the button is here and does not work yet — which is the honest
// shape of it, and better than an invitation with nothing under it at all.
function emptyState() {
  return el('section', { class: 'panel' }, [
    el('h2', { text: 'September' }),
    el('p', { class: 'invitation', text: 'Pick a country to start September' }),
    el('button', { class: 'primary', type: 'button', disabled: true, text: 'Pick a country' }),
    el('p', { class: 'note', text: 'Not open yet.' }),
  ]);
}

function homeScreen() {
  const person = currentPerson();
  const plan = state.me.plans.find((p) => p.person_id === person.id);
  if (!plan) return emptyState();

  // Not the This week screen — that is slice 05, and it is the screen this app
  // is mostly made of. This is the one line that keeps someone who already has
  // a month from being invited to start it again.
  return el('section', { class: 'panel' }, [
    el('h2', { text: plan.month }),
    el('p', { class: 'invitation', text: plan.country_name }),
    el('p', { class: 'note', text: plan.focus_name }),
  ]);
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

function render() {
  const person = currentPerson();
  paintInk(person);

  // The first two steps are not routes. A device without a passcode or without
  // a person gets that screen whatever the URL says, because there is nothing
  // else it could correctly be shown.
  let view;
  if (state.loading && !state.me) view = el('section', { class: 'panel' }, [el('p', { class: 'note', text: 'Loading…' })]);
  else if (!state.signedIn) view = passcodeScreen();
  else if (!person) view = personScreen();
  else if (path() === '/settings') view = settingsScreen();
  else view = homeScreen();

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
if (path() !== '/' && path() !== '/settings') go('/', { replace: true });

load();
