// The worksheet engine: the packer's arithmetic, the spec's coercion, and the
// escaping (DESIGN.md §16).
//
// These are the three things on a printed page that are expensive to get wrong.
// A packer that miscounts a sheet's remaining thirds drops a task out of the
// binder with nothing on screen to say so; a spec read straight out of the
// database makes the library editor's form an injection surface on a page the
// renderer never escapes twice.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import {
  KINDS, THIRDS_PER_SHEET, FALLBACK_LAYOUT,
  packSheets, readSpec, renderForm, renderSegment, segmentFor,
} from '../src/lib/worksheet.js';

const seg = (height) => ({ height_thirds: height });
const shape = (segments) => packSheets(segments).map((s) => s.segments.map((x) => x.height_thirds));

// ------------------------------------------------------------------ packing --

test('three one-third segments fill one sheet', () => {
  assert.deepEqual(shape([seg(1), seg(1), seg(1)]), [[1, 1, 1]]);
});

test('a two-third followed by a two-third does not', () => {
  assert.deepEqual(shape([seg(2), seg(2)]), [[2], [2]]);
});

test('a two-third takes a one-third with it and then breaks', () => {
  assert.deepEqual(shape([seg(2), seg(1), seg(1)]), [[2, 1], [1]]);
});

test('a three-third segment is a sheet on its own', () => {
  assert.deepEqual(shape([seg(1), seg(3), seg(1)]), [[1], [3], [1]]);
});

test('order is never changed to fill a gap', () => {
  // A packer that reordered would put the 1 on the first sheet. The printed
  // order has to match the order on the phone.
  assert.deepEqual(shape([seg(2), seg(2), seg(1)]), [[2], [2, 1]]);
});

test('a sheet holds three thirds and the packer says so once', () => {
  assert.equal(THIRDS_PER_SHEET, 3);
  for (const sheet of packSheets([seg(1), seg(2), seg(3), seg(1), seg(1)])) {
    assert.ok(sheet.thirds <= THIRDS_PER_SHEET);
  }
});

// -------------------------------------------------------------------- specs --

test('a spec keeps the keys its kind has and drops the rest', () => {
  const spec = readSpec('lines', { lines: 6, caption: 'nope', panels: 4 });
  assert.deepEqual(spec, { lines: 6 });
});

test('an out-of-range or unparseable value falls back to the kind default', () => {
  assert.equal(readSpec('lines', { lines: 900 }).lines, 8);
  assert.equal(readSpec('lines', { lines: 'four' }).lines, 8);
  assert.equal(readSpec('lines', 'not json at all').lines, 8);
  assert.equal(readSpec('timeline', {}).ticks, 5);
});

test('a template spec overrides the layout key by key, and only those keys', () => {
  const merged = readSpec('box', '{"caption":"Draw it here","lines":4}', { caption: 'The flag' });
  assert.deepEqual(merged, { caption: 'The flag', lines: 4, callouts: 0 });
});

// ---------------------------------------------------------- the four new kinds --

test('boxes keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('boxes', { boxes: 3, caption: 'Four things', circle_one: true, lines: 6 });
  assert.deepEqual(spec, { boxes: 3, caption: 'Four things', label_lines: 1, circle_one: true });
});

test('boxes falls back on an out-of-range count', () => {
  assert.equal(readSpec('boxes', { boxes: 9 }).boxes, 4);
  assert.equal(readSpec('boxes', {}).boxes, 4);
});

test('venn keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('venn', { labels: ['They eat', 'We eat'], shared: 'Both', panels: 6 });
  assert.deepEqual(spec, { labels: ['They eat', 'We eat'], shared: 'Both', lines_each: 3 });
});

test('venn falls back to two labels when fewer are given', () => {
  assert.deepEqual(readSpec('venn', { labels: ['Only one'] }).labels, ['There', 'Here']);
});

test('chart keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('chart', { mode: 'scale', marks: 3, unit: '°F', boxes: 4 });
  assert.equal(spec.mode, 'scale');
  assert.equal(spec.marks, 3);
  assert.equal(spec.unit, '°F');
  assert.ok(!('boxes' in spec));
});

test('chart falls back to bars mode on an unrecognized value', () => {
  assert.equal(readSpec('chart', { mode: 'pie' }).mode, 'bars');
  assert.equal(readSpec('chart', {}).orient, 'vertical');
});

test('map keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('map', { caption: 'Their biggest river', pins: 3, lines: 4 });
  assert.deepEqual(spec, { caption: 'Their biggest river', pins: 3 });
});

test('map pins is never 1', () => {
  assert.equal(readSpec('map', { pins: 1 }).pins, 5);
});

// ------------------------------------------------------ the slice 13 kinds --

test('pair keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('pair', { captions: ['Then', 'Now'], middle: 'The date', boxes: 4 });
  assert.deepEqual(spec, { captions: ['Then', 'Now'], lines_each: 2, middle: 'The date' });
});

test('pair falls back to two captions when fewer are given', () => {
  assert.deepEqual(readSpec('pair', { captions: ['Only one'] }).captions, ['Before', 'After']);
});

