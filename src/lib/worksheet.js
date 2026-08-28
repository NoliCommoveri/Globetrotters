// The printed worksheet engine (DESIGN.md §16).
//
// Pure: rows in, HTML string out. Nothing here touches D1 and nothing here
// builds a Response, which is what lets the packer arithmetic and the escaping
// be tested directly — the two things on a printed page that are expensive to
// get wrong, because the failure is a sheet in a binder with a task missing
// from it.
//
// THE RENDERER NEVER TAKES MARKUP FROM THE DATABASE. Each `kind` has a fixed
// renderer that reads the keys it knows, coerces every one of them, and escapes
// every string it prints. Unknown keys are dropped rather than passed through.
// The library editor (§12) puts a form in front of these fields, so a `spec`
// typed there containing a tag prints as visible text on the page and can do
// nothing else.

import { escapeHtml } from './html.js';

// A sheet holds three thirds. This is the one number the packer runs on and the
// stylesheet divides by; they read it from the same place so they cannot drift.
export const THIRDS_PER_SHEET = 3;

// ---------------------------------------------------------------- the specs --

// Each reader carries what the library editor needs to draw a form field for
// it. The form and the coercion come from the same declaration, so a knob added
// to a kind appears in the editor without a second list to keep in step.
const tag = (fn, meta) => Object.assign(fn, meta);

const int = (min, max, fallback) => tag((raw) => {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}, { type: 'int', min, max });

// A list of short strings. Anything that is not a string is dropped, the list is
// clamped to `max`, and a list that comes back empty falls to the default —
// two labelled columns with no labels is a form nobody can fill in.
const strings = (min, max, fallback) => tag((raw) => {
  if (!Array.isArray(raw)) return fallback;
  const out = raw
    .filter((v) => typeof v === 'string' || typeof v === 'number')
    .map((v) => String(v).trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, max);
  return out.length >= min ? out : fallback;
}, { type: 'list', min, max });

const text = (max, fallback) => tag((raw) => {
  if (typeof raw !== 'string' && typeof raw !== 'number') return fallback;
  const value = String(raw).trim().slice(0, max);
  return value || fallback;
}, { type: 'text', max });

// Every knob every kind has, and the whole of it. A key not named here does not
// reach a page.
export const KINDS = {
  lines: { lines: int(1, 24, 8) },
  box: {
    caption: text(80, 'Draw it here'),
    lines: int(0, 12, 0),
    callouts: int(0, 8, 0),
  },
  split: {
    columns: strings(2, 4, ['There', 'Here']),
    rows: int(1, 16, 5),
  },
  table: {
    columns: strings(2, 5, ['What', 'Where', 'Why it matters']),
    rows: int(1, 16, 6),
  },
  timeline: { ticks: int(2, 10, 5) },
  figures: {
    boxes: int(1, 6, 3),
    captions: strings(0, 6, []),
  },
  checklist: {
    items: int(1, 16, 8),
    labels: strings(0, 16, []),
  },
  storyboard: { panels: int(2, 8, 6) },
};

export const KIND_NAMES = Object.keys(KINDS);

