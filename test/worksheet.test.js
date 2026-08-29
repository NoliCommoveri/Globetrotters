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
  assert.deepEqual(merged, { caption: 'The flag', lines: 4, callouts: 0, below: false });
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

// ------------------------------------------------------ the slice 14 kinds --

test('fields keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('fields', {
    captions: ['What it is', 'How old it is', 'Where it was dug up'], lines_each: 1, boxes: 4,
  });
  assert.deepEqual(spec, {
    captions: ['What it is', 'How old it is', 'Where it was dug up'], lines_each: 1,
  });
});

test('fields falls back to three blank captions when fewer than two are given', () => {
  assert.deepEqual(readSpec('fields', { captions: ['Only one'] }).captions, ['', '', '']);
  assert.deepEqual(readSpec('fields', {}).captions, ['', '', '']);
});

test('fields draws one slot per caption, however many there are', () => {
  const html = renderForm('fields', readSpec('fields', { captions: ['A', 'B', 'C', 'D'] }));
  assert.equal((html.match(/<li>/g) || []).length, 4);
  assert.equal((html.match(/field-caption/g) || []).length, 4);
});

test('box below stacks the notes under the box instead of beside it', () => {
  const beside = renderForm('box', readSpec('box', { lines: 2 }));
  assert.match(beside, /class="beside"/);
  assert.ok(!beside.includes('class="stacked"'));

  const below = renderForm('box', readSpec('box', { lines: 2, below: true }));
  assert.match(below, /class="stacked"/);
  assert.ok(!below.includes('class="beside"'));
});

test('split shared prints a row spanning every column only when asked', () => {
  const bare = renderForm('split', readSpec('split', { columns: ['There', 'Here'], rows: 3 }));
  assert.ok(!bare.includes('split-shared'));

  const shared = renderForm('split', readSpec('split', { columns: ['There', 'Here'], rows: 3, shared: 1 }));
  assert.match(shared, /split-shared/);
  assert.match(shared, /But the same:/);
  assert.match(shared, /colspan="2"/);
});

test('table never gains the shared row split has, even asked for one', () => {
  const html = renderForm('table', readSpec('table', { shared: 1 }));
  assert.ok(!html.includes('split-shared'));
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

// ------------------------------------------------------ the slice 15 kinds --

test('figures (figure-anchor) keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('figures', {
    caption: 'People who live there', unit: 'people', anchor_prompt: 'About the same as…', boxes: 3,
  });
  assert.deepEqual(spec, {
    caption: 'People who live there', unit: 'people', anchor_prompt: 'About the same as…',
  });
});

test('figures falls back to the default anchor prompt when none is given', () => {
  assert.equal(readSpec('figures', {}).anchor_prompt, 'About the same as…');
});

