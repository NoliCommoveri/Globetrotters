// GET /admin/library — the library editor (DESIGN.md §12).
//
// The second page in the app that is never linked to from anywhere the kids
// can reach. /admin links here; nothing else does, anywhere, ever.
//
// The document is a shell and one inline script. Every section renders from a
// single GET /admin/api/library, because the four editors share the same rows —
// the weight grid is week 2-3 task titles, the project type editor is week 4
// task titles, and the task list is all of them. Fetching them once and
// rendering four views of the payload is the difference between one request and
// four that can disagree with each other.
//
// The script is inline rather than a file under public/. public/ is served as
// static assets to anybody who asks, and the one defense this page has is that
// nothing links to it (§12, and the slice's do-not-build). Publishing a file
// that names every admin route would be the link.

import { page } from '../lib/html.js';
import { POOL_FLOOR } from './focuses.js';

const STYLE = `
  body { max-width: 68rem; }
  .bar { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin: .75rem 0; }
  .bar label { display: flex; gap: .35rem; align-items: center; white-space: nowrap; }
  select, textarea { font: inherit; padding: .3rem .4rem; }
  textarea { width: 100%; min-height: 3.5rem; resize: vertical; }
  input[type=text] { width: 100%; }
  td.narrow, th.narrow { width: 1%; white-space: nowrap; }
  tr.archived td { opacity: .5; }
  tr.dirty td:first-child { box-shadow: inset .2rem 0 0 #a00; }
  .w0 { background: #fdd; }
  .w3 { background: #dfd; font-weight: 700; }
  .w1 { background: #f4f4f4; color: #555; }
  .cell { width: 2.6rem; text-align: center; }
  .pill { display: inline-block; padding: 0 .35rem; border: 1px solid #ccc; border-radius: .6rem;
          font-size: .8125rem; margin-right: .25rem; }
  .warn { color: #a05000; }
  .ok { color: #060; }
  details { margin: .5rem 0; }
  summary { cursor: pointer; }
  .tabs { display: flex; gap: .25rem; flex-wrap: wrap; margin: 1rem 0 0; }
  .tabs button[aria-selected=true] { font-weight: 700; border-bottom: 3px solid #000; }
  section[hidden] { display: none; }
  #toast { position: sticky; bottom: 0; background: #ffe; padding: .5rem;
           border-top: 1px solid #ccc; }
  #toast:empty { display: none; }
`;

