# Slice 00 — Deploy path

**Status:** in progress — code complete, awaiting the first deploy
**Band:** M
**Implements:** §2 (stack, bindings), §3 (deploy half)
**Depends on:** nothing

**Goal.** A commit on `main` becomes a running Worker without a terminal.

---

## Due-outs

None of this can be built around. See `../other/DUE-OUTS.md` for the full list
and the current state of each.

- **D-02** D1 database created, name and id known — done, `globetrotters-prod`
- **D-06** Worker created and git-connected to this repo — done, `globetrotters`
- **D-08** Worker secrets set: `FAMILY_PASSCODE`, `ADMIN_TOKEN`, `FAMILY_TZ` —
  done

All three are set. `ADMIN_TOKEN` and `FAMILY_TZ` are not read until slices 01
and 02; this slice reads none of them.

Every due-out this slice has is done. It is unblocked.

**The D1 binding is this slice's job, not a dashboard action.** A git-connected
Worker takes every binding from `wrangler.toml`; the dashboard's Bindings editor
is locked for one and a binding added there does not persist. Until the file
below is committed, the Worker deploys the repo as static assets with no script
and Settings reports "Variables cannot be added to a Worker that only has static
assets" — the expected state today, not a fault. See `../other/DUE-OUTS.md`,
D-02/D-06.

## Open questions

None. Q-03 is answered: the session cookie is signed with `ADMIN_TOKEN`
(`DESIGN.md` §2, §15).

## Build

- `wrangler.toml` **at the repo root** — a git-connected build looks for it at
  the build root, and when it is missing the Worker deploys as static assets
  with no script and the dashboard then refuses to add variables to it
  - `name = "globetrotters"`, matching the Worker. A mismatch does not fail the
    build — it deploys a second Worker under the other name
  - Worker with static assets
  - D1 binding `DB` — `globetrotters-prod`
    `5f351cd1-d7e7-4ddc-af41-c2e1b0a68e02`. Both fields must match the
    dashboard; Wrangler validates the pair and fails the build on a mismatch
    rather than writing somewhere unexpected. One database, no
    `preview_database_id` (§2)
  - No R2 binding. The bucket does not exist, and a binding to a missing bucket
    fails the deploy (§1, §2)
  - `[[rules]] type = "Text" globs = ["**/*.sql"]`
- If the text rule fails, fall back to a generated `src/migrations/index.js`
  exporting an ordered array of `{ id, name, sql }`. Decide this here, not in
  slice 01.
- No workflow file and no `.github/` directory. The build is the Worker's own
  git connection.
- Git SHA and build time readable at runtime. Prefer the `[version_metadata]`
  binding, which hands the Worker its version id, tag and timestamp with no
  build step. If the tag does not carry the commit, fall back to injecting it
  from the builder's commit environment variable. Decide it here and prove it on
  the health page — the exit criterion is that the line changes, not which
  mechanism produced it.
- `GET /admin/health` — no auth yet — printing SHA, build time, and D1 reachable

## Exit criteria

Every one of these is checked in a browser against a deployed Worker, so none of
them can be confirmed from a build session. The slice is marked `built` once the
owner has seen all four.

- Editing a file in the GitHub web editor changes what `/admin/health` prints
- Re-running a build from the deployment's **Retry build** button works
- The `.sql` text rule is proven: `src/lib/probe.sql` is imported and its length
  printed on the health page
- `/admin/health` reports D1 reachable

**What to look at, on `https://globetrotters.<subdomain>.workers.dev/admin/health`:**

| Row | Passing |
|---|---|
| Version id | any value, and a *different* one after the next push |
| Commit | the commit sha. `(not set)` means the version tag does not carry it — see below |
| Deployed at | a timestamp from the build just now, not hours ago |
| D1 | `yes — reachable` |
| `.sql` text rule | `yes — probe.sql is N characters` |

D1 failing turns the whole page 503, so a green page is the whole check.

**If Commit reads `(not set)`,** the version tag does not carry the commit on this
account and the fallback named above applies: inject it from the builder's commit
environment variable through a build command. Nothing else on the page changes,
and the deploy check still works — Version id moves on every deploy regardless.

## Do not build

- Any auth on `/admin`. That arrives in slice 01 with the rest of the page.
- Any table. Schema is slice 01, and creating one here puts a table in the
  database that the migration runner has no record of.
- Any frontend beyond the health page's plain HTML.
- An R2 binding, a second D1 database, or a GitHub Actions workflow. A bucket
  with no writer blocks the deploy, a preview database is reachable only from a
  terminal, and an Actions deploy costs an API token, an account id and two repo
  secrets to do what the Worker's git connection already does.

## Why first

§3's standing failure mode is pressing Apply pending against a Worker that
hasn't finished deploying. That failure is only diagnosable if the SHA line
already exists — which means it has to exist before the migration runner does.
