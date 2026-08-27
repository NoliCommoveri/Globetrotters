// The stamp face and the headline chooser — the two pieces both This week and
// the passport need (DESIGN.md §7 Passport, §11).
//
// The stamp is the app's signature and the only place motion is allowed.
// Everything else in the app is paper on navy precisely so that this reads as an
// event when it lands.

import { el, monthName } from './dom.js';

// Rotation and offset are random-looking but derived from the stamp's id, not
// from Math.random(). A face that re-rolls its angle on every repaint jitters
// every time the page refetches — and the passport refetches on every return to
// the tab. Hand-stamped means crooked once, not crooked differently each time
// you look at it.
function hash(n) {
  let h = (n * 2654435761) % 4294967296;
  h ^= h >>> 13;
  return Math.abs(h);
}

export function skew(stamp) {
  const h = hash(stamp.id);
  return {
    rotate: ((h % 71) / 10 - 3.5).toFixed(2),        // -3.5deg .. +3.5deg
    dx: (((h >> 7) % 9) - 4).toFixed(0),             // -4px .. +4px
    dy: (((h >> 11) % 7) - 3).toFixed(0),            // -3px .. +3px
  };
}

// Person, country, month, focus — in that person's ink. The name is on the face
// rather than left to column position because the wall's full-screen stamp has
// no column and a home printer renders all three inks as the same grey (§7).
//
// `compact` drops everything but the country. It is for the wall's grid and
// nowhere else: nine rows of stamps have to share a tablet with the three
// columns above them, and on that grid the row header is already the month and
// the column header is already the person. What is left is the one thing the
// headers do not say — which is also the only line worth reading at that size.
export function stampFace(stamp, { size = 'grid', compact = false } = {}) {
  const { rotate, dx, dy } = skew(stamp);
  const country = el('span', { class: 'stamp-country', text: stamp.country_name });
  return el('div', {
    class: `stamp stamp-${size}${compact ? ' stamp-compact' : ''}`,
    style: `--ink:${stamp.person_color};--rot:${rotate}deg;--dx:${dx}px;--dy:${dy}px`,
  }, compact ? [country] : [
    el('span', { class: 'stamp-person', text: stamp.person_name }),
    country,
    el('span', { class: 'stamp-month', text: monthName(stamp.month) }),
    el('span', { class: 'stamp-focus', text: stamp.focus_name }),
  ]);
}

// ------------------------------------------------------------- headline --

// What the month gets to say for itself. Chosen, never composed: a kid asked to
// summarize a month cold — at the moment they most want to be done — writes "it
// was fun". The notes are already written, twenty tap-sized decisions ago.
//
// The fallback is the completed task titles, because the note prompt is
// skippable twenty times and a month with no notes still deserves a line. None
// is always an option: `headline` is nullable and a blank stamp is a real one.
export function headlineOptions(body) {
  const notes = body.notes.map((row) => row.note).filter(Boolean);
  if (notes.length) return { source: 'notes', options: dedupe(notes) };
  const titles = body.weeks
    .flatMap((w) => w.tasks)
    .filter((t) => t.status === 'done')
    .map((t) => t.title);
  return { source: 'titles', options: dedupe(titles) };
}

const dedupe = (list) => [...new Set(list)];

const PROMPT = {
  notes: 'Pick the one you want on the stamp',
  titles: 'Nothing was written down this month. Pick a task instead, or leave it blank.',
};

// A list of choices and a blank. `onPick` takes the chosen string or null; the
// caller decides what the confirm button says, because "Stamp Peru" and "Save"
// are the same control at two very different moments.
export function headlineChooser({ body, current = null, confirm, onPick, onCancel, busy = false }) {
  const { source, options } = headlineOptions(body);
  let chosen = current;

  const list = el('ul', { class: 'headline-list' });

  function paint() {
    list.replaceChildren(...[null, ...options].map((option) => el('li', {}, [
      el('button', {
        class: 'headline-pick',
        type: 'button',
        disabled: busy,
        'aria-pressed': option === chosen ? 'true' : 'false',
        on: { click: () => { chosen = option; paint(); } },
      }, [
        el('span', {
          class: option === null ? 'headline-none' : 'headline-text',
          text: option === null ? 'No line' : option,
        }),
      ]),
    ])));
  }
  paint();

  return el('div', { class: 'stack headline' }, [
    el('p', { class: 'note', text: PROMPT[source] }),
    list,
    el('div', { class: 'today-actions' }, [
      el('button', {
        class: 'primary', type: 'button', disabled: busy,
        text: busy ? 'Stamping…' : confirm,
        on: { click: () => onPick(chosen) },
      }),
      onCancel
        ? el('button', { class: 'quiet', type: 'button', disabled: busy, text: 'Not yet', on: { click: onCancel } })
        : null,
    ]),
  ]);
}