test('an empty middle prints no hinge label, and a filled one does', () => {
  const bare = renderForm('pair', readSpec('pair', {}));
  assert.ok(!bare.includes('pair-hinge-label'));
  const hinged = renderForm('pair', readSpec('pair', { middle: 'The date' }));
  assert.match(hinged, /pair-hinge-label">The date</);
});

test('flow keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('flow', { steps: 5, orient: 'down', caption: 'From X to Y', lines: 4 });
  assert.deepEqual(spec, { steps: 5, orient: 'down', caption: 'From X to Y' });
});

test('flow falls back to across on an unrecognized orient', () => {
  assert.equal(readSpec('flow', { orient: 'sideways' }).orient, 'across');
});

test('flow draws one fewer arrow than steps', () => {
  const html = renderForm('flow', readSpec('flow', { steps: 4 }));
  assert.equal((html.match(/class="flow-step"/g) || []).length, 4);
  assert.equal((html.match(/class="flow-arrow"/g) || []).length, 3);
});

test('grid keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('grid', { rows: 2, per_row: 10, key: 'Each figure =', label_lines: true, panels: 6 });
  assert.deepEqual(spec, {
    rows: 2, per_row: 10, key_rows: 0, key: 'Each figure =', caption: '', label_lines: true,
  });
});

test('grid draws rows of per_row figures, and a row label only when asked', () => {
  const bare = renderForm('grid', readSpec('grid', { rows: 2, per_row: 10 }));
  assert.equal((bare.match(/class="grid-row"/g) || []).length, 2);
  assert.equal((bare.match(/<i><\/i>/g) || []).length, 20);
  assert.ok(!bare.includes('grid-row-label'));
  const labelled = renderForm('grid', readSpec('grid', { rows: 2, label_lines: true }));
  assert.equal((labelled.match(/grid-row-label/g) || []).length, 2);
});

// The two kinds share the `grid` renderer, but never the `split`/`table` one
// — a stray `class="grid"` on an icon array would mean the wrong shape drew.
test('a grid form never carries the two-column table class', () => {
  const html = renderForm('grid', readSpec('grid', {}));
  assert.ok(!html.includes('class="grid"'));
});

test('clocks keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('clocks', { faces: 2, captions: ['A', 'B'], digital_line: false, lines: 3, boxes: 4 });
  assert.deepEqual(spec, { faces: 2, captions: ['A', 'B'], digital_line: false, lines: 3 });
});

