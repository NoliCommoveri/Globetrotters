// Month setup — the ceremony (DESIGN.md §7 Month setup).
//
// It runs 27 times in the whole school year, which makes it the least-used
// screen in the app and by far the highest-stakes: what happens here silently
// determines four weeks of work. So it is three deliberate steps with a country,
// a focus and a project type in them, not a form with three selects.
//
// Everything on this screen exists to show a consequence rather than a label. A
// country card carries a hook and an adventure level because that is what the
// choice is actually between. A focus shows three task titles because
// "people-and-power" means nothing to an 11-year-old. A project type shows its
// materials because September 1st is when a parent needs to know about the foam
// board.

import { el, monthName, adventure, shortDate, weeksSpan } from './dom.js';
import { getCatalog, getPassport, getFocusSamples, createPlan, SignedOut } from './api.js';
import { dealCandidates, dealThree, hooksByCountry, stampedInk } from './deal.js';

const STAGES = ['country', 'focus', 'project'];

export function setupScreen(ctx) {
  const root = el('section', { class: 'panel' });

  const local = {
    loading: true,
    error: null,
    data: null,          // { countries, focuses, projectTypes, hooks, affinities, ink, candidates }
    stage: 'country',
    browse: 'browse',    // 'browse' | 'search'
    continent: null,
    query: '',
    dealt: null,         // the three on screen, or null when the shuffle is idle
    detail: null,        // a country tapped through to
    country: null,
    focus: null,         // what will be submitted
    // Separate from `focus` on purpose: a recommended focus arrives highlighted
    // — its preview open — but never selected. Choosing is a tap, always.
    highlight: null,
    samples: new Map(),
    project: null,
    // Which Monday the month starts on. The window comes from the Worker on
    // /api/me (Q-21) and the default is its first entry that is not earlier
    // than the old rule's answer — which is the entry the Worker would pick
    // for itself if this were left null.
    start: ctx.startWeeks?.length ? defaultStart(ctx.startWeeks) : null,
    submitting: false,
  };

  const set = (patch) => { Object.assign(local, patch); paint(); };

  // The old rule, read off the window rather than recomputed: the first Monday
  // in it that falls inside the month. The window's earlier entries are the week
  // the month begins in, which is the whole point of the control but never the
  // default — a month starts in its own first full week unless somebody says
  // otherwise.
  function defaultStart(weeks) {
    return weeks.find((date) => date.slice(0, 7) === ctx.month) || weeks[weeks.length - 1];
  }

  // ------------------------------------------------------------------ data --

  async function load() {
    try {
      const [catalog, passport] = await Promise.all([getCatalog(), getPassport()]);
      const hooks = hooksByCountry(catalog.hooks);
      const ink = stampedInk(passport.stamps, passport.people);
      local.data = {
        ...catalog,
        hooksBy: hooks,
        ink,
        affinityBy: byCountry(catalog.affinities),
        candidates: dealCandidates(catalog.countries, hooks, new Set(ink.keys())),
        continents: [...new Set(catalog.countries.map((c) => c.continent))].sort(),
      };
    } catch (err) {
      if (err instanceof SignedOut) return ctx.refresh();
      local.error = err.message;
    } finally {
      local.loading = false;
      paint();
    }
  }

  function byCountry(rows) {
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.country_id)) map.set(row.country_id, []);
      map.get(row.country_id).push(row);
    }
    return map;
  }

  const focusById = (id) => local.data.focuses.find((f) => f.id === id);

  // The recommendations for the chosen country, best fit first. Score 3 is
  // exceptional, 2 is good; absence is neutral and stores nothing (§9).
  function recommended() {
    if (!local.country) return [];
    return (local.data.affinityBy.get(local.country.id) || [])
      .filter((a) => focusById(a.focus_id))
      .sort((a, b) => b.score - a.score);
  }

  // ------------------------------------------------------------- fragments --

  function steps() {
    const at = STAGES.indexOf(local.stage);
    return el('ol', { class: 'steps' }, STAGES.map((stage, i) => el('li', {
      class: 'step',
      'aria-current': i === at ? 'step' : null,
      'data-done': i < at ? true : null,
      text: { country: 'Country', focus: 'Focus', project: 'Make' }[stage],
    })));
  }

  // What has been chosen so far, and a way back to it. Setup is a ceremony, and
  // a ceremony you cannot back out of one step is a form.
  function chosen() {
    const crumbs = [];
    if (local.country) {
      crumbs.push(el('button', {
        class: 'crumb', type: 'button', text: local.country.name,
        on: { click: () => set({ stage: 'country', detail: null }) },
      }));
    }
    if (local.focus) {
      crumbs.push(el('button', {
        class: 'crumb', type: 'button', text: local.focus.name,
        on: { click: () => set({ stage: 'focus' }) },
      }));
    }
    return crumbs.length ? el('p', { class: 'crumbs' }, crumbs) : null;
  }

  function inkDots(country) {
    const colors = local.data.ink.get(country.id);
    if (!colors) return null;
    return el('span', {
      class: 'stamped',
      title: 'Someone here has already done this one',
      'aria-label': 'Already stamped',
    }, colors.map((color) => el('span', { class: 'dot', style: `--ink:${color}` })));
  }

  // The hook is the card (§7). One line, phrased as a lead rather than a fact,
  // and a country without one is a card with a name and an adventure level —
  // which is the honest state of 100 of the 195 until slice 09.
  function countryCard(country, { hook = true } = {}) {
    const hooks = local.data.hooksBy.get(country.id) || [];
    return el('button', {
      class: 'country', type: 'button',
      on: { click: () => set({ detail: country }) },
    }, [
      el('span', { class: 'country-head' }, [
        el('span', { class: 'country-name', text: country.name }),
        inkDots(country),
      ]),
      hook && hooks[0] ? el('span', { class: 'hook', text: hooks[0].text }) : null,
      el('span', { class: 'meta' }, [
        el('span', { class: 'pill', text: adventure(country.research_depth) }),
        el('span', { class: 'meta-dim', text: country.region || country.continent }),
      ]),
    ]);
  }

  // ---------------------------------------------------------- country stage --

  function dealControl() {
    const pool = local.data.candidates;
    // It must never deal a blank, so when it cannot fill three cards with
    // something written on them it is not offered at all. Browse and search
    // still reach all 195.
    if (pool.length < 3) return null;

    return el('div', { class: 'deal' }, [
      el('button', {
        class: 'primary', type: 'button',
        text: local.dealt ? 'Deal three more' : 'Deal me three',
        on: { click: () => set({ dealt: dealThree(pool) }) },
      }),
      local.dealt
        ? el('div', { class: 'stack' }, local.dealt.map((c) => countryCard(c)))
        : el('p', { class: 'note', text: 'Three countries, three hooks. Pick one or deal again.' }),
    ]);
  }

  function countryList() {
    const all = local.data.countries;
    if (local.query.trim()) {
      const q = local.query.trim().toLowerCase();
      const hits = all.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 40);
      return hits.length
        ? el('div', { class: 'stack' }, hits.map((c) => countryCard(c)))
        : el('p', { class: 'note', text: `Nothing called “${local.query.trim()}”.` });
    }
    if (!local.continent) return null;
    return el('div', { class: 'stack' },
      all.filter((c) => c.continent === local.continent).map((c) => countryCard(c)));
  }

  function countryStage() {
    if (local.detail) return countryDetail();

    const search = el('input', {
      type: 'text', id: 'country-search', name: 'country-search',
      placeholder: 'Search all 195', value: local.query,
      autocapitalize: 'words', autocorrect: 'off', spellcheck: 'false',
      enterkeyhint: 'search',
      on: {
        input: (event) => {
          // Typed into, not re-rendered from scratch: replacing the input would
          // take the keyboard down on every keystroke.
          local.query = event.target.value;
          local.continent = null;
          paintList();
        },
      },
    });

    const continents = el('div', { class: 'chips' }, local.data.continents.map((name) => el('button', {
      class: 'chip', type: 'button', text: name,
      'aria-pressed': local.continent === name ? 'true' : 'false',
      on: {
        click: () => {
          local.query = '';
          search.value = '';
          local.continent = local.continent === name ? null : name;
          paint();
        },
      },
    })));

    const list = el('div', { class: 'list' }, countryList());
    function paintList() { list.replaceChildren(countryList() || ''); }

    return el('div', { class: 'stack' }, [
      el('h1', { text: `Where are you going in ${monthName(ctx.month)}?` }),
      dealControl(),
      el('div', {}, [el('label', { for: 'country-search', text: 'Or find it yourself' }), search]),
      continents,
      list,
    ]);
  }

  // Tap through to all the hooks and the recommended focuses with their reasons.
  // This is the level the choice gets made at when the card was not enough.
  function countryDetail() {
    const country = local.detail;
    const hooks = local.data.hooksBy.get(country.id) || [];
    const fits = (local.data.affinityBy.get(country.id) || [])
      .filter((a) => focusById(a.focus_id))
      .sort((a, b) => b.score - a.score);

    return el('div', { class: 'stack' }, [
      el('button', { class: 'crumb', type: 'button', text: '← Back', on: { click: () => set({ detail: null }) } }),
      el('h1', { text: country.name }),
      el('p', { class: 'meta' }, [
        el('span', { class: 'pill', text: adventure(country.research_depth) }),
        el('span', { class: 'meta-dim', text: country.region || country.continent }),
        inkDots(country),
      ]),
      hooks.length
        ? el('ul', { class: 'hooks' }, hooks.map((h) => el('li', { text: h.text })))
        : el('p', { class: 'note', text: 'No hooks written for this one yet — you get to find your own.' }),
      fits.length
        ? el('div', { class: 'stack' }, [
          el('h2', { text: 'Good fits' }),
          el('ul', { class: 'fits' }, fits.map((a) => el('li', {}, [
            el('span', { class: 'fit-name', text: focusById(a.focus_id).name }),
            a.reason ? el('span', { class: 'note', text: a.reason }) : null,
          ]))),
        ])
        : null,
      el('button', {
        class: 'primary', type: 'button', text: `Take ${country.name}`,
        on: {
          click: () => {
            const fit = fits[0] ? focusById(fits[0].focus_id) : null;
            set({
              country, detail: null, stage: 'focus',
              // Highlighted, not selected: the preview opens on the best fit and
              // the Continue button stays closed until a kid taps something.
              highlight: fit || null,
              focus: null,
            });
          },
        },
      }),
    ]);
  }

  // ------------------------------------------------------------ focus stage --

  function samplesFor(focus) {
    const cached = local.samples.get(focus.id);
    if (cached) {
      return cached.length
        ? el('ul', { class: 'samples' }, cached.map((s) => el('li', { text: s.title })))
        : el('p', { class: 'note', text: 'No tasks lean this way yet.' });
    }
    getFocusSamples(focus.id)
      .then((body) => {
        local.samples.set(focus.id, body.samples);
        if (local.highlight?.id === focus.id) paint();
      })
      .catch(() => {
        local.samples.set(focus.id, []);
        if (local.highlight?.id === focus.id) paint();
      });
    return el('p', { class: 'note', text: 'Looking…' });
  }

  function focusStage() {
    const recs = new Map(recommended().map((a) => [a.focus_id, a]));

    const cards = local.data.focuses.map((focus) => {
      const rec = recs.get(focus.id);
      const open = local.highlight?.id === focus.id;
      return el('div', {
        class: 'focus',
        'data-open': open ? true : null,
        'aria-current': local.focus?.id === focus.id ? 'true' : null,
      }, [
        el('button', {
          class: 'focus-head', type: 'button',
          on: { click: () => set({ highlight: focus, focus }) },
        }, [
          el('span', { class: 'focus-name', text: focus.name }),
          rec ? el('span', { class: 'pill', text: rec.score === 3 ? 'Great fit' : 'Good fit' }) : null,
        ]),
        focus.blurb ? el('p', { class: 'note', text: focus.blurb }) : null,
        rec?.reason ? el('p', { class: 'reason', text: rec.reason }) : null,
        // Three titles this focus would pull in, from its weight-3 rows only.
        // Sampling everything it "would pull in" returns mostly neutral tasks
        // and previews every focus identically (§7).
        open ? el('div', { class: 'preview' }, [
          el('p', { class: 'preview-label', text: 'Tasks like these' }),
          samplesFor(focus),
        ]) : null,
      ]);
    });

    return el('div', { class: 'stack' }, [
      el('h1', { text: `How will you study ${local.country.name}?` }),
      el('p', { class: 'lede', text: 'A focus changes weeks 2 and 3. Tap one to see what it pulls in.' }),
      el('div', { class: 'stack' }, cards),
      el('button', {
        class: 'primary', type: 'button',
        disabled: !local.focus,
        text: local.focus ? `Study ${local.focus.name}` : 'Pick a focus',
        on: { click: () => set({ stage: 'project' }) },
      }),
    ]);
  }

  // ---------------------------------------------------------- project stage --

  function projectStage() {
    // A project type with an empty week 4 is a month that ends in five blank
    // cards. Seed v0 fills one of the six; slice 09 fills the rest by adding
    // rows, with no change here.
    const usable = local.data.project_types.filter((p) => p.week4_templates > 0);

    return el('div', { class: 'stack' }, [
      el('h1', { text: 'What will you make?' }),
      el('p', { class: 'lede', text: 'Week 4 is building it. Check what you will need before you pick.' }),
      el('div', { class: 'stack' }, usable.map((project) => el('button', {
        class: 'project', type: 'button',
        'aria-current': local.project?.id === project.id ? 'true' : null,
        on: { click: () => set({ project }) },
      }, [
        el('span', { class: 'focus-name', text: project.name }),
        project.materials ? el('span', { class: 'note', text: project.materials }) : null,
      ]))),
      usable.length < local.data.project_types.length
        ? el('p', { class: 'note', text: 'More kinds of project are coming.' })
        : null,
      startWeek(),
      el('button', {
        class: 'primary', type: 'button',
        disabled: !local.project || local.submitting,
        text: local.submitting ? 'Drawing…' : `Draw my ${monthName(ctx.month)}`,
        on: { click: draw },
      }),
    ]);
  }

  // The start week, on the last stage and above the button that spends it. It is
  // offered only where there is a choice: a month opened after it is over has
  // one Monday in its window and no question to ask.
  //
  // Labelled with the four weeks it buys rather than with the Monday alone. The
  // reason to start early is that the month then finishes early, and 'Aug 31'
  // does not say that (§7).
  function startWeek() {
    const weeks = ctx.startWeeks || [];
    if (weeks.length < 2 || !local.start) return null;
    return el('div', { class: 'stack' }, [
      el('h2', { text: 'When does it start?' }),
      el('p', { class: 'lede', text: 'Four weeks from the Monday you pick. Move it if a trip is in the way.' }),
      el('div', { class: 'chips' }, weeks.map((date) => el('button', {
        class: 'chip', type: 'button',
        'aria-current': local.start === date ? 'true' : null,
        text: shortDate(date),
        on: { click: () => set({ start: date }) },
      }))),
      el('p', { class: 'note', text: `Weeks run ${weeksSpan(local.start)}.` }),
    ]);
  }

  async function draw() {
    set({ submitting: true, error: null });
    try {
      const body = await createPlan({
        month: ctx.month,
        start_date: local.start,
        country_id: local.country.id,
        focus_id: local.focus.id,
        project_type_id: local.project.id,
      });
      ctx.go(`/plan/${body.plan.id}`, body);
    } catch (err) {
      if (err instanceof SignedOut) return ctx.refresh();
      // Two devices, or a double-tap on a slow connection. The 409 is a route,
      // not an error screen: it carries the id of the plan that already exists.
      if (err.status === 409 && err.data.plan_id) return ctx.go(`/plan/${err.data.plan_id}`);
      set({ submitting: false, error: err.message });
    }
  }

  // ---------------------------------------------------------------- render --

  function paint() {
    if (local.loading) {
      root.replaceChildren(el('p', { class: 'note', text: 'Loading the world…' }));
      return;
    }
    if (!local.data) {
      root.replaceChildren(
        el('p', { class: 'error', role: 'alert', text: local.error || 'Could not load the countries.' }),
      );
      return;
    }

    const stage = { country: countryStage, focus: focusStage, project: projectStage }[local.stage]();
    root.replaceChildren(...[
      steps(),
      chosen(),
      stage,
      local.error ? el('p', { class: 'error', role: 'alert', text: local.error }) : null,
    ].filter(Boolean));
  }

  paint();
  load();
  return root;
}
