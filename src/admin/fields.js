// Field reading for the library editor's writes.
//
// Four entities take the same handful of shapes — a trimmed line of text, a
// small integer in a range, one of a fixed set of words, an archived flag — and
// each of them is a PATCH that must touch only the keys it was sent. Written
// once here rather than four times, because a validation that exists in three
// of four places is the one that lets a `week_theme` of 7 into the draw.

// A named string field. Blank is refused unless `blank` is allowed, in which
// case an empty string is stored as NULL: `workbook_page` and `blurb` are
// genuinely optional and "" is not a page name.
function readText(raw, { max, blank = false }) {
  const value = String(raw ?? '').trim();
  if (!value) {
    if (blank) return { value: null };
    return { error: 'cannot be blank' };
  }
  if (max && value.length > max) return { error: `is longer than ${max} characters` };
  return { value };
}

function readInt(raw, { min, max }) {
  const value = Number(raw);
  if (!Number.isInteger(value)) return { error: 'must be a whole number' };
  if (min !== undefined && value < min) return { error: `must be at least ${min}` };
  if (max !== undefined && value > max) return { error: `must be at most ${max}` };
  return { value };
}

// A builder that collects `column = ?` fragments and their values, and holds the
// first error it hit. A handler reads every field it accepts, then asks once
// whether anything went wrong and once whether anything is left to write.
export class Fields {
  constructor(body) {
    this.body = body ?? {};
    this.columns = [];
    this.values = [];
    this.error = null;
  }

  has(key) {
    return this.body[key] !== undefined;
  }

  set(column, value) {
    this.columns.push(`${column} = ?`);
    this.values.push(value);
    return this;
  }

  // What a column has been set to, for a handler that needs to check one field
  // against another before it writes.
  value(column) {
    const i = this.columns.indexOf(`${column} = ?`);
    return i === -1 ? undefined : this.values[i];
  }

  fail(message) {
    if (!this.error) this.error = message;
    return this;
  }

  // `label` is what the owner sees. The column name is a schema detail and
  // "week_theme must be at most 4" is not the sentence a parent should read.
  take(key, column, label, read) {
    if (!this.has(key)) return this;
    const { value, error } = read(this.body[key]);
    if (error) return this.fail(`${label} ${error}`);
    return this.set(column, value);
  }

  text(key, column, label, opts = {}) {
    return this.take(key, column, label, (raw) => readText(raw, opts));
  }

  int(key, column, label, opts = {}) {
    return this.take(key, column, label, (raw) => readInt(raw, opts));
  }

  oneOf(key, column, label, allowed) {
    return this.take(key, column, label, (raw) => {
      const value = String(raw ?? '').trim();
      return allowed.includes(value)
        ? { value }
        : { error: `must be one of ${allowed.join(', ')}` };
    });
  }

  // Archived is the only destructive act the library allows, and it is
  // reversible. Anything truthy archives; 0, false and '' restore.
  flag(key, column) {
    if (!this.has(key)) return this;
    const raw = this.body[key];
    const on = raw === true || raw === 1 || raw === '1' || raw === 'true';
    return this.set(column, on ? 1 : 0);
  }

  get empty() {
    return this.columns.length === 0;
  }
}

// Slugs are generated, never typed. They are the key the seed upserts on
// (DESIGN.md §12), so a custom task must not be able to collide with a seeded
// slug and then be quietly skipped by the next Run seed — hence the suffix walk
// against what is already there.
export function slugify(text) {
  const base = String(text ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'untitled';
}

export async function uniqueSlug(db, table, wanted) {
  const taken = async (slug) =>
    Boolean(await db.prepare(`SELECT 1 FROM ${table} WHERE slug = ?`).bind(slug).first());
  if (!(await taken(wanted))) return wanted;
  for (let n = 2; n < 200; n += 1) {
    const candidate = `${wanted}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${wanted}-${Date.now()}`;
}

export const nowIso = () => new Date().toISOString();