function parseSpec(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// The layout's own spec, then the template's override on top of it, key by key.
// Read through the kind's readers, so what comes out is a fixed set of coerced
// values whatever went in.
export function readSpec(kind, ...specs) {
  const schema = KINDS[kind];
  if (!schema) return {};
  const merged = Object.assign({}, ...specs.map(parseSpec));
  const out = {};
  for (const [key, read] of Object.entries(schema)) out[key] = read(merged[key]);
  return out;
}

// A per-template override. Only the keys the caller actually sent, coerced —
// never filled in with the kind's defaults, because an override that carried
// every key would silently replace the layout's own values with defaults the
// parent never typed. A layout's spec is complete; a template's is a patch.
export function pickSpec(kind, raw) {
  const schema = KINDS[kind];
  if (!schema) return {};
  const source = parseSpec(raw);
  const out = {};
  for (const [key, read] of Object.entries(schema)) {
    if (source[key] !== undefined) out[key] = read(source[key]);
  }
  return out;
}

// What a task with no binding prints: its prompt over eight ruled lines, in one
// third. One third rather than two is what keeps an unbound month at about
// seven sheets — the same twenty tasks bound to drawing boxes run to eight or
// nine, which is the room the bindings buy (§16).
export const FALLBACK_LAYOUT = { kind: 'lines', height_thirds: 1, spec: '{"lines":8}' };

// ------------------------------------------------------------- the renderers --

const rules = (n) => `<div class="rules">${'<i></i>'.repeat(n)}</div>`;

const RENDER = {
  lines: (spec) => rules(spec.lines),

  // One box. `lines` puts writing room beside it and `callouts` puts labelled
  // leader lines down the side; a layout uses one or the other or neither.
  box: (spec) => {
    const caption = `<figcaption>${escapeHtml(spec.caption)}</figcaption>`;
    const box = `<figure class="box"><div class="ink"></div>${caption}</figure>`;
    if (spec.lines > 0) return `<div class="beside">${box}<div class="beside-notes">${rules(spec.lines)}</div></div>`;
    if (spec.callouts > 0) {
      const tags = Array.from({ length: spec.callouts }, () => '<li><span class="lead"></span></li>').join('');
      return `<div class="beside">${box}<ol class="callouts">${tags}</ol></div>`;
    }
    return box;
  },

  split: (spec) => {
    const head = spec.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
    const body = Array.from(
      { length: spec.rows },
      () => `<tr>${spec.columns.map(() => '<td></td>').join('')}</tr>`,
    ).join('');
    return `<table class="grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  },

  table: (spec) => RENDER.split(spec),

  timeline: (spec) => {
    const ticks = Array.from(
      { length: spec.ticks },
      () => '<li><span class="tick"></span><span class="slot"></span></li>',
    ).join('');
    return `<div class="timeline"><ol>${ticks}</ol></div>`;
  },

  figures: (spec) => {
    const cells = Array.from({ length: spec.boxes }, (_, i) => {
      const caption = spec.captions[i] ? escapeHtml(spec.captions[i]) : '&nbsp;';
      return `<li><div class="ink"></div><span>${caption}</span></li>`;
    }).join('');
    return `<ul class="figures">${cells}</ul>`;
  },

  // `labels` names the items — week 4's materials arrive this way. `items` is
  // how many lines there are in total, so a list of three named materials on an
  // eight-item form still leaves five blanks to add to.
  checklist: (spec) => {
    const count = Math.max(spec.items, spec.labels.length);
    const rows = Array.from({ length: count }, (_, i) => {
      const label = spec.labels[i] ? escapeHtml(spec.labels[i]) : '';
      return `<li><span class="tick-box"></span><span class="label">${label}</span></li>`;
    }).join('');
    return `<ul class="checklist">${rows}</ul>`;
  },

  storyboard: (spec) => {
    const panels = Array.from(
      { length: spec.panels },
      (_, i) => `<li><span class="panel-no">${i + 1}</span></li>`,
    ).join('');
    return `<ol class="storyboard">${panels}</ol>`;
  },
};

// The form under one segment's prompt. An unknown kind — a row written before a
// renderer existed, or archived out from under a binding — falls to the ruled
// lines rather than printing nothing.
export function renderForm(kind, spec) {
  const render = RENDER[kind];
  if (!render) return RENDER.lines(readSpec('lines', FALLBACK_LAYOUT.spec));
  return render(spec);
}

// ---------------------------------------------------------------- segments --

// One task's slot on paper: its workbook_page label, its title, its prompt in
// full, and the form under it (§16). The prompt is the instruction, not a
// title — a sheet that names the task without saying what to do sends the kid
// back to the phone.
export function segmentFor(task) {
  const layout = task.layout_kind
    ? { kind: task.layout_kind, height_thirds: task.layout_height_thirds, spec: task.layout_spec }
    : FALLBACK_LAYOUT;
  const kind = KINDS[layout.kind] ? layout.kind : FALLBACK_LAYOUT.kind;
  const height = Math.min(Math.max(Number(layout.height_thirds) || 1, 1), THIRDS_PER_SHEET);
  return {
    id: task.id,
    title: task.title,
    prompt: task.prompt,
    page: task.workbook_page || null,
    kind,
    height_thirds: height,
    spec: readSpec(kind, layout.spec, task.worksheet_spec),
  };
}

export function renderSegment(segment) {
  const page = segment.page
    ? `<span class="seg-page">${escapeHtml(segment.page)}</span>`
    : '';
  return `<section class="segment" style="--thirds:${segment.height_thirds}">
<header class="seg-head">${page}<h2>${escapeHtml(segment.title)}</h2></header>
<p class="seg-prompt">${escapeHtml(segment.prompt)}</p>
<div class="seg-form">${renderForm(segment.kind, segment.spec)}</div>
</section>`;
}

// ------------------------------------------------------------------ packing --

// Segments in position order, never reordered: the printed order has to match
// the order on the phone or the kid cannot find the page the card points at.
//
// Place into the current sheet while it has room, otherwise start a new one. A
// segment taller than a sheet cannot happen — `height_thirds` is capped at
// three by the schema and again in segmentFor — so there is no split case and a
// segment never crosses a page break.
export function packSheets(segments, perSheet = THIRDS_PER_SHEET) {
  const sheets = [];
  let current = null;
  for (const segment of segments) {
    if (!current || current.thirds + segment.height_thirds > perSheet) {
      current = { thirds: 0, segments: [] };
      sheets.push(current);
    }
    current.thirds += segment.height_thirds;
    current.segments.push(segment);
  }
  return sheets;
}