test('clocks draws twelve ticks a face and a digital line only when asked', () => {
  const on = renderForm('clocks', readSpec('clocks', { digital_line: true }));
  assert.equal((on.match(/class="clock"/g) || []).length, 2);
  assert.equal((on.match(/clock-digital/g) || []).length, 2);
  assert.equal((on.match(/<i style="left/g) || []).length, 24);
  const off = renderForm('clocks', readSpec('clocks', { digital_line: false }));
  assert.ok(!off.includes('clock-digital'));
});

test('checklist gains a marker, an orient and a caption', () => {
  const spec = readSpec('checklist', {
    items: 5, marker: 'bullet', circle_one: true, orient: 'across', caption: 'Five things',
  });
  assert.deepEqual(spec, {
    items: 5, labels: [], marker: 'bullet', circle_one: true, orient: 'across', caption: 'Five things',
  });
});

test('checklist falls back to a box marker and a list orient on a bad value', () => {
  assert.equal(readSpec('checklist', { marker: 'star' }).marker, 'box');
  assert.equal(readSpec('checklist', { orient: 'diagonal' }).orient, 'list');
});

test('a bullets sheet prints n blank bullets and nothing else', () => {
  const html = renderForm('checklist', readSpec('checklist', { items: 4, marker: 'bullet' }));
  assert.equal((html.match(/tick-bullet/g) || []).length, 4);
  assert.ok(!html.includes('checklist-caption'));
  assert.ok(!html.includes('checklist-hint'));
});

test('marker number and circle_one add a numeral and a foot hint', () => {
  const html = renderForm('checklist', readSpec('checklist', { items: 3, marker: 'number', circle_one: true }));
  assert.match(html, /tick-number">1\./);
  assert.match(html, /checklist-hint/);
});

test('orient across prints exactly the given labels, never padded to items', () => {
  const html = renderForm('checklist', readSpec('checklist', {
    items: 8, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], orient: 'across',
  }));
  assert.equal((html.match(/<li>/g) || []).length, 7);
});

test('orient list still pads to items when labels are fewer', () => {
  const html = renderForm('checklist', readSpec('checklist', { items: 8, labels: ['Glue'] }));
  assert.equal((html.match(/<li>/g) || []).length, 8);
});

// ------------------------------------------------- the real seeded library --

function seededDb() {
  const db = new DatabaseSync(':memory:');
  for (const file of ['001_schema.sql', '002_seed.sql', '004_worksheets.sql', '005_worksheet_layouts.sql']) {
    db.exec(readFileSync(new URL(`../src/migrations/${file}`, import.meta.url), 'utf8'));
  }
  return db;
}

function seededRow(db, slug) {
  return db.prepare(`
    SELECT t.slug, t.title, t.prompt, t.workbook_page,
           w.kind AS layout_kind, w.height_thirds AS layout_height_thirds,
           w.spec AS layout_spec, t.worksheet_spec
    FROM task_templates t JOIN worksheet_layouts w ON w.id = t.worksheet_layout_id
    WHERE t.slug = ?
  `).get(slug);
}

test('time-there-now prints two clock faces with a digits line, not four ruled lines', () => {
  const segment = segmentFor(seededRow(seededDb(), 'time-there-now'));
  assert.equal(segment.kind, 'clocks');
  const html = renderForm(segment.kind, segment.spec);
  assert.equal((html.match(/class="clock"/g) || []).length, 2);
  assert.match(html, /clock-digital/);
});

test('city-and-country prints two rows of ten figures, not a two-column compare', () => {
  const segment = segmentFor(seededRow(seededDb(), 'city-and-country'));
  assert.equal(segment.kind, 'grid');
  const html = renderForm(segment.kind, segment.spec);
  assert.equal((html.match(/class="grid-row"/g) || []).length, 2);
  assert.equal((html.match(/<i><\/i>/g) || []).length, 20);
  assert.ok(!html.includes('class="grid">'));
});

test('MIDDLE prints on border-that-moved and independence-day, and nothing on desert-shall-blossom', () => {
  const db = seededDb();
  for (const slug of ['border-that-moved', 'independence-day']) {
    const segment = segmentFor(seededRow(db, slug));
    assert.equal(segment.kind, 'pair');
    assert.ok(segment.spec.middle, `${slug} should carry a MIDDLE label`);
    assert.match(renderForm(segment.kind, segment.spec), /pair-hinge-label/);
  }
  const desert = segmentFor(seededRow(db, 'desert-shall-blossom'));
  assert.equal(desert.spec.middle, '');
  assert.ok(!renderForm(desert.kind, desert.spec).includes('pair-hinge-label'));
});

test('who-lives-there and how-they-learn are seeded on the two forms with no prior prompt', () => {
  const db = seededDb();
  assert.equal(segmentFor(seededRow(db, 'who-lives-there')).kind, 'grid');
  const bullets = segmentFor(seededRow(db, 'how-they-learn'));
  assert.equal(bullets.kind, 'checklist');
  assert.equal(bullets.spec.marker, 'bullet');
  assert.equal(bullets.spec.caption, 'Five things about how kids there learn');
});

test('every kind reads at least one knob and renders without one', () => {
  for (const kind of Object.keys(KINDS)) {
    const spec = readSpec(kind, {});
    assert.ok(Object.keys(spec).length > 0, kind);
    assert.ok(renderForm(kind, spec).length > 0, kind);
  }
});

// ----------------------------------------------------------------- escaping --

test('a spec carrying markup prints as visible text', () => {
  const html = renderForm('box', readSpec('box', { caption: '<script>alert(1)</script>' }));
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
});

test('a column header carrying markup prints as visible text too', () => {
  const html = renderForm('table', readSpec('table', { columns: ['<b>a</b>', 'b"c'] }));
  assert.ok(!html.includes('<b>'));
  assert.match(html, /&lt;b&gt;a&lt;\/b&gt;/);
});

test('a title, a prompt and a workbook page are escaped as well', () => {
  const html = renderSegment(segmentFor({
    id: 1,
    title: '<img src=x onerror=1>',
    prompt: 'a & b < c',
    workbook_page: '"flag"',
  }));
  assert.ok(!html.includes('<img'));
  assert.match(html, /a &amp; b &lt; c/);
  assert.match(html, /&quot;flag&quot;/);
});

// ----------------------------------------------------------------- fallback --

test('a task with no layout is one third of ruled lines', () => {
  const segment = segmentFor({ id: 1, title: 'T', prompt: 'P', workbook_page: null });
  assert.equal(segment.height_thirds, 1);
  assert.equal(segment.kind, 'lines');
  assert.equal(segment.spec.lines, 8);
  assert.equal(FALLBACK_LAYOUT.height_thirds, 1);
});

test('a layout whose kind has no renderer falls back rather than printing nothing', () => {
  const segment = segmentFor({
    id: 1, title: 'T', prompt: 'P',
    layout_kind: 'hologram', layout_height_thirds: 2, layout_spec: '{}',
  });
  assert.equal(segment.kind, 'lines');
  assert.match(renderForm(segment.kind, segment.spec), /rules/);
});

test('a height outside 1-3 is clamped, so no segment can outgrow a sheet', () => {
  for (const [given, want] of [[0, 1], [9, 3], [null, 1], ['2', 2]]) {
    const segment = segmentFor({
      id: 1, title: 'T', prompt: 'P',
      layout_kind: 'lines', layout_height_thirds: given, layout_spec: '{"lines":4}',
    });
    assert.equal(segment.height_thirds, want, String(given));
  }
});