test('figure-anchor prints a caption and a unit only when set', () => {
  const bare = renderForm('figures', readSpec('figures', {}));
  assert.ok(!bare.includes('figure-caption'));
  assert.ok(!bare.includes('figure-unit'));
  const filled = renderForm('figures', readSpec('figures', { caption: 'How many', unit: 'people' }));
  assert.match(filled, /figure-caption">How many/);
  assert.match(filled, /figure-unit">people/);
});

test('timeline keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('timeline', { ticks: 3, unit: 'clock', ends: ['Wake up', 'Bedtime'], boxes: 4 });
  assert.deepEqual(spec, { ticks: 3, unit: 'clock', ends: ['Wake up', 'Bedtime'] });
});

test('timeline ends falls back to blank when only one end is given', () => {
  assert.deepEqual(readSpec('timeline', { ends: ['Only one'] }).ends, ['', '']);
});

test('timeline prints end labels only when both are set; the unit line prints at its default', () => {
  const bare = renderForm('timeline', readSpec('timeline', {}));
  assert.ok(!bare.includes('timeline-end'));
  assert.match(bare, /timeline-unit">years/);
  const labelled = renderForm('timeline', readSpec('timeline', { ends: ['It started', 'It ended'], unit: 'clock' }));
  assert.match(labelled, /timeline-end start">It started/);
  assert.match(labelled, /timeline-end finish">It ended/);
  assert.match(labelled, /timeline-unit">clock/);
});

test('storyboard gains a caption, printed above the panels only when set', () => {
  const spec = readSpec('storyboard', { panels: 6, caption: 'Their story, six panels in order' });
  assert.deepEqual(spec, { panels: 6, caption: 'Their story, six panels in order' });
  const bare = renderForm('storyboard', readSpec('storyboard', {}));
  assert.ok(!bare.includes('storyboard-caption'));
  const captioned = renderForm('storyboard', spec);
  assert.match(captioned, /storyboard-caption">Their story, six panels in order/);
});

test('recipe keeps its own keys and drops one belonging to another kind', () => {
  const spec = readSpec('recipe', { ingredients: 8, steps: 5, sketch: false, boxes: 4 });
  assert.deepEqual(spec, { ingredients: 8, steps: 5, sketch: false });
});

test('recipe draws one line per ingredient and one per step, and a sketch box only when asked', () => {
  const on = renderForm('recipe', readSpec('recipe', { ingredients: 10, steps: 6, sketch: true }));
  assert.equal((on.match(/class="recipe-amount"/g) || []).length, 10);
  assert.equal((on.match(/class="recipe-step-no"/g) || []).length, 6);
  assert.match(on, /recipe-sketch/);
  const off = renderForm('recipe', readSpec('recipe', { sketch: false }));
  assert.ok(!off.includes('recipe-sketch'));
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

test('oldest-thing-here prints three fields slots matching its three findings', () => {
  const segment = segmentFor(seededRow(seededDb(), 'oldest-thing-here'));
  assert.equal(segment.kind, 'fields');
  assert.deepEqual(segment.spec.captions, ['What it is', 'How old it is', 'Where it was dug up']);
  assert.equal((renderForm(segment.kind, segment.spec).match(/<li>/g) || []).length, 3);
});

test('wild-animal prints a box with its notes below, not beside', () => {
  const segment = segmentFor(seededRow(seededDb(), 'wild-animal'));
  assert.equal(segment.kind, 'box');
  assert.equal(segment.spec.below, true);
  assert.match(renderForm(segment.kind, segment.spec), /class="stacked"/);
});

test('house-they-live-in prints a box with three callout labels and no beside notes', () => {
  const segment = segmentFor(seededRow(seededDb(), 'house-they-live-in'));
  assert.equal(segment.kind, 'box');
  assert.equal(segment.spec.callouts, 3);
  assert.equal(segment.spec.lines, 0);
  assert.match(renderForm(segment.kind, segment.spec), /class="callouts"/);
});

test('law-you-notice prints the shared row its closing sentence asks for', () => {
  const segment = segmentFor(seededRow(seededDb(), 'law-you-notice'));
  assert.equal(segment.kind, 'split');
  assert.equal(segment.spec.shared, 1);
  assert.match(renderForm(segment.kind, segment.spec), /But the same:/);
});

test('no two differences bindings share a closing sentence', () => {
  const db = seededDb();
  const closers = ['law-you-notice', 'who-can-vote', 'girls-and-women', 'the-sport-they-love']
    .map((slug) => db.prepare('SELECT prompt FROM task_templates WHERE slug = ?').get(slug).prompt
      .split(/(?<=[.!?])\s+/).pop());
  assert.equal(new Set(closers).size, closers.length, closers.join(' | '));
});

test('box-caption is gone and nothing is bound to it', () => {
  const db = seededDb();
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM worksheet_layouts WHERE slug = 'box-caption'").get().n,
    0,
  );
});

test('compare and the old three-box figures form are gone and nothing is bound to them', () => {
  const db = seededDb();
  for (const slug of ['compare', 'figures']) {
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM worksheet_layouts WHERE slug = ?').get(slug).n,
      0,
      slug,
    );
  }
});

test('how-many-people, size-next-to-yours and getting-around print figure-anchor', () => {
  const db = seededDb();
  for (const slug of ['how-many-people', 'size-next-to-yours', 'getting-around']) {
    const segment = segmentFor(seededRow(db, slug));
    assert.equal(segment.kind, 'figures', slug);
    assert.ok(segment.spec.anchor_prompt, slug);
  }
});

test('what-people-believe prints a three-row table, and feast-they-keep and tonights-dinner move off lines-4', () => {
  const db = seededDb();
  const believe = segmentFor(seededRow(db, 'what-people-believe'));
  assert.equal(believe.kind, 'table');
  assert.deepEqual(believe.spec.columns, ['The religion', 'When it arrived there', 'A day it keeps']);
  const feast = segmentFor(seededRow(db, 'feast-they-keep'));
  assert.equal(feast.height_thirds, 2);
  const dinner = segmentFor(seededRow(db, 'tonights-dinner'));
  assert.equal(dinner.kind, 'box');
  assert.equal(dinner.spec.lines, 3);
});

test('cook-it prints a recipe card, three thirds, alone on its sheet', () => {
  const segment = segmentFor(seededRow(seededDb(), 'cook-it'));
  assert.equal(segment.kind, 'recipe');
  assert.equal(segment.height_thirds, 3);
  assert.deepEqual(packSheets([segment]).map((s) => s.segments.length), [1]);
});

test('who-ruled-before, war-that-changed and kid-life each carry distinct timeline ends', () => {
  const db = seededDb();
  const ends = ['who-ruled-before', 'war-that-changed', 'kid-life'].map((slug) => {
    const segment = segmentFor(seededRow(db, slug));
    assert.equal(segment.kind, 'timeline', slug);
    return segment.spec.ends.join('->');
  });
  assert.equal(new Set(ends).size, ends.length, ends.join(' | '));
});

test('story-they-tell carries a storyboard caption', () => {
  const segment = segmentFor(seededRow(seededDb(), 'story-they-tell'));
  assert.equal(segment.kind, 'storyboard');
  assert.ok(segment.spec.caption);
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