// Written without template literals of its own: the whole block lives inside
// one in this module, and client code that has to count escapes is client code
// nobody edits. The one interpolation is POOL_FLOOR, so the warning the page
// prints and the threshold the server applies cannot drift apart.
//
// Every backslash meant for the browser is doubled here, because this literal
// eats the first one: `\\n` to emit a newline escape, `\\'` to emit an escaped
// quote. A single `\'` reaches the browser as a bare quote, ends the string it
// sits in, and the whole script fails to parse — which shows up as a page that
// still renders its shell with every button on it dead. Prefer a double-quoted
// client string over escaping an apostrophe at all. `routes.test.js` compiles
// what this emits, so a miscount fails there rather than in a browser.
const SCRIPT = `
var state = { data: null, focusId: null, countryId: null };

function el(tag, attrs, kids) {
  var node = document.createElement(tag);
  for (var k in (attrs || {})) {
    if (k === 'class') node.className = attrs[k];
    else if (k === 'text') node.textContent = attrs[k];
    else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(function (kid) { if (kid) node.appendChild(kid); });
  return node;
}

function fill(id, nodes) {
  var host = document.getElementById(id);
  host.innerHTML = '';
  nodes.forEach(function (n) { if (n) host.appendChild(n); });
  return host;
}

function say(message, bad) {
  var toast = document.getElementById('toast');
  toast.textContent = message || '';
  toast.className = bad ? 'err' : 'ok';
}

async function send(method, url, body) {
  var init = { method: method, headers: { 'content-type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  var res = await fetch(url, init);
  var data = await res.json().catch(function () { return null; });
  if (!res.ok || !data || data.ok !== true) {
    throw new Error((data && data.error) || ('HTTP ' + res.status));
  }
  return data;
}

async function load() {
  say('Loading…');
  try {
    state.data = await send('GET', '/admin/api/library');
    say('');
    renderAll();
  } catch (err) { say(String(err.message), true); }
}

// ---------------------------------------------------------------- tasks

function weightOf(taskId, focusId) {
  var rows = state.data.weights.filter(function (w) {
    return w.task_template_id === taskId && w.focus_id === focusId;
  });
  return rows.length ? rows[0].weight : 1;
}

function drawsOf(taskId) {
  return state.data.draws.filter(function (d) { return d.task_template_id === taskId; });
}

function taskFilters() {
  return {
    week: document.getElementById('f-week').value,
    tier: document.getElementById('f-tier').value,
    page: document.getElementById('f-page').value,
    focus: document.getElementById('f-focus').value,
    weight: document.getElementById('f-weight').value,
    archived: document.getElementById('f-archived').checked,
    text: document.getElementById('f-text').value.trim().toLowerCase(),
  };
}

function matches(task, f) {
  if (!f.archived && task.archived) return false;
  if (f.week && String(task.week_theme) !== f.week) return false;
  if (f.tier && task.tier !== f.tier) return false;
  if (f.page && (task.workbook_page || '') !== f.page) return false;
  if (f.focus && f.weight !== '') {
    if (String(weightOf(task.id, Number(f.focus))) !== f.weight) return false;
  }
  if (f.text) {
    var hay = (task.title + ' ' + task.prompt + ' ' + task.slug).toLowerCase();
    if (hay.indexOf(f.text) === -1) return false;
  }
  return true;
}

function option(value, label, selected) {
  var o = el('option', { value: value, text: label });
  if (selected) o.setAttribute('selected', 'selected');
  return o;
}

function layoutSelect(value, onchange) {
  var sel = el('select', { onchange: onchange }, [option('', 'ruled lines', !value)]);
  state.data.layouts.forEach(function (l) {
    if (l.archived && l.id !== value) return;
    sel.appendChild(option(String(l.id), l.name + ' (' + l.height_thirds + '/3)', l.id === value));
  });
  return sel;
}

function projectSelect(value, onchange) {
  var sel = el('select', { onchange: onchange }, [option('', '—', !value)]);
  state.data.project_types.forEach(function (p) {
    sel.appendChild(option(String(p.id), p.name, p.id === value));
  });
  return sel;
}

function taskRow(task) {
  var edits = {};
  var row = el('tr', { class: task.archived ? 'archived' : '' });
  var mark = function () { row.classList.add('dirty'); };

  var title = el('input', { type: 'text', value: task.title, maxlength: '80',
    oninput: function () { edits.title = title.value; mark(); } });
  var prompt = el('textarea', { maxlength: '600',
    oninput: function () { edits.prompt = prompt.value; mark(); } });
  prompt.value = task.prompt;

  var week = el('select', { onchange: function () { edits.week_theme = Number(week.value); mark(); } },
    [1, 2, 3, 4].map(function (n) { return option(String(n), String(n), n === task.week_theme); }));

  var tier = el('select', { onchange: function () { edits.tier = tier.value; mark(); } },
    ['core', 'focus', 'wild'].map(function (t) { return option(t, t, t === task.tier); }));

  var pageInput = el('input', { type: 'text', value: task.workbook_page || '', maxlength: '32',
    oninput: function () { edits.workbook_page = pageInput.value; mark(); } });

  var project = projectSelect(task.project_type_id, function () {
    edits.project_type_id = project.value ? Number(project.value) : null;
    mark();
  });

  // The printed form this task's segment uses (§16). A task with none prints
  // its prompt over ruled lines, which is why the empty option is a real
  // choice rather than a missing value.
  var layout = layoutSelect(task.worksheet_layout_id, function () {
    edits.worksheet_layout_id = layout.value ? Number(layout.value) : null;
    mark();
  });

  var position = el('input', { type: 'number', step: '1', min: '1', max: '99',
    value: task.position === null ? '' : String(task.position), style: 'width:3.5rem',
    oninput: function () { edits.position = position.value === '' ? null : Number(position.value); mark(); } });

  var draws = drawsOf(task.id);
  var total = draws.reduce(function (n, d) { return n + d.n; }, 0);
  var who = el('td', { class: 'narrow' }, [el('span', { text: String(total) })]);
  draws.forEach(function (d) {
    var person = state.data.people.filter(function (p) { return p.id === d.person_id; })[0];
    who.appendChild(el('span', { class: 'pill', text: (person ? person.name : '?') + ' ' + d.n,
      style: person ? 'border-color:' + person.color : null }));
  });

  var save = el('button', { text: 'Save', onclick: async function () {
    save.disabled = true;
    try {
      var data = await send('PATCH', '/admin/api/tasks/' + task.id, edits);
      Object.assign(task, data.task);
      row.classList.remove('dirty');
      say('Saved ' + data.task.title);
    } catch (err) { say(String(err.message), true); }
    save.disabled = false;
  } });

  var archive = el('button', { text: task.archived ? 'Restore' : 'Archive',
    onclick: async function () {
      archive.disabled = true;
      try {
        var data = await send('PATCH', '/admin/api/tasks/' + task.id,
          { archived: task.archived ? 0 : 1 });
        Object.assign(task, data.task);
        say(data.task.archived ? 'Archived. It leaves future draws; months already'
          + ' drawn keep it.' : 'Back in the draw.');
        renderTasks();
      } catch (err) { say(String(err.message), true); archive.disabled = false; }
    } });

  row.appendChild(el('td', {}, [title, prompt,
    el('div', { class: 'note', text: task.slug + ' · ' + task.origin
      + (task.updated_at ? ' · edited ' + task.updated_at.slice(0, 10) : '') })]));
  row.appendChild(el('td', { class: 'narrow' }, [week]));
  row.appendChild(el('td', { class: 'narrow' }, [tier]));
  row.appendChild(el('td', { class: 'narrow' }, [pageInput]));
  row.appendChild(el('td', { class: 'narrow' }, [project, position]));
  row.appendChild(el('td', { class: 'narrow' }, [layout]));
  row.appendChild(who);
  row.appendChild(el('td', { class: 'narrow' }, [save, archive]));
  return row;
}

function renderTasks() {
  var f = taskFilters();
  var shown = state.data.tasks.filter(function (t) { return matches(t, f); });
  var table = el('table', {}, [el('tr', {}, [
    el('th', { text: 'Task' }), el('th', { class: 'narrow', text: 'Week' }),
    el('th', { class: 'narrow', text: 'Tier' }), el('th', { class: 'narrow', text: 'Page' }),
    el('th', { class: 'narrow', text: 'Project / pos' }),
    el('th', { class: 'narrow', text: 'Prints as' }),
    el('th', { class: 'narrow', text: 'Drawn' }),
    el('th', { class: 'narrow', text: '' }),
  ])]);
  shown.forEach(function (t) { table.appendChild(taskRow(t)); });
  fill('task-table', [
    el('p', { class: 'note', text: shown.length + ' of ' + state.data.tasks.length + ' templates' }),
    table,
  ]);
}

function renderTaskFilters() {
  var pages = {};
  state.data.tasks.forEach(function (t) { if (t.workbook_page) pages[t.workbook_page] = 1; });
  var pageSel = document.getElementById('f-page');
  pageSel.innerHTML = '';
  pageSel.appendChild(option('', 'any page', true));
  Object.keys(pages).sort().forEach(function (p) { pageSel.appendChild(option(p, p, false)); });

  var focusSel = document.getElementById('f-focus');
  focusSel.innerHTML = '';
  focusSel.appendChild(option('', 'any focus', true));
  state.data.focuses.forEach(function (f) { focusSel.appendChild(option(String(f.id), f.name, false)); });
}

// ---------------------------------------------------------------- focuses

function poolLine(focus) {
  var line = 'week 2: ' + focus.pool.week2 + ' · week 3: ' + focus.pool.week3 + ' tasks at 1 or more';
  return el('div', { class: focus.thin ? 'warn' : 'note',
    text: focus.thin
      ? line + ' — thin. The draw takes five from each week, so under ${POOL_FLOOR}'
        + ' is the same month twice.'
      : line });
}

function focusPanel(focus) {
  var edits = {};
  var name = el('input', { type: 'text', value: focus.name, maxlength: '40',
    oninput: function () { edits.name = name.value; } });
  var blurb = el('input', { type: 'text', value: focus.blurb || '', maxlength: '160',
    oninput: function () { edits.blurb = blurb.value; } });

  var save = el('button', { text: 'Save', onclick: async function () {
    try {
      var data = await send('PATCH', '/admin/api/focuses/' + focus.id, edits);
      Object.assign(focus, data.focus);
      say('Saved ' + data.focus.name);
      renderFocuses();
    } catch (err) { say(String(err.message), true); }
  } });

  var archive = el('button', { text: focus.archived ? 'Restore' : 'Archive',
    onclick: async function () {
      try {
        var data = await send('PATCH', '/admin/api/focuses/' + focus.id,
          { archived: focus.archived ? 0 : 1 });
        Object.assign(focus, data.focus);
        renderFocuses();
      } catch (err) { say(String(err.message), true); }
    } });

  var grid = el('div', {});
  var open = el('button', { text: 'Weights', onclick: function () {
    state.focusId = state.focusId === focus.id ? null : focus.id;
    renderFocuses();
  } });

  if (state.focusId === focus.id) grid.appendChild(weightGrid(focus));

  return el('div', { class: focus.archived ? 'archived' : '' }, [
    el('div', { class: 'bar' }, [
      el('label', {}, [el('span', { text: 'Name' }), name]),
      el('label', { style: 'flex:1' }, [el('span', { text: 'Blurb' }), blurb]),
      save, archive, open,
    ]),
    poolLine(focus),
    grid,
  ]);
}

// The grid: this focus against every week 2-3 task, each cell cycling off/1/3.
// Weight 1 is the absence of an opinion and stores no row, which is why the
// save sends every cell and the server deletes the ones that came back to 1.
function weightGrid(focus) {
  var tasks = state.data.tasks.filter(function (t) {
    return (t.week_theme === 2 || t.week_theme === 3) && !t.archived;
  });
  var cells = {};
  tasks.forEach(function (t) { cells[t.id] = weightOf(t.id, focus.id); });

  var table = el('table', {}, [el('tr', {}, [
    el('th', { class: 'narrow', text: 'Wk' }), el('th', { text: 'Task' }),
    el('th', { class: 'narrow', text: 'Weight' }),
  ])]);

  tasks.forEach(function (t) {
    var button = el('button', { class: 'cell w' + cells[t.id], text: String(cells[t.id]) });
    button.addEventListener('click', function () {
      cells[t.id] = cells[t.id] === 0 ? 1 : (cells[t.id] === 1 ? 3 : 0);
      button.textContent = String(cells[t.id]);
      button.className = 'cell w' + cells[t.id];
    });
    table.appendChild(el('tr', {}, [
      el('td', { class: 'narrow', text: String(t.week_theme) }),
      el('td', { text: t.title }),
      el('td', { class: 'narrow' }, [button]),
    ]));
  });

  var save = el('button', { text: 'Save weights', onclick: async function () {
    save.disabled = true;
    try {
      var payload = Object.keys(cells).map(function (id) {
        return { task_template_id: Number(id), weight: cells[id] };
      });
      var data = await send('PUT', '/admin/api/focuses/' + focus.id + '/weights',
        { weights: payload });
      state.data.weights = state.data.weights
        .filter(function (w) { return w.focus_id !== focus.id; })
        .concat(data.weights.map(function (w) {
          return { task_template_id: w.task_template_id, focus_id: focus.id, weight: w.weight };
        }));
      focus.pool = data.pool;
      focus.thin = data.thin;
      say('Saved. ' + data.weights.length + ' opinions stored; the rest are at 1 and store nothing.');
      renderFocuses();
    } catch (err) { say(String(err.message), true); }
    save.disabled = false;
  } });

  return el('div', {}, [
    el('p', { class: 'note', text: '0 excludes the task from this focus, 1 is no opinion and'
      + ' stores no row, 3 favors it. Click a cell to cycle.' }),
    table, save,
  ]);
}

function renderFocuses() {
  fill('focus-list', state.data.focuses.map(focusPanel));
}

// ------------------------------------------------------- project types

function projectPanel(project) {
  var edits = {};
  var name = el('input', { type: 'text', value: project.name, maxlength: '40',
    oninput: function () { edits.name = name.value; } });
  var materials = el('input', { type: 'text', value: project.materials || '', maxlength: '240',
    oninput: function () { edits.materials = materials.value; } });

  var sequence = state.data.tasks
    .filter(function (t) { return t.week_theme === 4 && t.project_type_id === project.id; })
    .sort(function (a, b) { return (a.position || 0) - (b.position || 0) || a.id - b.id; });
  var order = sequence.map(function (t) { return t.id; });

  var list = el('ol', {});
  function paint() {
    list.innerHTML = '';
    order.forEach(function (id, i) {
      var task = sequence.filter(function (t) { return t.id === id; })[0];
      var up = el('button', { text: '↑', onclick: function () {
        if (i === 0) return;
        order.splice(i - 1, 0, order.splice(i, 1)[0]);
        paint();
      } });
      var down = el('button', { text: '↓', onclick: function () {
        if (i === order.length - 1) return;
        order.splice(i + 1, 0, order.splice(i, 1)[0]);
        paint();
      } });
      list.appendChild(el('li', {}, [el('span', { text: task.title + ' ' }), up, down]));
    });
  }
  paint();

  var save = el('button', { text: 'Save', onclick: async function () {
    try {
      var body = Object.assign({}, edits);
      if (order.length) body.order = order;
      var data = await send('PATCH', '/admin/api/project-types/' + project.id, body);
      Object.assign(project, data.project_type);
      data.sequence.forEach(function (row) {
        state.data.tasks.forEach(function (t) { if (t.id === row.id) t.position = row.position; });
      });
      say('Saved ' + data.project_type.name);
      renderProjects();
    } catch (err) { say(String(err.message), true); }
  } });

  var archive = el('button', { text: project.archived ? 'Restore' : 'Archive',
    onclick: async function () {
      try {
        var data = await send('PATCH', '/admin/api/project-types/' + project.id,
          { archived: project.archived ? 0 : 1 });
        Object.assign(project, data.project_type);
        renderProjects();
      } catch (err) { say(String(err.message), true); }
    } });

  var count = project.week4_templates;
  return el('div', { class: project.archived ? 'archived' : '' }, [
    el('div', { class: 'bar' }, [
      el('label', {}, [el('span', { text: 'Name' }), name]),
      el('label', { style: 'flex:1' }, [el('span', { text: 'Materials' }), materials]),
      save, archive,
    ]),
    el('div', { class: count >= 5 ? 'note' : 'warn',
      text: count >= 5 ? count + ' week 4 tasks'
        : count + ' week 4 tasks — setup hides a project type until it has five.' }),
    list,
  ]);
}

function renderProjects() {
  fill('project-list', state.data.project_types.map(projectPanel));
}

// ---------------------------------------------------------------- countries

function renderCountryList() {
  var term = document.getElementById('c-search').value.trim().toLowerCase();
  var matched = state.data.countries.filter(function (c) {
    return !term || c.name.toLowerCase().indexOf(term) === 0 || c.iso3.toLowerCase() === term;
  }).slice(0, 40);

  fill('country-list', matched.map(function (c) {
    return el('button', { text: c.name + ' (' + c.hooks + '/' + c.affinities + ')',
      onclick: function () { openCountry(c.id); } });
  }));
}

async function openCountry(id) {
  try {
    var data = await send('GET', '/admin/api/countries/' + id);
    state.countryId = id;
    renderCountry(data);
  } catch (err) { say(String(err.message), true); }
}

function bumpCounts(id, hooks, affinities) {
  state.data.countries.forEach(function (c) {
    if (c.id !== id) return;
    if (hooks !== null) c.hooks = hooks;
    if (affinities !== null) c.affinities = affinities;
  });
  renderCountryList();
}

function renderCountry(data) {
  var id = data.country.id;
  var hooks = el('div', {});
  data.hooks.forEach(function (hook) {
    var text = el('input', { type: 'text', value: hook.text, maxlength: '200' });
    var save = el('button', { text: 'Save', onclick: async function () {
      try {
        var res = await send('PATCH', '/admin/api/hooks/' + hook.id, { text: text.value });
        say('Saved.');
        bumpCounts(id, res.hooks.length, null);
      } catch (err) { say(String(err.message), true); }
    } });
    // The one delete in the library. Nothing references a hook, so removing a
    // junk one cannot break a month already in progress — which is the whole
    // reason everything else archives instead.
    var drop = el('button', { text: 'Delete', onclick: async function () {
      if (!confirm('Delete this hook? Hooks are the one thing here with no undo.')) return;
      try {
        var res = await send('DELETE', '/admin/api/hooks/' + hook.id);
        bumpCounts(id, res.hooks.length, null);
        openCountry(id);
      } catch (err) { say(String(err.message), true); }
    } });
    hooks.appendChild(el('div', { class: 'bar' }, [text, save, drop]));
  });

  var fresh = el('input', { type: 'text', maxlength: '200', placeholder: 'A lead, not a fact' });
  var add = el('button', { text: 'Add hook', onclick: async function () {
    try {
      var res = await send('POST', '/admin/api/countries/' + id + '/hooks', { text: fresh.value });
      fresh.value = '';
      bumpCounts(id, res.hooks.length, null);
      openCountry(id);
    } catch (err) { say(String(err.message), true); }
  } });

  var cells = {};
  data.affinities.forEach(function (a) { cells[a.focus_id] = { score: a.score, reason: a.reason || '' }; });

  var table = el('table', {}, [el('tr', {}, [
    el('th', { text: 'Focus' }), el('th', { class: 'narrow', text: 'Fit' }), el('th', { text: 'Reason' }),
  ])]);
  state.data.focuses.forEach(function (focus) {
    var current = cells[focus.id] || { score: 0, reason: '' };
    cells[focus.id] = current;
    var button = el('button', { class: 'cell', text: current.score ? String(current.score) : 'off' });
    button.addEventListener('click', function () {
      current.score = current.score === 0 ? 2 : (current.score === 2 ? 3 : 0);
      button.textContent = current.score ? String(current.score) : 'off';
    });
    var reason = el('input', { type: 'text', value: current.reason, maxlength: '120',
      oninput: function () { current.reason = reason.value; } });
    table.appendChild(el('tr', {}, [
      el('td', { text: focus.name }),
      el('td', { class: 'narrow' }, [button]),
      el('td', {}, [reason]),
    ]));
  });

  var saveAff = el('button', { text: 'Save fits', onclick: async function () {
    try {
      var payload = Object.keys(cells).map(function (fid) {
        return { focus_id: Number(fid), score: cells[fid].score, reason: cells[fid].reason };
      });
      var res = await send('PUT', '/admin/api/countries/' + id + '/affinities',
        { affinities: payload });
      bumpCounts(id, null, res.affinities.length);
      say('Saved.');
    } catch (err) { say(String(err.message), true); }
  } });

  fill('country-detail', [
    el('h3', { text: data.country.name + ' (' + data.country.iso3 + ')' }),
    el('p', { class: 'note', text: 'Hooks are leads a kid follows, not facts to memorize.' }),
    hooks,
    el('div', { class: 'bar' }, [fresh, add]),
    el('p', { class: 'note', text: 'Fit: off, 2 good, 3 exceptional. The reason line is'
      + ' kid-facing and shows on the setup screen.' }),
    table, saveAff,
  ]);
}

// ---------------------------------------------------------------- new rows

function newTaskForm() {
  var title = el('input', { type: 'text', maxlength: '80', placeholder: 'Title' });
  var prompt = el('textarea', { maxlength: '600', placeholder: 'The ten-minute instruction, in a kid voice' });
  var week = el('select', {}, [2, 3, 1, 4].map(function (n) { return option(String(n), 'week ' + n, n === 2); }));
  var tier = el('select', {}, ['focus', 'core', 'wild'].map(function (t) { return option(t, t, t === 'focus'); }));
  var pageInput = el('input', { type: 'text', maxlength: '32', placeholder: 'workbook page' });
  var project = projectSelect(null, function () {});

  var create = el('button', { text: 'Create task', onclick: async function () {
    create.disabled = true;
    try {
      await send('POST', '/admin/api/tasks', {
        title: title.value, prompt: prompt.value, week_theme: Number(week.value),
        tier: tier.value, workbook_page: pageInput.value,
        project_type_id: project.value ? Number(project.value) : null,
      });
      say('Created. New tasks are custom, and Run seed never touches them.');
      await load();
    } catch (err) { say(String(err.message), true); }
    create.disabled = false;
  } });

  return el('details', {}, [
    el('summary', { text: 'New task' }),
    el('div', { class: 'bar' }, [title, week, tier, pageInput, project]),
    prompt, create,
  ]);
}

function newFocusForm() {
  var name = el('input', { type: 'text', maxlength: '40', placeholder: 'Name' });
  var blurb = el('input', { type: 'text', maxlength: '160', placeholder: 'One kid-readable line' });
  var create = el('button', { text: 'Create focus', onclick: async function () {
    try {
      var data = await send('POST', '/admin/api/focuses', { name: name.value, blurb: blurb.value });
      say(data.focus.thin
        ? 'Created, and it draws already — every task is at 1 until you say otherwise.'
          + ' The pool is thin though: see the warning under it.'
        : 'Created. It draws already — every task is at 1 until you say otherwise.');
      await load();
    } catch (err) { say(String(err.message), true); }
  } });
  return el('details', {}, [
    el('summary', { text: 'New focus' }),
    el('p', { class: 'note', text: 'A new focus is valid with no weights at all: a missing'
      + ' row means 1. Tune it afterwards.' }),
    el('div', { class: 'bar' }, [name, blurb, create]),
  ]);
}

function newProjectForm() {
  var name = el('input', { type: 'text', maxlength: '40', placeholder: 'Name' });
  var materials = el('input', { type: 'text', maxlength: '240', placeholder: 'What you will need' });
  var create = el('button', { text: 'Create project type', onclick: async function () {
    try {
      await send('POST', '/admin/api/project-types', { name: name.value, materials: materials.value });
      say('Created. Add five week 4 tasks before setup will offer it.');
      await load();
    } catch (err) { say(String(err.message), true); }
  } });
  return el('details', {}, [
    el('summary', { text: 'New project type' }),
    el('div', { class: 'bar' }, [name, materials, create]),
  ]);
}

// ---------------------------------------------------------------- layouts

// The dozen printed forms of §16. Every field here is a named value the
// renderer reads and escapes, and there is no markup field anywhere on this
// panel, because this form is the one place a typed string reaches a printed
// page.
//
// The knobs are drawn from kind_knobs, which the server sends with the payload.
// A knob added to a kind appears here without this file learning about it.

function knobField(kind, key, meta, spec, onchange) {
  var value = spec[key];
  var input;
  if (meta.type === 'int') {
    input = el('input', { type: 'number', step: '1', min: String(meta.min),
      max: String(meta.max), style: 'width:4.5rem',
      value: value === undefined || value === null ? '' : String(value) });
    input.addEventListener('input', function () {
      onchange(key, input.value === '' ? null : Number(input.value));
    });
  } else if (meta.type === 'list') {
    input = el('input', { type: 'text', style: 'width:16rem',
      placeholder: 'comma separated',
      value: Array.isArray(value) ? value.join(', ') : '' });
    input.addEventListener('input', function () {
      onchange(key, input.value.split(',').map(function (v) { return v.trim(); })
        .filter(function (v) { return v.length; }));
    });
  } else {
    input = el('input', { type: 'text', style: 'width:16rem',
      value: value === undefined || value === null ? '' : String(value) });
    input.addEventListener('input', function () { onchange(key, input.value); });
  }
  return el('label', {}, [el('span', { text: key.replace(/_/g, ' ') }), input]);
}

function parseSpec(raw) {
  try {
    var parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) { return {}; }
}

function layoutPanel(layout) {
  var spec = parseSpec(layout.spec);
  var edits = {};
  var kind = layout.kind;

  var name = el('input', { type: 'text', value: layout.name, maxlength: '60',
    oninput: function () { edits.name = name.value; } });

  var thirds = el('select', { onchange: function () {
    edits.height_thirds = Number(thirds.value);
  } }, [1, 2, 3].map(function (n) {
    return option(String(n), n + ' of 3', n === layout.height_thirds);
  }));

  var knobs = el('div', { class: 'bar' });
  function paintKnobs() {
    knobs.innerHTML = '';
    var meta = state.data.kind_knobs[kind] || {};
    Object.keys(meta).forEach(function (key) {
      knobs.appendChild(knobField(kind, key, meta[key], spec, function (k, v) {
        spec[k] = v;
        edits.spec = spec;
      }));
    });
  }

  // Changing the kind changes which knobs exist, so the spec is re-read through
  // the new one on save and the form redraws immediately rather than showing
  // fields the renderer will drop.
  var kindSel = el('select', { onchange: function () {
    kind = kindSel.value;
    edits.kind = kind;
    edits.spec = spec;
    paintKnobs();
  } }, Object.keys(state.data.kind_knobs).map(function (k) {
    return option(k, k, k === layout.kind);
  }));
  paintKnobs();

  var save = el('button', { text: 'Save', onclick: async function () {
    save.disabled = true;
    try {
      var data = await send('PATCH', '/admin/api/layouts/' + layout.id, edits);
      Object.assign(layout, data.layout);
      say('Saved ' + data.layout.name + '. ' + layout.bound
        + ' task' + (layout.bound === 1 ? '' : 's') + ' print with it.');
      renderLayouts();
    } catch (err) { say(String(err.message), true); }
    save.disabled = false;
  } });

  var archive = el('button', { text: layout.archived ? 'Restore' : 'Archive',
    onclick: async function () {
      try {
        var data = await send('PATCH', '/admin/api/layouts/' + layout.id,
          { archived: layout.archived ? 0 : 1 });
        Object.assign(layout, data.layout);
        say(data.layout.archived
          ? 'Archived. Its tasks print their prompt over ruled lines until you bind them again.'
          : 'Back in use.');
        renderLayouts();
      } catch (err) { say(String(err.message), true); }
    } });

  return el('div', { class: layout.archived ? 'archived' : '' }, [
    el('div', { class: 'bar' }, [
      el('label', {}, [el('span', { text: 'Name' }), name]),
      el('label', {}, [el('span', { text: 'Kind' }), kindSel]),
      el('label', {}, [el('span', { text: 'Height' }), thirds]),
      el('span', { class: 'pill', text: layout.bound + ' bound' }),
      save, archive,
    ]),
    knobs,
    el('div', { class: 'note', text: layout.slug + ' \u00b7 ' + layout.origin }),
  ]);
}

function renderLayouts() {
  fill('layout-list', [
    el('p', { class: 'note', text: 'A sheet holds three thirds and a segment never'
      + ' splits across a page break, so a form that overflows its height pushes the'
      + ' next task off the paper. Editing a layout changes every task bound to it.' }),
    newLayoutForm(),
  ].concat(state.data.layouts.map(layoutPanel)));
}

function newLayoutForm() {
  var name = el('input', { type: 'text', maxlength: '60', placeholder: 'Name' });
  var kindSel = el('select', {}, Object.keys(state.data.kind_knobs).map(function (k) {
    return option(k, k, k === 'lines');
  }));
  var thirds = el('select', {}, [1, 2, 3].map(function (n) {
    return option(String(n), n + ' of 3', n === 1);
  }));
  var create = el('button', { text: 'Create layout', onclick: async function () {
    try {
      await send('POST', '/admin/api/layouts', { name: name.value, kind: kindSel.value,
        height_thirds: Number(thirds.value) });
      say("Created with that kind's default fields. Tune them, then bind tasks to it"
        + ' from the task list.');
      await load();
    } catch (err) { say(String(err.message), true); }
  } });
  return el('details', {}, [
    el('summary', { text: 'New layout' }),
    el('div', { class: 'bar' }, [name, kindSel, thirds, create]),
  ]);
}

// ---------------------------------------------------------------- backup

function renderBackup() {
  var picker = el('input', { type: 'file', accept: 'application/json,.json' });
  var out = el('div', {});
  var run = el('button', { text: 'Import', onclick: async function () {
    var file = picker.files && picker.files[0];
    if (!file) { say('Pick a file first.', true); return; }
    run.disabled = true;
    try {
      var parsed = JSON.parse(await file.text());
      var data = await send('POST', '/admin/api/library.json', parsed);
      var lines = Object.keys(data.counts).map(function (k) {
        var c = data.counts[k];
        return k + ': ' + c.inserted + ' new, ' + c.updated + ' changed, ' + c.skipped + ' skipped';
      });
      out.innerHTML = '';
      out.appendChild(el('pre', { text: lines.join('\\n')
        + (data.changed ? '' : '\\n\\nNothing changed — this file is already what is here.') }));
      await load();
    } catch (err) { say(String(err.message), true); }
    run.disabled = false;
  } });

  fill('backup', [
    el('p', { class: 'note', text: 'The export is the backup and it is how a tuned library'
      + ' crosses into next school year. It is keyed by slug, not by id, so it lands in a'
      + ' fresh database without carrying this one\\'s numbering.' }),
    el('p', {}, [el('a', { href: '/admin/api/library.json', text: 'Download library.json' })]),
    el('div', { class: 'bar' }, [picker, run]),
    el('p', { class: 'note', text: 'Import never deletes. A row already here is compared field'
      + ' by field and written only where it differs, so importing the same file twice reports'
      + ' nothing changed.' }),
    out,
  ]);
}

// ---------------------------------------------------------------- shell

function renderAll() {
  renderTaskFilters();
  renderTasks();
  renderFocuses();
  renderProjects();
  renderCountryList();
  renderLayouts();
  renderBackup();
  fill('new-task', [newTaskForm()]);
  fill('new-focus', [newFocusForm()]);
  fill('new-project', [newProjectForm()]);
}

['f-week', 'f-tier', 'f-page', 'f-focus', 'f-weight', 'f-archived', 'f-text'].forEach(function (id) {
  document.getElementById(id).addEventListener('input', function () {
    if (state.data) renderTasks();
  });
});
document.getElementById('c-search').addEventListener('input', function () {
  if (state.data) renderCountryList();
});

var panes = ['tasks', 'focuses', 'projects', 'layouts', 'countries', 'backup-pane'];
panes.forEach(function (name) {
  document.getElementById('tab-' + name).addEventListener('click', function () {
    panes.forEach(function (other) {
      var selected = other === name;
      document.getElementById('pane-' + other).hidden = !selected;
      document.getElementById('tab-' + other).setAttribute('aria-selected', String(selected));
    });
  });
});

load();
`;

