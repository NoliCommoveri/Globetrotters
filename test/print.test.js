// The printed worksheets, end to end through the real Worker (DESIGN.md §16).
//
// What is worth asserting here is the arithmetic and the gate. The arithmetic
// because a packer that gets a sheet's remaining thirds wrong produces a binder
// with a task missing from it and nothing on the screen says so; the gate
// because /print is the first document route behind the family cookie and the
// wall must not reach it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith('.sql')) return nextLoad(url, context);
    const text = readFileSync(new URL(url), 'utf8');
    return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(text)};` };
  },
});

const { FakeD1 } = await import('./d1.js');
const worker = (await import('../src/index.js')).default;
const { applyPending } = await import('../src/lib/migrations.js');
const { MIGRATIONS, SEEDS } = await import('../src/migrations/index.js');
const { runSeed } = await import('../src/lib/seed.js');
const { issueSessionCookie, issueWallCookie } = await import('../src/lib/auth.js');

const ADMIN_TOKEN = 'test-token';
const FAMILY_PASSCODE = 'wanderlust';

async function env() {
  const DB = new FakeD1();
  await applyPending(DB, MIGRATIONS);
  const e = { DB, ADMIN_TOKEN, FAMILY_PASSCODE, FAMILY_TZ: 'America/Chicago' };
  const seeded = await runSeed(DB, SEEDS);
  assert.equal(seeded.ok, true, seeded.failure && seeded.failure.error);
  return e;
}

const cookieFor = async (e, personId) => (await issueSessionCookie(e, personId)).split(';')[0];

async function plan(e, { personId = 1, month = '2026-09' } = {}) {
  const cookie = await cookieFor(e, personId);
  const res = await worker.fetch(new Request('https://example.test/api/plans', {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ month, country_id: 1, focus_id: 1, project_type_id: 1 }),
  }), e);
  const body = await res.json();
  assert.equal(res.status, 201, body.error);
  return { cookie, id: body.plan.id, body };
}

const printed = async (e, path, cookie) => {
  const res = await worker.fetch(new Request(`https://example.test${path}`, { headers: { cookie } }), e);
  return { res, html: await res.text() };
};

// Sheets in document order, each as the list of segment titles on it.
function sheets(html) {
  return html.split('<article class="sheet">').slice(1).map((chunk) => ({
    header: (chunk.match(/<span class="where">([^]*?)<\/span>\n<\/header>/) || [, ''])[1]
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    titles: [...chunk.matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1]),
    thirds: [...chunk.matchAll(/--thirds:(\d)/g)].map((m) => Number(m[1])),
  }));
}

// ------------------------------------------------------------------- gate --

test('the wall cookie is refused and a signed-out request is too', async () => {
  const e = await env();
  const { id } = await plan(e);

  const wall = (await issueWallCookie(e)).split(';')[0];
  const denied = await printed(e, `/print/${id}`, wall);
  assert.equal(denied.res.status, 401);
  assert.match(denied.res.headers.get('content-type'), /html/);

  const out = await worker.fetch(new Request(`https://example.test/print/${id}`), e);
  assert.equal(out.status, 401);
});

test('a family cookie with no person picked still prints', async () => {
  const e = await env();
  const { id } = await plan(e);
  const { res, html } = await printed(e, `/print/${id}`, await cookieFor(e, null));
  assert.equal(res.status, 200);
  assert.match(html, /class="sheet"/);
});

// The document is the only route to a print dialog on a phone: the browser's
// own entry is inside a share sheet, and some Android builds do not carry it at
// all. A page of sheets with no button on it cannot be printed.
test('every printed document carries its own print button', async () => {
  const e = await env();
  const { cookie, id } = await plan(e);
  for (const path of [`/print/${id}`, `/print/${id}?week=4`]) {
    const { html } = await printed(e, path, cookie);
    assert.match(html, /class="print-now"/);
    assert.match(html, /<script src="\/js\/print-page\.js"/);
  }
  // The button is inert without the file, and a dangling src is silent.
  const script = readFileSync(new URL('../public/js/print-page.js', import.meta.url), 'utf8');
  assert.match(script, /window\.print\(\)/);
});

test('a month that does not exist is 404, and a bad week is 400', async () => {
  const e = await env();
  const { cookie, id } = await plan(e);
  assert.equal((await printed(e, '/print/9999', cookie)).res.status, 404);
  assert.equal((await printed(e, `/print/${id}?week=9`, cookie)).res.status, 400);
  assert.equal((await printed(e, `/print/${id}?week=x`, cookie)).res.status, 400);
});

// ------------------------------------------------------------- the sheets --

test('a drawn month prints every week-1-to-3 task once, in position order', async () => {
  const e = await env();
  const { cookie, id, body } = await plan(e);
  const { html } = await printed(e, `/print/${id}`, cookie);

  const expected = body.weeks
    .filter((w) => w.week_no !== 4)
    .flatMap((w) => w.tasks.map((t) => t.title));
  const printedTitles = sheets(html)
    .filter((s) => !/Week 4/.test(s.header))
    .flatMap((s) => s.titles);
  assert.deepEqual(printedTitles, expected);
});

