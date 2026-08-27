# Slice 00 — Deploy path

**Status:** not started
**Band:** M
**Implements:** §2 (stack, bindings), §3 (deploy half)
**Depends on:** nothing

**Goal.** A commit on `main` becomes a running Worker without a terminal.

---

## Due-outs

None of this can be built around. See `../other/DUE-OUTS.md` for the full list
and the current state of each.

- **D-01** Cloudflare account exists, account ID known
- **D-02** D1 database created (production), name and ID known
- **D-03** D1 database created (preview), name and ID known
- **D-04** R2 bucket created, name known
- **D-05** GitHub repo secrets set: `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`
- **D-06** Worker name and route decided (`workers.dev` subdomain or custom
  domain)
- **D-08** Worker secrets set: `FAMILY_PASSCODE`, `ADMIN_TOKEN`,
  `SESSION_SECRET`, `FAMILY_TZ`

`FAMILY_TZ` and `SESSION_SECRET` are not used until slices 02 and 03, but all
four are set in one visit to the dashboard rather than three.

**Nothing in this slice can be built before D-01 through D-06.** There is no
partial version — `wrangler.toml` without database ids does not deploy.

## Open questions

- **Q-03** — the HMAC signing secret. `DESIGN.md` §2 signs the session cookie
  and §3 names `ADMIN_TOKEN` and `FAMILY_TZ` as secrets; nothing names the
  signing key. It must exist before D-08 is done, because rotating it later
  logs the whole family out. Proposed: `SESSION_SECRET`.

## Build

- `wrangler.toml`
  - Worker with static assets
  - D1 binding, production and `--preview`
  - R2 bucket bound and unused
  - `[[rules]] type = "Text" globs = ["**/*.sql"]`
- If the text rule fails, fall back to a generated `src/migrations/index.js`
  exporting an ordered array of `{ id, name, sql }`. Decide this here, not in
  slice 01.
- `.github/workflows/deploy.yml` — push to `main` plus `workflow_dispatch`,
  `wrangler deploy`
- Git SHA and build time injected at build, readable at runtime
- `GET /admin/health` — no auth yet — printing SHA, build time, D1 reachable,
  R2 bound

## Exit criteria

- Editing a file in the GitHub web editor changes what `/admin/health` prints
- Re-running the Action from the Actions tab by button works
- The `.sql` text rule is proven: import one throwaway `.sql` file and print
  its length on the health page
- `/admin/health` reports D1 reachable and R2 bound

## Do not build

- Any auth on `/admin`. That arrives in slice 01 with the rest of the page.
- Any table. Schema is slice 01, and creating one here puts a table in the
  database that the migration runner has no record of.
- Any frontend beyond the health page's plain HTML.

## Why first

§3's standing failure mode is pressing Apply pending against a Worker that
hasn't finished deploying. That failure is only diagnosable if the SHA line
already exists — which means it has to exist before the migration runner does.
