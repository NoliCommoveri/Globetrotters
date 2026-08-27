// Calendar arithmetic, in one place, done in UTC on purpose.
//
// Every date in this app is a plain 'YYYY-MM-DD' string with no time on it, and
// the only clock that decides which one is "today" is FAMILY_TZ (DESIGN.md §5,
// §15). Building a Date from a local timezone and reading getDay() off it is
// how a Sunday-evening setup in Chicago becomes a Monday on a Worker running in
// UTC — so the parsing below is UTC throughout and the timezone is applied once,
// at the single point where "now" becomes a date.
//
// The school year is September through May (D-12). It is hardcoded here rather
// than in nine places: setup refuses a month outside it and the passport grid is
// the nine months this list holds.

export const SCHOOL_START_MONTH = 9;   // September
export const SCHOOL_END_MONTH = 5;     // May
export const SCHOOL_MONTH_COUNT = 9;

// 'YYYY-MM-DD' in FAMILY_TZ. Falls back to UTC when the secret is unset or names
// a zone Intl does not know: a wrong day is recoverable, a thrown error on the
// first screen of the app is not.
export function todayIn(tz, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export const monthOf = (date) => date.slice(0, 7);

function parse(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const format = (dt) => dt.toISOString().slice(0, 10);

// The Monday on or before this date. getUTCDay() is 0 for Sunday, so Sunday
// walks back six days rather than one — the case that makes a September 30th
// Sunday setup land in the right week.
export function mondayOf(date) {
  const dt = parse(date);
  const back = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - back);
  return format(dt);
}

export function firstMondayOf(month) {
  const first = parse(`${month}-01`);
  const forward = (8 - first.getUTCDay()) % 7;   // 0 is Sunday -> 1 day forward
  first.setUTCDate(first.getUTCDate() + forward);
  return format(first);
}

// The later of the month's first Monday and the Monday of the week setup happens
// in (§7, §15). Always a Monday, so plan weeks and calendar weeks agree and the
// week ring in §10 resets when the calendar does.
//
// Backdating a September 20th setup to the 1st would land the kid in week 3 with
// all ten Foundations and Deep Dive tasks dumped onto the carry-forward strip,
// having never seen the flag task.
export function startDateFor(month, today) {
  const first = firstMondayOf(month);
  const current = mondayOf(today);
  return current > first ? current : first;
}

// Whole calendar months from one to the other. Negative when `to` is earlier.
export function monthsBetween(from, to) {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12);
  return `${String(year).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`;
}

// September through May, so a school year straddles two calendar years: anything
// before September belongs to the year that started the previous September.
export function inSchoolYear(month) {
  const m = Number(month.slice(5, 7));
  return m >= SCHOOL_START_MONTH || m <= SCHOOL_END_MONTH;
}

export function schoolYearStart(month) {
  const [y, m] = month.split('-').map(Number);
  const year = m >= SCHOOL_START_MONTH ? y : y - 1;
  return `${year}-09`;
}

// The nine months of the school year this month sits in, in order. The passport
// grid's rows, and what setup offers.
export function schoolYearMonths(month) {
  const start = schoolYearStart(month);
  return Array.from({ length: SCHOOL_MONTH_COUNT }, (_, i) => addMonths(start, i));
}

// The month setup would create right now. Inside the year it is simply this
// month; in June, July or August it is the September ahead, so the empty state
// over the summer reads as an invitation to the year rather than a refusal.
export function setupMonthFor(today) {
  const month = monthOf(today);
  if (inSchoolYear(month)) return month;
  return `${today.slice(0, 4)}-09`;
}