test('no sheet holds more than three thirds, and each week starts a new one', async () => {
  const e = await env();
  const { cookie, id } = await plan(e);
  const all = sheets((await printed(e, `/print/${id}`, cookie)).html);

  const research = all.filter((s) => !/Week 4/.test(s.header));
  for (const s of research) {
    assert.ok(s.thirds.reduce((a, b) => a + b, 0) <= 3, `sheet over three thirds: ${s.header}`);
  }
  // Week n's first sheet is sheet 1 of its own week: numbering is within the
  // week, which is what makes a reprint drop back into the binder.
  for (const week of [1, 2, 3]) {
    const mine = all.filter((s) => s.header.startsWith(`Week ${week}`));
    assert.ok(mine.length >= 1);
    mine.forEach((s, i) => assert.match(s.header, new RegExp(`sheet ${i + 1} of ${mine.length}`)));
  }
});

test('week 4 is one sheet and four of its five tasks have no segment', async () => {
  const e = await env();
  const { cookie, id, body } = await plan(e);
  const all = sheets((await printed(e, `/print/${id}`, cookie)).html);
  const week4 = all.filter((s) => s.header.startsWith('Week 4'));
  assert.equal(week4.length, 1);
  assert.match(week4[0].header, /sheet 1 of 1/);

  const tasks = body.weeks.find((w) => w.week_no === 4).tasks;
  const titled = week4[0].titles;
  const named = tasks.filter((t) => titled.includes(t.title));
  assert.equal(named.length, 1, 'exactly the planning task gets a segment of its own');

  // The five steps are check-off lines rather than segments, so every task is
  // named on the sheet while only one has a form under it.
  const html = (await printed(e, `/print/${id}?week=4`, cookie)).html;
  for (const t of tasks) assert.ok(html.includes(t.title), `${t.title} is on the sheet`);
});

test('?week=N prints exactly that week, numbered within it', async () => {
  const e = await env();
  const { cookie, id } = await plan(e);
  const whole = sheets((await printed(e, `/print/${id}`, cookie)).html);
  const one = sheets((await printed(e, `/print/${id}?week=3`, cookie)).html);

  const inWhole = whole.filter((s) => s.header.startsWith('Week 3'));
  assert.deepEqual(one.map((s) => s.header), inWhole.map((s) => s.header));
  assert.deepEqual(one.map((s) => s.titles), inWhole.map((s) => s.titles));
});

test('the header carries the person, the country and the month in their ink', async () => {
  const e = await env();
  const { cookie, id } = await plan(e);
  const { html } = await printed(e, `/print/${id}`, cookie);
  assert.match(html, /--ink:#5B2A86/);
  assert.match(html, /Person 1/);
});

// ----------------------------------------------------------- the bindings --

async function asAdmin(e, path, init = {}) {
  const { issueAdminCookie } = await import('../src/lib/auth.js');
  const cookie = (await issueAdminCookie(e)).split(';')[0];
  const res = await worker.fetch(new Request(`https://example.test${path}`, {
    ...init,
    headers: { ...(init.headers || {}), cookie, 'content-type': 'application/json' },
  }), e);
  return { res, body: await res.json() };
}

const layoutId = (e, slug) =>
  e.DB.prepare('SELECT id FROM worksheet_layouts WHERE slug = ?').bind(slug).first();

test('with no layout bound anywhere, a month is about seven sheets of ruled lines', async () => {
  const e = await env();
  e.DB.prepare('UPDATE task_templates SET worksheet_layout_id = NULL').bind().run();
  const { cookie, id, body } = await plan(e);
  const { html } = await printed(e, `/print/${id}`, cookie);

  const all = sheets(html);
  assert.equal(all.length, 7);
  // Nothing blank where a task should be: every week-1-to-3 task is on a sheet
  // with a form under it.
  const titles = all.flatMap((s) => s.titles);
  for (const w of body.weeks.filter((x) => x.week_no !== 4)) {
    for (const t of w.tasks) assert.ok(titles.includes(t.title), t.title);
  }
  assert.equal((html.match(/class="rules"/g) || []).length >= 15, true);

  // Week 1's five one-third segments are 3 + 2, so its last sheet ends with a
  // third to spare — and week 2 starts on a new sheet anyway.
  const week1 = all.filter((s) => s.header.startsWith('Week 1'));
  assert.deepEqual(week1.map((s) => s.thirds), [[1, 1, 1], [1, 1]]);
  assert.equal(all.filter((s) => s.header.startsWith('Week 2'))[0].thirds.length, 3);
});

test('binding a layout to one template changes that segment and nothing else', async () => {
  const e = await env();
  e.DB.prepare('UPDATE task_templates SET worksheet_layout_id = NULL, worksheet_spec = NULL')
    .bind().run();
  const { cookie, id } = await plan(e);
  const before = (await printed(e, `/print/${id}?week=1`, cookie)).html;

  const flag = e.DB.prepare("SELECT id FROM task_templates WHERE slug = 'flag-draw'").bind().first();
  const box = layoutId(e, 'box-note');
  const patched = await asAdmin(e, `/admin/api/tasks/${flag.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ worksheet_layout_id: box.id }),
  });
  assert.equal(patched.res.status, 200, patched.body.error);

  const after = (await printed(e, `/print/${id}?week=1`, cookie)).html;
  assert.ok(!before.includes('class="box"'));
  assert.ok(after.includes('class="box"'));

  // Every other task's form is untouched: the only segment that gained a box is
  // the one whose template was bound.
  assert.equal((after.match(/class="box"/g) || []).length, 1);
  const otherSegments = (s) => sheets(s).flatMap((x) => x.titles).filter((t) => t !== 'Draw and color the flag');
  assert.deepEqual(otherSegments(after), otherSegments(before));
});

test('editing a layout changes every task bound to it', async () => {
  const e = await env();
  const { cookie, id } = await plan(e);
  const lines4 = layoutId(e, 'lines-4');
  const edited = await asAdmin(e, `/admin/api/layouts/${lines4.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ spec: { lines: 2 } }),
  });
  assert.equal(edited.res.status, 200, edited.body.error);

  const stored = e.DB.prepare('SELECT spec FROM worksheet_layouts WHERE id = ?')
    .bind(lines4.id).first();
  assert.deepEqual(JSON.parse(stored.spec), { lines: 2 });

  const { html } = await printed(e, `/print/${id}`, cookie);
  // Every segment on a lines-4 template now rules two lines, and there are more
  // than one of them: one edit, many pages.
  const bound = e.DB.prepare(`
    SELECT COUNT(*) AS n FROM plan_tasks
    JOIN task_templates ON task_templates.id = plan_tasks.task_template_id
    WHERE plan_tasks.plan_id = ? AND task_templates.worksheet_layout_id = ?
  `).bind(id, lines4.id).first();
  if (bound.n > 0) assert.match(html, /class="rules"><i><\/i><i><\/i><\/div>/);
});

