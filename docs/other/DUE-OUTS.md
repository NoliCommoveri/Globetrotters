# Due-outs

Things only the owner can provide. A build session reads this before writing
code and states anything outstanding at the top of the session.

Everything here is done in a web console or a browser. Nothing here needs a
terminal — if something appears to, it is specced wrong (§3).

| # | Due-out | Needed by | State |
|---|---|---|---|
| D-02 | D1 database created, name and id | 00 | done — `globetrotters-prod` |
| D-06 | Worker created and git-connected to this repo; name and route decided | 00 | done — `globetrotters` on `globetrotters.immotus.app` |
| D-07 | `ADMIN_TOKEN` value chosen | 01 | done |
| D-08 | Worker secrets set: `FAMILY_PASSCODE`, `ADMIN_TOKEN`, `FAMILY_TZ` | 00 | done |
| D-09 | Three ink colors for the three people | 02 | done — deep purple, lilac, blue |
| D-10 | Two font files, licensed for self-hosting | 03 | outstanding — the shell ships on system fonts until they land |
| D-11 | `FAMILY_TZ` value confirmed | 02 | done — `America/Chicago` |
| D-12 | The month the school year starts | 04 | done — September through May |
| D-13 | Paper size the passport prints to | 06 | done — US Letter, one sheet |
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

`wrangler.toml` is committed at the repo root and the Worker runs a script. Two
symptoms mean it has stopped being found there — a rename, a moved file, a
changed build root — and they are the same fault, not two:

- The Worker deploys the repo as **static assets with no script**.
- Settings then reports **"Variables cannot be added to a Worker that only has
  static assets."**

The app answers on **`globetrotters.immotus.app`**, attached as a custom domain
in the dashboard. The `workers.dev` subdomain still answers as well.

The route is deliberately **not** declared in `wrangler.toml`. The domain is
already bound where it works, and a `routes` entry the account cannot satisfy
fails the build — which would take a working deploy down. Nothing in the app
hardcodes an origin, so moving the binding into the file later is three lines
and changes nothing else.

**The deploy command** carries one flag, set in the Worker's build settings:

```
npx wrangler deploy --var COMMIT_SHA:"${WORKERS_CI_COMMIT_SHA:-unknown}"
```

It belongs in the **Deploy command** field, and the **Build command** field is
empty — there is no build step. The flag is what puts the commit on
`/admin/health`; the version tag is empty on a Workers Build, so without it that
row reads `(not set)`. Nothing breaks if it is missing.

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
- `FAMILY_TZ` — `America/Chicago` (D-11). Every `local_date` is computed from it
  at insert, so getting it wrong shifts which calendar day a session lands on.

All three are set. They were added before the Worker's first real build, which
is the right order: a secret is picked up by the next deploy, not by code
already running.

**The values live in the Cloudflare dashboard and nowhere else.** A secret's
value is not viewable again after saving, and none of the three belongs in this
repo — not here, not in `wrangler.toml`, not in a slice. Keep a copy in a
password manager; `ADMIN_TOKEN` in particular cannot be rotated casually,
because every family session cookie is signed with it (§2).

**D-09. Ink colors.** Settled. Two purples and a blue, one per person:

| Ink | Hex | Greyscale |
|---|---|---|
| Deep purple | `#5B2A86` | ~26% |
| Lilac | `#D07AC0` | ~61% |
| Blue | `#2E6FD9` | ~41% |

They sit against a deep ink navy ground and chart-paper off-white (§11) and are
used only for ownership and completion — nothing else in the app gets to be
colorful. The three greyscale values are 15 and 20 points apart, which is what
keeps three stamps separable when the passport is photocopied; the stamp also
carries the person's name, so the color never has to carry it alone.

Seeded in `002_seed.sql` and editable on `/admin`, where the names are typed
too. Changing one later is a color picker and a Save.

**D-10. Fonts.** A condensed grotesque for display — headings, country names,
the stamp face — against a plain humanist sans for body and prompts. Both with
tabular numerals; this app counts things constantly. Both self-hosted in the
Worker's assets, which means a webfont license that permits self-hosting.

This is the one due-out with a cost and a lead time, and it is the only part of
slice 03 that did not get built. The shell runs on a system stack in the
meantime. Swapping in the real faces is three edits to `public/css/app.css`: an
`@font-face` pair at the top, and the first family in each of `--font-display`
and `--font-body`. The type scale under them is tuned to a system sans and wants
re-tuning to the real ones — that re-tune is the cost of having gone first.

**D-12. The school year.** September through May. Nine months, 27 stamps for the
family. It is hardcoded in one place, `src/lib/dates.js`, and read from there by
setup (which refuses a month outside the year), by the empty state (which names
the month it would open, and points at the September ahead over the summer) and
by the passport grid's nine rows.

**D-13. Paper.** US Letter, and it fits one sheet. The passport is the page that
goes in the front of the binder in June, with 27 stamps on it, and the print
stylesheet sizes the grid in inches so the whole year scales down rather than
breaking across pages: `@page { size: letter; margin: .5in }`, nine rows of
`.82in`, which leaves about `.8in` of slack for a browser's own header and
footer. Changing to A4 is the two values in `@page` and nothing else.

**D-14. The tablet.** iPad Safari's age decides whether the screen wake lock
exists at all. If it doesn't, the fallback is the tablet's own display-sleep
and Guided Access settings, not a workaround in the app — but that is a setting
the owner has to change, so it needs to be known before slice 07 rather than
discovered on the wall.
