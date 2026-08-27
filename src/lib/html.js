// The admin pages are plain server-rendered HTML with no build step and no
// client JS beyond a confirm box. Three users, five screens (DESIGN.md §2).

export function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

const STYLE = `
  body { font: 16px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
         margin: 2rem auto; max-width: 40rem; padding: 0 1rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: .35rem .5rem; border-bottom: 1px solid #ccc;
           vertical-align: top; }
  th { white-space: nowrap; font-weight: 600; }
  td { word-break: break-word; }
  h2 { font-size: 1rem; margin: 2rem 0 .5rem; }
  form { margin: .75rem 0; }
  input, button { font: inherit; padding: .4rem .5rem; }
  input[type=text], input[type=password] { width: 12rem; }
  .state-pending { font-weight: 700; }
  .state-drifted { font-weight: 700; color: #a00; }
  pre { background: #f4f4f4; padding: .75rem; overflow-x: auto; white-space: pre-wrap;
        word-break: break-word; }
  .err { color: #a00; }
  .note { color: #555; font-size: .875rem; }
`;

export function page(title, body, init = {}) {
  return new Response(`<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
${body}
`, {
    status: init.status ?? 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}
