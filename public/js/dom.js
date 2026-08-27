// Element building and the two labels every screen needs.
//
// Elements are built, never interpolated. A country name, a person's name and a
// task prompt all come from the database and are typed by hand somewhere;
// building them into a string is how an apostrophe in "Côte d'Ivoire" becomes a
// rendering bug.

export function el(tag, props = {}, children = []) {
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// '2026-09' -> 'September'. A fixed list rather than Intl: this app speaks one
// language and a month name is not worth a locale database.
export const monthName = (month) => MONTHS[Number(month.slice(5, 7)) - 1] || month;

// '2026-09' -> 'Sep'. The passport's row gutter: nine full month names down the
// side of a three-column grid is most of the width at 360px.
export const monthAbbr = (month) => monthName(month).slice(0, 3);

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// '2026-09-07' -> 'Monday, September 7'. Parsed as UTC: a plain date string has
// no time on it, and reading it through the device's timezone is how a start
// date lands on the Sunday before.
export function longDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[at.getUTCDay()]}, ${MONTHS[m - 1]} ${d}`;
}

// research_depth as a promise about the month rather than a difficulty rating
// (§9). It is the thing that prevents the worst month of the year, and it only
// works if it says what it will feel like.
export const ADVENTURE = {
  1: 'Lots to find',
  2: 'Some digging',
  3: 'You’ll have to hunt',
};

export const adventure = (depth) => ADVENTURE[depth] || ADVENTURE[1];

const SVG_NS = 'http://www.w3.org/2000/svg';

// The week ring is the one drawing in the app, and an SVG node is not an HTML
// node: document.createElement('circle') builds an unknown HTML element that
// renders as nothing at all.
export function svg(tag, props = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

// "3 left", "1 left", "Nothing left". Labelled with what is left rather than
// what is banked: same data, but one of them is an instruction (§10).
export const left = (n) => (n === 0 ? 'Nothing left' : `${n} left`);

// The 0-5 week ring, drawn as separate arcs rather than one sweep: five tasks
// map to five weekdays, and a continuous arc at three-fifths reads as a
// percentage, which is the one thing §10 rules out.
//
// This week and the wall draw the same ring at very different sizes. The size is
// CSS; the geometry is here, once.
export function ring(done, total = 5) {
  const segments = Array.from({ length: total }, (_, i) => svg('circle', {
    class: i < done ? 'ring-seg is-done' : 'ring-seg',
    cx: 24, cy: 24, r: 20,
    pathLength: total,
    'stroke-dasharray': `0.78 ${total - 0.78}`,
    'stroke-dashoffset': -i,
  }));
  return svg('svg', {
    class: 'ring', viewBox: '0 0 48 48', 'aria-hidden': 'true',
  }, segments);
}
