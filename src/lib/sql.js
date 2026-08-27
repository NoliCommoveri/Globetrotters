// Quote-aware statement splitter.
//
// `sql.split(';')` is wrong for this project and will stay wrong: country names
// and ~90 kid-voice task prompts carry semicolons and apostrophes inside string
// literals (DESIGN.md §3). This tracks quote and comment state instead.
//
// What it understands, which is everything the migration and seed files use:
//
//   'text'        single-quoted literal, '' escapes a quote inside one
//   "ident"       double-quoted identifier, "" escapes likewise
//   [ident]       bracketed identifier
//   `ident`       backtick identifier
//   -- line       comment to end of line
//   /* block */   comment, not nested (SQLite does not nest them)
//
// What it does not understand: a `BEGIN ... END` body, where the inner
// semicolons belong to the block rather than the outer statement. No trigger or
// compound statement exists in this schema. Adding one means teaching this
// function about BEGIN/END, not working around it in the .sql file.

export function splitStatements(sql) {
  const out = [];
  let start = 0;
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const c = sql[i];

    if (c === "'" || c === '"' || c === '`') {
      // A doubled quote inside a literal is an escaped quote, not a close: the
      // scan simply reopens on the second one and carries on.
      i += 1;
      while (i < n) {
        if (sql[i] === c) {
          if (sql[i + 1] === c) { i += 2; continue; }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (c === '[') {
      i += 1;
      while (i < n && sql[i] !== ']') i += 1;
      i += 1;
      continue;
    }

    if (c === '-' && sql[i + 1] === '-') {
      i += 2;
      while (i < n && sql[i] !== '\n') i += 1;
      continue;
    }

    if (c === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    if (c === ';') {
      const statement = sql.slice(start, i);
      if (hasSql(statement)) out.push(statement.trim());
      start = i + 1;
      i += 1;
      continue;
    }

    i += 1;
  }

  const tail = sql.slice(start);
  if (hasSql(tail)) out.push(tail.trim());
  return out;
}

// A trailing chunk that is only whitespace and comments is not a statement.
// Every .sql file in this repo opens with a comment block, so without this the
// first "statement" of every migration would be a comment D1 would reject.
function hasSql(chunk) {
  return stripComments(chunk).trim().length > 0;
}

function stripComments(chunk) {
  let out = '';
  let i = 0;
  const n = chunk.length;
  while (i < n) {
    const c = chunk[i];
    if (c === "'" || c === '"' || c === '`') {
      const open = i;
      i += 1;
      while (i < n) {
        if (chunk[i] === c) {
          if (chunk[i + 1] === c) { i += 2; continue; }
          i += 1;
          break;
        }
        i += 1;
      }
      out += chunk.slice(open, i);
      continue;
    }
    if (c === '-' && chunk[i + 1] === '-') {
      while (i < n && chunk[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && chunk[i + 1] === '*') {
      i += 2;
      while (i < n && !(chunk[i] === '*' && chunk[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

// SHA-256 of the file's exact bytes. This is what makes drift visible: an
// applied migration whose file has since been edited no longer matches the
// checksum recorded when it ran.
export async function checksum(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
