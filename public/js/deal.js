// "Deal me three" — the best interaction on the setup screen, and the one that
// must never deal a blank (DESIGN.md §7 Month setup).
//
// Its own module, with no DOM in it, because the rule is the whole feature: a
// country with one hook is a card with nothing on it, and a country the family
// has already stamped is a month someone in this house has already had.
//
// Hook coverage is 75–100 countries of 195 (§9), so the shuffle draws from a
// minority of the catalog on purpose. Search and browse still reach all 195.

export const MIN_HOOKS = 2;

export function dealCandidates(countries, hooksByCountry, stampedIds = new Set()) {
  return countries.filter((country) => {
    if (stampedIds.has(country.id)) return false;
    return (hooksByCountry.get(country.id)?.length || 0) >= MIN_HOOKS;
  });
}

// Three distinct countries, or fewer if that is all there is. The caller decides
// whether to offer the control at all — a shuffle that can only ever deal two is
// not a shuffle, and until slice 09 lands `003_country_data.sql` there are no
// hooks at all and the honest answer is to not offer it.
export function dealThree(candidates, count = 3, random = Math.random) {
  const pool = [...candidates];
  const out = [];
  while (out.length < count && pool.length) {
    out.push(...pool.splice(Math.floor(random() * pool.length), 1));
  }
  return out;
}

export function hooksByCountry(hooks) {
  const map = new Map();
  for (const hook of hooks) {
    if (!map.has(hook.country_id)) map.set(hook.country_id, []);
    map.get(hook.country_id).push(hook);
  }
  return map;
}

// country_id -> the ink of whoever stamped it. A dot, not a lockout: browse
// still reaches a stamped country and setup still accepts it. What it prevents
// is choosing one by accident.
export function stampedInk(stamps, people) {
  const color = new Map(people.map((p) => [p.id, p.color]));
  const out = new Map();
  for (const stamp of stamps) {
    if (!out.has(stamp.country_id)) out.set(stamp.country_id, []);
    out.get(stamp.country_id).push(color.get(stamp.person_id));
  }
  return out;
}
