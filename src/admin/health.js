// GET /admin/health — the page that answers "is the code I just pushed the code
// that is running?", and now also "what is in the database?"
//
// §3's standing failure mode is pressing Apply pending against a Worker that
// hasn't finished deploying. Check the version id here first; it changes on
// every deploy.

import probeSql from '../lib/probe.sql';
import { page, escapeHtml } from '../lib/html.js';
import { migrationStatus, SCHEMA_TABLES } from '../lib/migrations.js';
import { MIGRATIONS } from '../migrations/index.js';

const NOT_SET = '(not set)';

// The version metadata binding hands us { id, tag, timestamp }. `id` changes on
// every deploy and is what makes this page a deploy check at all.
//
// `tag` does not carry the commit on this account — a Workers Build leaves it
// empty. The commit arrives instead as a plain var set by the deploy command:
//
//   npx wrangler deploy --var COMMIT_SHA:"${WORKERS_CI_COMMIT_SHA:-unknown}"
//
// If the var is missing the page still renders and the row reads (not set);
// nothing depends on it, because `id` already answers the question.
function versionOf(env) {
  const meta = env.CF_VERSION_METADATA;
  const commit = env.COMMIT_SHA || meta?.tag || NOT_SET;
  if (!meta) return { id: NOT_SET, tag: commit, timestamp: NOT_SET };
  return {
    id: meta.id || NOT_SET,
    tag: commit,
    timestamp: meta.timestamp || NOT_SET,
  };
}

async function d1Status(env) {
  if (!env.DB) return { ok: false, detail: 'no DB binding' };
  try {
    const row = await env.DB.prepare('SELECT 1 AS ok').first();
    return { ok: row?.ok === 1, detail: row?.ok === 1 ? 'reachable' : 'unexpected response' };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
}

// The highest applied migration id. Read straight from _migrations rather than
// from the file list, so it says what the database believes, not what the
// deploy believes — those disagreeing is the whole reason this page exists.
async function schemaState(env) {
  try {
    const rows = await migrationStatus(env.DB, MIGRATIONS);
    const applied = rows.filter((r) => r.state === 'applied' || r.state === 'drifted');
    const pending = rows.filter((r) => r.state === 'pending').length;
    const drifted = rows.filter((r) => r.state === 'drifted').length;
    const version = applied.length ? applied[applied.length - 1].id : '(none applied)';
    return { version, pending, drifted, error: null };
  } catch (err) {
    return { version: NOT_SET, pending: 0, drifted: 0, error: err.message };
  }
}

// A table that does not exist yet counts as `—`, not as an error. Before Apply
// pending that is every table, which is a legible state rather than a fault.
async function tableCounts(env) {
  const counts = [];
  for (const table of SCHEMA_TABLES) {
    try {
      const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first();
      counts.push([table, String(row?.n ?? 0)]);
    } catch {
      counts.push([table, '—']);
    }
  }
  return counts;
}

export async function adminHealth(request, env) {
  const version = versionOf(env);
  const d1 = await d1Status(env);
  const schema = d1.ok ? await schemaState(env) : { version: NOT_SET, pending: 0, drifted: 0, error: null };
  const counts = d1.ok ? await tableCounts(env) : [];

  const rows = [
    ['Version id', version.id],
    ['Commit', version.tag],
    ['Deployed at', version.timestamp],
    ['D1', d1.ok ? `yes — ${d1.detail}` : `NO — ${d1.detail}`],
    ['.sql text rule', `yes — probe.sql is ${probeSql.length} characters`],
    ['Schema version', schema.error ? `unknown — ${schema.error}` : schema.version],
    ['Migrations', schema.error ? '—' : `${schema.pending} pending, ${schema.drifted} drifted`],
  ];

  return page('Globetrotters — health', `
<h1>Health</h1>
<table>
${rows.map(([k, v]) => `  <tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('\n')}
</table>

<h2>Rows</h2>
${counts.length === 0 ? '<p class="err">No counts — D1 is unreachable.</p>' : `<table>
${counts.map(([k, v]) => `  <tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('\n')}
</table>
<p class="note">A dash means the table does not exist yet.</p>`}

<p><a href="/admin">Admin</a></p>
`, { status: d1.ok ? 200 : 503 });
}
