// GET /admin/health — the first page this app ever served, and the one that
// answers "is the code I just pushed the code that is running?"
//
// No auth. Slice 01 puts the ADMIN_TOKEN gate in front of /admin/* along with
// the rest of the page; there is nothing here worth gating yet.

import probeSql from '../lib/probe.sql';

const NOT_SET = '(not set)';

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

// The version metadata binding hands us { id, tag, timestamp }. `id` changes on
// every deploy and is what makes this page a deploy check at all.
//
// `tag` does not carry the commit on this account — a Workers Build leaves it
// empty, which is what the first deploy showed. The commit arrives instead as a
// plain var set by the deploy command:
//
//   npx wrangler deploy --var COMMIT_SHA:"${WORKERS_CI_COMMIT_SHA:-unknown}"
//
// This is slice 00's named fallback and it costs no build step. If the var is
// missing the page still renders and the row reads (not set); nothing depends
// on it, because `id` already answers "is this the code I just pushed".
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

export async function adminHealth(request, env) {
  const version = versionOf(env);
  const d1 = await d1Status(env);

  const rows = [
    ['Version id', version.id],
    ['Commit', version.tag],
    ['Deployed at', version.timestamp],
    ['D1', d1.ok ? `yes — ${d1.detail}` : `NO — ${d1.detail}`],
    ['.sql text rule', `yes — probe.sql is ${probeSql.length} characters`],
  ];

  const body = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Globetrotters — health</title>
<style>
  body { font: 16px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
         margin: 2rem auto; max-width: 40rem; padding: 0 1rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: .35rem .5rem; border-bottom: 1px solid #ccc;
           vertical-align: top; }
  th { white-space: nowrap; width: 10rem; font-weight: 600; }
  td { word-break: break-all; }
</style>
<h1>Health</h1>
<table>
${rows.map(([k, v]) => `  <tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('\n')}
</table>
`;

  return new Response(body, {
    status: d1.ok ? 200 : 503,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
