# Due-outs

Things only the owner can provide. A build session reads this before writing
code and states anything outstanding at the top of the session.

Everything here is done in a web console or a browser. Nothing here needs a
terminal — if something appears to, it is specced wrong (§3).

| # | Due-out | Needed by | State |
|---|---|---|---|
| D-02 | D1 database created, name and id | 00 | done — `globetrotters-prod` |
| D-06 | Worker created and git-connected to this repo; name and route decided | 00 | done — `globetrotters`, `workers.dev` |
| D-07 | `ADMIN_TOKEN` value chosen | 01 | outstanding |
| D-08 | Worker secrets set: `FAMILY_PASSCODE`, `ADMIN_TOKEN`, `FAMILY_TZ` | 00 | outstanding |
| D-09 | Three ink colors for the three people | 02 | outstanding |
| D-10 | Two font files, licensed for self-hosting | 03 | outstanding |
| D-11 | `FAMILY_TZ` value confirmed | 02 | outstanding |
| D-12 | The month the school year starts | 04 | outstanding |
| D-13 | Paper size the passport prints to | 06 | outstanding |
| D-14 | Which tablet and browser the wall runs on | 07 | outstanding |

---

## Detail

**D-02, D-06. Cloudflare.** Both are done. The database is `globetrotters-prod`
and the Worker is `globetrotters`, git-connected to this repo and building on
push to `main`.

The database id goes straight into `wrangler.toml`:

| Binding | Name | `database_id` |
|---|---|---|
| `DB` | `globetrotters-prod` | `5f351cd1-d7e7-4ddc-af41-c2e1b0a68e02` |

**There is no dashboard step that binds D1 to this Worker, and looking for one
is a dead end.** A git-connected Worker takes *all* of its configuration — what
script to run, what to serve as static assets, and every binding — from
`wrangler.toml` in the repo. The dashboard's Bindings editor is locked for such
a Worker: a binding added there does not persist, because Cloudflare will not
let the two sources drift. The binding is a commit, not a click.

Two symptoms of the same missing file, both worth recognizing before slice 00
lands `wrangler.toml`:

- The Worker deploys the repo as **static assets with no script**. That is what
  is deployed right now, and it is expected — there is no `src/` yet.
- Settings then reports **"Variables cannot be added to a Worker that only has
  static assets."** Nothing is broken; the file that gives the Worker a script
  and its bindings simply does not exist yet.

The name in `wrangler.toml` must read `globetrotters`. A mismatch does not fail
— it deploys a second Worker under the other name and leaves this one serving
the old build, which is a confusing half-hour.

Both fields of the D1 pair must match the dashboard. Wrangler validates
`database_name` against `database_id` and fails the build on a mismatch rather
than writing somewhere unexpected.

**Secrets are the exception** (D-07, D-08). They are set in the dashboard, never
in `wrangler.toml`, which is correct — a secret value must not be committed to
git.

**D-07, D-08. Secrets.** Three Worker secrets, set once in the dashboard:

- `FAMILY_PASSCODE` — one shared passcode for the family. Typed once per
  device, then not again for a year.
- `ADMIN_TOKEN` — separate from the passcode, and it must be. It is what keeps
  a curious 12-year-old out of the library editor and Reset month. It is also
  the key the family session cookie is signed with, so changing it logs all
  three people out. Set once and left alone.
- `FAMILY_TZ` — an IANA zone name, e.g. `America/Denver`. Every `local_date` is
  computed from it at insert. Getting it wrong shifts which calendar day a
  session lands on.

`FAMILY_TZ` isn't read until slice 02 and `ADMIN_TOKEN` not until 01, but all
three are set in one visit rather than three. Set them before the first build,
or re-run the build afterward — a secret added to a Worker is picked up by the
next deploy, not by the code already running.

**D-09. Ink colors.** Three saturated colors against a deep ink navy ground and
chart-paper off-white (§11). They are used only for ownership and completion —
nothing else in the app gets to be colorful — and they have to stay distinct
when a home printer renders all three as grey, which is why the stamp also
carries the person's name.

Names can be typed on `/admin` after slice 02 ships. The colors are a palette
decision and placeholder colors that ship are placeholder colors that stay.

**D-10. Fonts.** A condensed grotesque for display — headings, country names,
the stamp face — against a plain humanist sans for body and prompts. Both with
tabular numerals; this app counts things constantly. Both self-hosted in the
Worker's assets, which means a webfont license that permits self-hosting.

This is the one due-out with a cost and a lead time. The shell can be built
against system fonts and swapped later, but the type scale is tuned to the real
faces and tuning it twice is the more expensive path.

**D-12. The school year.** September through May is what the doc assumes: the
empty state reads "Pick a country to start September" and the passport grid is
nine rows. Confirm before slice 04 hardcodes either.

**D-13. Paper.** The passport is the page that goes in the front of the binder
in June, with 27 stamps on it. Letter or A4, and whether it has to fit one
sheet.

**D-14. The tablet.** iPad Safari's age decides whether the screen wake lock
exists at all. If it doesn't, the fallback is the tablet's own display-sleep
and Guided Access settings, not a workaround in the app — but that is a setting
the owner has to change, so it needs to be known before slice 07 rather than
discovered on the wall.
