// GET /admin — the migration and health page. The one page in this app that is
// never linked to from anywhere else (DESIGN.md §3).

import { page, escapeHtml } from '../lib/html.js';
import { checkAdminToken, issueAdminCookie, clearAdminCookie } from '../lib/auth.js';
import { migrationStatus } from '../lib/migrations.js';
import { MIGRATIONS } from '../migrations/index.js';

export function tokenForm(message) {
  return page('Globetrotters — admin', `
<h1>Admin</h1>
${message ? `<p class="err">${escapeHtml(message)}</p>` : ''}
<form method="post" action="/admin">
  <label>Token <input type="password" name="token" autocomplete="current-password"
    autocapitalize="off" autocorrect="off" spellcheck="false"></label>
  <button type="submit">Enter</button>
</form>
`, { status: message ? 401 : 200 });
}

// POST /admin is the token form's target, not an API. It is the only write that
// is allowed to arrive without the admin cookie, because it is what issues it.
export async function adminLogin(request, env) {
  const form = await request.formData().catch(() => new FormData());
  if (!checkAdminToken(env, form.get('token'))) {
    return tokenForm('Wrong token.');
  }
  return new Response(null, {
    status: 303,
    headers: { location: '/admin', 'set-cookie': await issueAdminCookie(env) },
  });
}

export function adminLogout() {
  return new Response(null, {
    status: 303,
    headers: { location: '/admin', 'set-cookie': clearAdminCookie() },
  });
}

export async function adminPage(request, env) {
  let migrations = [];
  let dbError = null;
  try {
    migrations = await migrationStatus(env.DB, MIGRATIONS);
  } catch (err) {
    dbError = err.message;
  }

  const pending = migrations.filter((m) => m.state === 'pending').length;
  const drifted = migrations.filter((m) => m.state === 'drifted').length;

  let plans = { results: [] };
  if (!dbError) {
    try {
      plans = await env.DB.prepare(`
        SELECT month_plans.id, month_plans.month, month_plans.status, people.name
        FROM month_plans JOIN people ON people.id = month_plans.person_id
        ORDER BY month_plans.month DESC, people.sort_order
      `).all();
    } catch {
      // No schema yet, which is the state this page exists to fix.
      plans = { results: [] };
    }
  }

  return page('Globetrotters — admin', `
<h1>Admin</h1>
<p class="note"><a href="/admin/health">Health</a> — check the version id matches
the commit you just pushed before applying anything.</p>

<h2>Migrations</h2>
${dbError ? `<p class="err">D1 unreachable: ${escapeHtml(dbError)}</p>` : `
<table>
  <tr><th>Id</th><th>File</th><th>State</th><th>Applied</th></tr>
  ${migrations.map((m) => `<tr>
    <td>${escapeHtml(m.id)}</td>
    <td>${escapeHtml(m.name)}${m.missing ? ' <span class="note">(file gone)</span>' : ''}</td>
    <td class="state-${escapeHtml(m.state)}">${escapeHtml(m.state)}</td>
    <td>${escapeHtml(m.applied_at || '—')}</td>
  </tr>`).join('\n  ')}
</table>
${drifted ? `<p class="err">${drifted} drifted. A drifted file is shown, never
reapplied — migrations are append-only, so change it by adding a new file.</p>` : ''}
<p><button id="apply" ${pending ? '' : 'disabled'}>Apply pending (${pending})</button></p>
<noscript><p class="err">This button needs JavaScript.</p></noscript>
<div id="migrate-out"></div>
`}

<h2>Reset month</h2>
<p class="note">Deletes one month plan and everything hanging off it — sessions,
media, the stamp, the twenty tasks. There is no undo. Type the plan's month to
confirm.</p>
${plans.results.length === 0
  ? '<p class="note">No plans yet.</p>'
  : `<table>
  <tr><th>Person</th><th>Month</th><th>Status</th><th>Confirm</th></tr>
  ${plans.results.map((p) => `<tr>
    <td>${escapeHtml(p.name)}</td>
    <td>${escapeHtml(p.month)}</td>
    <td>${escapeHtml(p.status)}</td>
    <td><input type="text" class="confirm" data-plan="${escapeHtml(p.id)}"
         placeholder="${escapeHtml(p.month)}" autocapitalize="off" spellcheck="false">
        <button class="reset" data-plan="${escapeHtml(p.id)}">Reset</button></td>
  </tr>`).join('\n  ')}
</table>`}
<div id="reset-out"></div>

<form method="post" action="/admin/logout"><button type="submit">Sign out</button></form>

<script>
async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

function show(el, out) {
  el.innerHTML = '';
  const pre = document.createElement('pre');
  pre.textContent = out;
  el.appendChild(pre);
}

const apply = document.getElementById('apply');
if (apply) apply.addEventListener('click', async () => {
  apply.disabled = true;
  apply.textContent = 'Applying…';
  const out = document.getElementById('migrate-out');
  try {
    const { data } = await post('/admin/api/migrate');
    if (data && data.ok) {
      show(out, 'Applied ' + data.applied.length + ':\\n'
        + data.applied.map(a => '  ' + a.id + ' ' + a.name + ' (' + a.statements + ' statements)').join('\\n'));
      location.reload();
      return;
    }
    const f = data && data.failure;
    show(out, f
      ? 'Halted in ' + f.name + ' at statement ' + f.statementNumber + ' of ' + f.of
        + '\\n\\n' + (f.statement || '(the batch itself, not one statement)')
        + '\\n\\n' + f.error
        + '\\n\\nStatements before it are committed. This migration is still pending;'
        + '\\nfix it by adding a new file, not by editing this one.'
      : 'Unexpected response: ' + JSON.stringify(data));
  } catch (err) {
    show(out, String(err));
  } finally {
    apply.disabled = false;
    apply.textContent = 'Apply pending';
  }
});

for (const button of document.querySelectorAll('button.reset')) {
  button.addEventListener('click', async () => {
    const id = button.dataset.plan;
    const input = document.querySelector('input.confirm[data-plan="' + id + '"]');
    const out = document.getElementById('reset-out');
    button.disabled = true;
    try {
      const { data } = await post('/admin/api/reset-month', { plan_id: Number(id), confirm: input.value });
      if (data && data.ok) { location.reload(); return; }
      show(out, (data && data.error) || 'Unexpected response');
    } catch (err) {
      show(out, String(err));
    } finally {
      button.disabled = false;
    }
  });
}
</script>
`);
}
