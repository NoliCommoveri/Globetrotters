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
