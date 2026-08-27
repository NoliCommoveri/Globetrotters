// GET /api/passport — the family's year: every stamp, every month that is
// running, and the nine-slot grid both sit in (DESIGN.md §6, §7 Passport).
//
// The screen is slice 06. This endpoint lands here because setup needs one thing
// from it now (Q-07): which countries the family has already stamped. Browse
// marks them with the stamping person's ink, and "Deal me three" skips them —
// two people doing Peru in the same year is the one outcome the shuffle exists
// to avoid.
//
// The whole family, not the cookie's person. The passport is shared and the
// point of it is seeing the other two.

import { json } from '../lib/html.js';
import { todayIn, monthOf, schoolYearMonths } from '../lib/dates.js';

export async function apiPassport(request, env, session) {
  const [people, stamps, plans] = await Promise.all([
    env.DB.prepare('SELECT id, name, color, sort_order FROM people ORDER BY sort_order, id').all(),
    env.DB.prepare(`
      SELECT stamps.id, stamps.plan_id, stamps.person_id, stamps.country_id,
             stamps.focus_id, stamps.earned_at, stamps.headline,
             month_plans.month,
             countries.name AS country_name,
             focuses.name AS focus_name
      FROM stamps
      JOIN month_plans ON month_plans.id = stamps.plan_id
      JOIN countries ON countries.id = stamps.country_id
      JOIN focuses ON focuses.id = stamps.focus_id
      ORDER BY month_plans.month, stamps.person_id
    `).all(),
    // Every plan, not only active ones: an in-progress slot shows the country
    // without a stamp, which is the one piece of live state the family screen
    // can carry in a month where nobody has finished yet.
    env.DB.prepare(`
      SELECT month_plans.id, month_plans.person_id, month_plans.month,
             month_plans.country_id, month_plans.status,
             countries.name AS country_name
      FROM month_plans
      JOIN countries ON countries.id = month_plans.country_id
      ORDER BY month_plans.month, month_plans.person_id
    `).all(),
  ]);

  const today = todayIn(env.FAMILY_TZ);

  return json({
    ok: true,
    today,
    people: people.results,
    stamps: stamps.results,
    plans: plans.results,
    // Nine rows, September through May (D-12). Drawn from day one as blank
    // slots: an unfilled passport shows the shape of the goal in September and
    // is a far stronger invitation than an absent one.
    months: schoolYearMonths(monthOf(today)),
  });
}
