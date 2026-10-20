# Week 12 — CI/CD Pipeline with GitHub Actions

## Objective
Automatically install, lint, test and build the application on every push, and see the pipeline fail on a broken test and pass again once it is fixed.

## What I built
**Automated tests** — `backend/tests/api.test.js`, run with `npm test`:
- Node 22's built-in test runner (`node:test` + `node:assert`) with `supertest`, which calls the exported Express `app` directly (no server or port needed). Splitting `app.js` from `server.js` in Week 4 is what makes this possible.
- `mongodb-memory-server` starts a throwaway MongoDB for the test run, so tests never touch Atlas or Docker data. Every test starts with empty collections and an empty cache.
- 15 tests in 3 groups — **general** (GET / 200, unknown route 404), **auth** (register returns a token but no password, duplicate email 409, wrong password 401, `/auth/me`), **cars** (no token 401, bad token 401, empty list 200, missing fields 400 with details, create → list, cache MISS → HIT → MISS after a write, 403 for a non-owner and 200 for the owner, delete → 404, malformed id 400).
- `npm run lint` runs `oxlint` on the backend (the frontend already had it).

**Pipeline** — `.github/workflows/ci.yml` at the repository root:
- **Triggers:** `push` and `pull_request` to `main`, `schedule` (Mondays 03:00 UTC, catches breakage from new dependency releases even when nobody pushes), `workflow_dispatch` (manual button).
- **Job `backend`:** checkout → Node 22 with npm cache → cache the MongoDB binary → `npm ci` → lint → test.
- **Job `frontend`:** checkout → Node 22 → `npm ci` → lint → `vite build`.
- **Job `docker`:** `needs: [backend, frontend]`, so images are only built from code that passed. Builds both Dockerfiles and prints their sizes.
- **Secrets:** `JWT_SECRET: ${{ secrets.JWT_SECRET }}` — the value lives in GitHub's encrypted repository secrets, never in the YAML or the repo. GitHub masks it in logs. If it is not set, the tests generate a random one.
- `permissions: contents: read` — the workflow token can only read the repo.

## Results (run locally with the same commands the pipeline uses)
| Step | Result |
|---|---|
| backend `npm ci` | 160 packages, **0 vulnerabilities** |
| backend `npm run lint` | clean |
| backend `npm test` | **15 / 15 pass**, ~2 s |
| frontend `npm ci` / lint / build | 0 vulnerabilities, clean, built |
| `docker build` backend / frontend | 266 MB / 102 MB |
| Deliberately broken assertion (`expect 200` for a request without a token) | **1 failed, 14 passed, exit code 1** — `401 !== 200` |
| Assertion restored | 15 / 15 pass, exit code 0 |

Evidence: [`w12-tests-failing.txt`](../evidence/w12-tests-failing.txt), [`w12-tests-passing.txt`](../evidence/w12-tests-passing.txt)

## Getting the GitHub screenshots (needs you to push)
GitHub only runs the workflow for the commit you push, so the failing run must be pushed on its own:
1. Push the repository. The **Actions** tab shows a green run → screenshot 1.
2. In `backend/tests/api.test.js`, in *"GET /cars without a token returns 401"*, change `assert.equal(res.status, 401)` to `200`. Commit (`test: deliberately break auth test for CI demo`) and push → red ✗ on the **Backend — lint & test** job, and **Docker images build** is skipped because it `needs` the backend job → screenshot 2 (the run list) and screenshot 3 (the failed step's log showing `401 !== 200`).
3. Change it back to `401`, commit (`test: fix auth test`), push → green ✓ → screenshot 4.
4. Optional: add the badge to the top of the README:
   `![CI](https://github.com/<user>/<repo>/actions/workflows/ci.yml/badge.svg)`
5. Optional: **Settings → Secrets and variables → Actions → New repository secret**, name `JWT_SECRET`.

## Key questions
**What is the difference between Continuous Integration and Continuous Deployment, and which does this practical demonstrate?**
CI means every change is automatically built and tested when it is pushed, so integration problems show up within minutes. Continuous Deployment goes further and automatically releases every change that passes to a running environment. This pipeline is **CI** plus a packaging step (building the Docker images); it does not deploy anywhere, because there is no hosting target in this course.

**Why does running tests on every push catch problems earlier than testing manually before a release?**
A failing push points to a small, recent change, and its author still has it in their head. Manual testing before a release happens rarely, covers whatever the tester remembers, and finds many problems at once with no clear cause. The pipeline also runs on a clean machine, so "works on my machine" problems (a missing dependency in `package.json`, an uncommitted file) fail immediately.

**If the test file path were wrong, would the workflow fail at the same step as a genuine test failure?**
It would fail in the same *step* ("Run tests") and with the same red ✗, but the log is different. I hit exactly this: `node --test tests/` treated the folder as a file and failed with `MODULE_NOT_FOUND` and `# tests 1, fail 1` — no assertion error at all. A genuine failure shows `not ok … Expected values to be strictly equal: 401 !== 200`. That is why you read the log, not just the colour.

## Errors & fixes
| Symptom | Cause | Fix |
|---|---|---|
| Installing Jest added **19 moderate vulnerabilities** | One advisory on `sprintf-js` deep in Jest's coverage tooling (istanbul → js-yaml → argparse) | Removed Jest and used Node's built-in `node:test` (the manual allows "Jest or a similar Node.js testing library") → 0 vulnerabilities |
| `npm test` failed with `MODULE_NOT_FOUND` | `node --test tests/` treats `tests/` as a file name | Quoted glob: `node --test "tests/**/*.test.js"` (Node expands it, so it also works on Windows) |
| "rejects a duplicate email with 409" got **201** | My `beforeEach` used `dropDatabase()`, which also drops the **unique index** on `email`; Mongoose only builds indexes once at startup | Empty each collection with `deleteMany({})` instead, and `await model.init()` for every model once before the tests |
| (avoided) Test process never exits | node-cache keeps an expiry timer running | `cache.close()` in `after()` |

## Post-lab work done
- [x] A second automated test covering a different endpoint (15 in total)
- [x] Supplementary: lint step before tests, in both jobs
- [ ] Status badge in the README — needs the GitHub repository URL; the line is in step 4 above