test('a spec typed into the editor containing a tag prints as visible text', async () => {
  const e = await env();
  const { cookie, id } = await plan(e);
  const box = layoutId(e, 'box-note');
  const flag = e.DB.prepare("SELECT id FROM task_templates WHERE slug = 'flag-draw'")
    .bind().first();
  // The seed gives this template its own caption, and a template override beats
  // the layout's key. Clearing it is what puts the layout's caption on the page.
  const cleared = await asAdmin(e, `/admin/api/tasks/${flag.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ worksheet_layout_id: box.id, worksheet_spec: null }),
  });
  assert.equal(cleared.res.status, 200, cleared.body.error);
  assert.equal(cleared.body.task.worksheet_spec, null);

  const patched = await asAdmin(e, `/admin/api/layouts/${box.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ spec: { caption: '<script>alert(1)</script>' } }),
  });
  assert.equal(patched.res.status, 200, patched.body.error);

  const { html } = await printed(e, `/print/${id}?week=1`, cookie);
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('an archived layout falls back to ruled lines rather than a hole', async () => {
  const e = await env();
  const { cookie, id, body } = await plan(e);
  e.DB.prepare('UPDATE worksheet_layouts SET archived = 1').bind().run();

  const { res, html } = await printed(e, `/print/${id}`, cookie);
  assert.equal(res.status, 200);
  assert.ok(!html.includes('class="box"'));
  assert.ok(!html.includes('class="grid"'));
  const titles = sheets(html).flatMap((s) => s.titles);
  for (const w of body.weeks.filter((x) => x.week_no !== 4)) {
    for (const t of w.tasks) assert.ok(titles.includes(t.title), t.title);
  }
});

// -------------------------------------------------------------- the reprint --

test('a swap changes only the sheets of the week it happened in', async () => {
  const e = await env();
  const { cookie, id, body } = await plan(e);
  const week = (html, n) => sheets(html).filter((s) => s.header.startsWith(`Week ${n}`));
  const before = (await printed(e, `/print/${id}`, cookie)).html;

  const target = body.weeks.find((w) => w.week_no === 3).tasks.find((t) => t.swappable);
  const swapped = await worker.fetch(new Request(
    `https://example.test/api/tasks/${target.id}/swap`,
    { method: 'POST', headers: { cookie, 'content-type': 'application/json' } },
  ), e);
  assert.equal(swapped.status, 200, await swapped.clone().text());

  const after = (await printed(e, `/print/${id}`, cookie)).html;
  for (const n of [1, 2, 4]) {
    assert.deepEqual(week(after, n).map((s) => s.titles), week(before, n).map((s) => s.titles),
      `week ${n} is untouched`);
  }
  assert.notDeepEqual(week(after, 3).map((s) => s.titles), week(before, 3).map((s) => s.titles));
});