export function libraryPage() {
  return page('Globetrotters — library', `
<style>${STYLE}</style>
<h1>Library</h1>
<p class="note"><a href="/admin">Admin</a> — migrations, seed, people, reset.</p>
<p class="note">Nothing here is ever deleted. Archiving a task or a focus takes it out of
future draws and leaves every month already drawn exactly as it is. Edits propagate live:
a typo fixed here is fixed inside an active month, because the plan joins to the template
rather than copying it.</p>

<div class="tabs">
  <button id="tab-tasks" aria-selected="true">Tasks</button>
  <button id="tab-focuses" aria-selected="false">Focuses</button>
  <button id="tab-projects" aria-selected="false">Project types</button>
  <button id="tab-layouts" aria-selected="false">Worksheets</button>
  <button id="tab-countries" aria-selected="false">Countries</button>
  <button id="tab-backup-pane" aria-selected="false">Backup</button>
</div>

<section id="pane-tasks">
  <div class="bar">
    <label>Week <select id="f-week">
      <option value="">any</option><option value="1">1</option><option value="2">2</option>
      <option value="3">3</option><option value="4">4</option>
    </select></label>
    <label>Tier <select id="f-tier">
      <option value="">any</option><option value="core">core</option>
      <option value="focus">focus</option><option value="wild">wild</option>
    </select></label>
    <label>Page <select id="f-page"></select></label>
    <label>Focus <select id="f-focus"></select>
      <select id="f-weight">
        <option value="">any weight</option><option value="0">0</option>
        <option value="1">1</option><option value="3">3</option>
      </select></label>
    <label><input type="checkbox" id="f-archived"> show archived</label>
    <label>Find <input type="text" id="f-text" style="width:10rem"></label>
  </div>
  <div id="new-task"></div>
  <div id="task-table"></div>
</section>

<section id="pane-focuses" hidden>
  <div id="new-focus"></div>
  <div id="focus-list"></div>
</section>

<section id="pane-projects" hidden>
  <div id="new-project"></div>
  <div id="project-list"></div>
</section>

<section id="pane-layouts" hidden>
  <div id="layout-list"></div>
</section>

<section id="pane-countries" hidden>
  <div class="bar">
    <label>Country <input type="text" id="c-search" placeholder="type a name" style="width:12rem"></label>
    <span class="note">(hooks / fits)</span>
  </div>
  <div id="country-list" class="bar"></div>
  <div id="country-detail"></div>
</section>

<section id="pane-backup-pane" hidden>
  <div id="backup"></div>
</section>

<div id="toast"></div>
<script>${SCRIPT}</script>
`);
}
