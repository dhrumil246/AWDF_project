> **Note:** this plan was written on day one, when the project was the course's default *Task Manager*. The project then became the **Car Details Management System**: read "task" as "car" throughout (`/tasks` → `/cars`, `task-created` → `car-created`). The weekly scope and deliverables are unchanged.

# ITUE301 AWDF — 13-Week Build Roadmap

> **For agentic workers:** This is the master roadmap. Before executing a week, write that week's detailed TDD plan (`docs/superpowers/plans/<date>-week-NN.md`) from the section below, then use superpowers:executing-plans or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship every practical (W1–13) and assignment (A1–A7) of ITUE301 so that each one meets its Lab Manual deliverables *and* the website rubric, starting with a React portfolio and ending with a containerized MERN Task Manager that has CI and an AI feature.

**Architecture:** Two GitHub repos. `portfolio-<rollno>` covers W1–3 and stays frozen after that as the record for those weeks. `task-manager-api-<rollno>` becomes a monorepo: `backend/` is created in W4, and in W6 `frontend/` is pulled in from the portfolio with `git subtree` so its history comes along. The monorepo is needed because `docker-compose.yml` (W11) and `.github/workflows/` (W12) both have to sit at one repo root. The backend splits `app.js` (the Express app, exported) from `server.js` (connects to the DB, then listens) so that Jest + supertest can import the app in W12 without a server running.

**Tech Stack:** React 18 + Vite + React Router v6 · Node 22 + Express · MongoDB + Mongoose · bcryptjs + jsonwebtoken · node-cache · Node `events` · Docker + Compose · GitHub Actions + Jest + supertest + mongodb-memory-server · OpenAI or Gemini SDK

**Spec sources:** course site https://sagar2018.github.io/itue301-awdf/ and Lab Manual PDF (practicals 1–13). **Where they disagree, the Lab Manual wins** because it is the graded handout. Each conflict is listed below.

## Global Constraints

- Repos: `portfolio-<rollno>` (W1–3), `task-manager-api-<rollno>` (W4–13), `assignment-wN-<rollno>` (A1–A7). All public.
- Every week needs **at least one commit specifically for that week's feature**, and a README update.
- `.env` is never committed. Ship a `.env.example` from W5 onward. No secret may appear anywhere in git history (W13 checks this).
- Tag the commit that finishes each week: `git tag week-NN && git push --tags`. Graders can then check out any week's state.
- Node: the manual says v18+. Use 22 locally and in Docker/CI (18 is end-of-life).
- Marks per practical (Lab Manual): Conceptual 2 · Implementation 4 · Correctness 2 · Reflection 1 · Lab-file evidence 1 = 10, pass at 5. **4 of the 10 marks don't come from code.** They come from the lab journal (see below). The website's 20-mark topic rubric is used as the feature checklist.
- Assignments: 10 marks each, pass at 7. Each needs its named `.md` file.

### Spec conflicts and the choice made

| Topic | Website | Lab Manual | Choice |
|---|---|---|---|
| W1–3 app | Task app | Student **portfolio** | Portfolio |
| Task schema | title, description, status, priority, dueDate | title, description, completed, createdAt (+priority as post-lab) | Manual fields + `priority` enum + optional `dueDate` + `user` ref (W7). No `status`, because it duplicates `completed` |
| W11 compose | app + mongo + redis | frontend + backend + mongodb | Manual. Redis is skipped: W9 uses node-cache and W10 says a queue is out of scope |
| Practical marks | 20, topic rubric | 10, generic rubric | Satisfy both |
| Credits | 2 (home) / 4 (overview) | 2 (syllabus) | Irrelevant to the build |

## Lab journal (do this every week — 4 marks/week)

`docs/lab-journal/week-NN.md` (in the portfolio repo for W1–3, in the monorepo after that), plus screenshots in `docs/lab-journal/img/`:

```markdown
# Week NN — <title>
## Objective            (one line from the manual)
## What I built         (files touched, 3–6 bullets)
## Key questions        (answer each "Key Questions / Analysis" item in 2–4 sentences — this is your viva prep)
## Errors & fixes       (every real error hit: symptom → cause → fix. Reflection mark.)
## Evidence             (screenshots / measured numbers / log output)
## Post-lab work done   (checklist of the manual's "Student Assignment / Post Laboratory Work")
```

## Final repo layout (task-manager-api-<rollno>)

```
task-manager-api-<rollno>/
├── .github/workflows/ci.yml        W12
├── docker-compose.yml              W11
├── .gitignore                      node_modules, .env, dist, coverage
├── README.md                       run instructions, routes, evidence links, CI badge
├── docs/lab-journal/               W4–13 journals + img/
├── backend/
│   ├── app.js                      express app, middleware order, exports app       W4
│   ├── server.js                   dotenv → mongoose.connect → require listeners → listen   W4/W5/W10
│   ├── routes/tasks.js             CRUD + GET /:id                                   W4/W5
│   ├── routes/auth.js              /register /login /me                              W7
│   ├── routes/ai.js                POST /api/ai/generate-description                 W13
│   ├── middleware/logger.js        method url timestamp                              W4
│   ├── middleware/notFound.js      404 JSON                                          W4
│   ├── middleware/errorHandler.js  last in chain; maps ValidationError→400          W4/W5
│   ├── middleware/auth.js          Bearer JWT → req.user, 401 on fail               W7
│   ├── middleware/validateTask.js  rejects missing/empty title → 400                W7
│   ├── models/Task.js              W5 (+user ref W7)
│   ├── models/User.js              W7
│   ├── cache.js                    NodeCache({ stdTTL: 60 })                         W9
│   ├── events/taskEvents.js        class TaskEvents extends EventEmitter             W10
│   ├── events/listeners.js         task-created, task-deleted, error                 W10
│   ├── tests/tasks.test.js         W12
│   ├── Dockerfile  .dockerignore   W11
│   └── .env.example                PORT MONGO_URI JWT_SECRET OPENAI_API_KEY
└── frontend/                       (subtree of portfolio at W6)
    ├── src/api.js                  BASE_URL from VITE_API_URL, auth header, 401 handling   W6/W7
    ├── src/context/AuthContext.jsx token + login/logout                              W7
    ├── src/components/             Header About Skills Footer NavBar Spinner ErrorMessage TaskForm TaskItem
    ├── src/pages/                  Home Tasks Contact Login NotFound
    ├── nginx.conf  Dockerfile  .dockerignore                                         W11
    └── .env.example                VITE_API_URL=http://localhost:5000
```

## API contract (final state)

| Method | Path | Auth | Success | Errors |
|---|---|---|---|---|
| POST | /auth/register | – | 201 `{id,email}` | 400 missing fields, 409 email taken |
| POST | /auth/login | – | 200 `{token}` (1h expiry) | 401 bad credentials |
| GET | /auth/me | JWT | 200 `{id,email}` | 401 |
| GET | /tasks | JWT | 200 `[Task]` (own tasks only, cached) | 401 |
| GET | /tasks/:id | JWT | 200 Task | 400 bad id, 404 |
| POST | /tasks | JWT | 201 Task, emits `task-created` | 400 validation |
| PUT | /tasks/:id | JWT | 200 Task | 400, 404 |
| DELETE | /tasks/:id | JWT | 200 `{message}` (or 204), emits `task-deleted` | 404 |
| POST | /api/ai/generate-description | JWT | 200 `{description, fallback:false}` | on any AI failure: 200 `{description:'', fallback:true}` |
| * | anything else | – | – | 404 `{error:'Not found'}` |

Error body shape everywhere: `{ "error": "<message>", "details"?: {...} }`. Never send a stack trace.

---

## Phase 1 — Frontend (repo `portfolio-<rollno>`)

### Week 1 — React + Vite, components (CO1)
- [ ] `npm create vite@latest student-portfolio -- --template react`, `git init`, push as `portfolio-<rollno>`
- [ ] `src/components/Header.jsx About.jsx Skills.jsx Footer.jsx`, all composed in `App.jsx`
- [ ] Props: `name` → Header, `skillList` array → Skills (rendered with `.map`, `key`). That's 2+ components using props
- [ ] Supplementary (cheap, do them): NavBar, `themeColor` prop on Header as an inline style
- [ ] Post-lab: `Projects.jsx` with 3 hard-coded projects
- [ ] Clean `.gitignore`, README, journal, `git tag week-01`

**Done when:** `npm run dev` shows all components and the console has no errors or warnings (no missing `key`).

### Week 2 — useState + React Router v6 (CO1)
- [ ] `npm i react-router-dom`. `BrowserRouter` goes in `main.jsx` **only**
- [ ] `src/pages/Home.jsx Projects.jsx Contact.jsx`. Routes `/`, `/projects`, `/contact`. NavBar uses `<Link>`, never `<a>`
- [ ] Contact: controlled `message` input showing live text and a live character count
- [ ] Second useState: help-tooltip toggle
- [ ] Post-lab: `path="*"` → `NotFound.jsx`. Dark/light toggle that adds a class on the root
- [ ] Website rubric asks for useEffect: add one with cleanup (e.g. the tooltip auto-hides after 3s with `clearTimeout` in the cleanup)
- [ ] Commit "week 2: add react-router routes", README lists the routes, journal, tag

**Done when:** clicking the nav causes no full reload (the Network tab shows no document request) and unknown paths show the 404 page.

### Week 3 — API integration with loading/error (CO1)
- [ ] `Projects.jsx`: states `repos, loading, error`. Fetch `https://api.github.com/users/<you>/repos` in `useEffect(..., [])`
- [ ] Use `AbortController` in the cleanup (the website's "common mistake": setState after unmount)
- [ ] `Spinner.jsx`, `ErrorMessage.jsx`. Render name + `html_url` (+ stars, supplementary)
- [ ] Post-lab: Retry button (refetch via a `reloadKey` state in the deps) and a search filter input
- [ ] Evidence: screenshots of the loading state (Slow 3G), the error state (broken URL) and the data state
- [ ] README notes the API used, journal, tag

**Done when:** all three states are reachable and shown in screenshots.

---

## Phase 2 — Backend (repo `task-manager-api-<rollno>`)

### Week 4 — Express REST API, in-memory (CO2) · Assignment 1
- [ ] Repo root `.gitignore`. Work inside `backend/`: `npm init -y`, `npm i express`, `npm i -D nodemon`
- [ ] `app.js` builds the app and does **not** listen. Middleware order: `express.json()` → `logger` → `/tasks` router → `notFound` → `errorHandler` (last)
- [ ] `server.js`: `app.listen(process.env.PORT || 5000)`
- [ ] In-memory array CRUD: GET 200, POST 201, PUT 200/404, DELETE 200/404, and 500 via the error handler (show it once with a deliberately thrown error)
- [ ] Post-lab: reject POST/PUT without `Content-Type: application/json` (415), 404 JSON for unknown routes, ID-format middleware
- [ ] Postman collection exported to `docs/postman/` with screenshots of each status code
- [ ] **A1 (MATURITY.md):** see Assignments

```js
// backend/app.js — the shape every later week extends
const express = require('express');
const app = express();
app.use(express.json());
app.use(require('./middleware/logger'));
app.use('/tasks', require('./routes/tasks'));
app.use(require('./middleware/notFound'));
app.use(require('./middleware/errorHandler'));
module.exports = app;
```

### Week 5 — MongoDB + Mongoose (CO2, CO3)
- [ ] `npm i mongoose dotenv`. Atlas free tier (or local). `MONGO_URI` in `.env`, and a `.env.example` committed
- [ ] `models/Task.js`: `title` String required trim · `description` String · `completed` Boolean default false · `priority` enum `['low','medium','high']` default `'medium'` · `dueDate` Date · `createdAt` default `Date.now`
- [ ] Post-lab/supp: `pre('save')` title trim (redundant with `trim:true`, but write it — it's graded)
- [ ] Routes become async with try/catch → `next(err)`. `findByIdAndUpdate(id, body, { new: true, runValidators: true })`
- [ ] `errorHandler` maps `ValidationError` → 400 `{error, details: {field: msg}}` and `CastError` → 400 "invalid id". Everything else → 500 generic
- [ ] `GET /tasks/:id` → 404 JSON when not found
- [ ] Evidence: Compass/Atlas screenshot, data still there after a server restart, validation-error response

### Week 6 — Full-stack integration (CO1, CO2)
- [ ] Turn the repo into a monorepo: `git subtree add --prefix=frontend <portfolio-repo-url> main` (keeps the portfolio history)
- [ ] Backend: `npm i cors`, `app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))` before the routes
- [ ] `frontend/src/api.js` is the single place for `BASE_URL = import.meta.env.VITE_API_URL` plus `getTasks/createTask/updateTask/deleteTask`. Each one throws on `!res.ok`
- [ ] `Projects.jsx` → `Tasks.jsx` at route `/tasks` (manual: replace the GitHub data with your own). `TaskForm` (POST), `TaskItem` (toggle completed = PUT, delete = DELETE)
- [ ] Update the UI **from the server response**, not optimistically (manual's core concept). Loading/error states for every call, not just the first fetch
- [ ] Post-lab: delete confirm (`window.confirm` is enough) and a toast after each operation
- [ ] README: how to run both servers (two terminals)
- [ ] Evidence: create → edit → delete → refresh, data persists

### Week 7 — Auth + validation pipeline (CO2, CO6) · Assignment 2
- [ ] `npm i bcryptjs jsonwebtoken`. `models/User.js` (`email` unique lowercase required, `password` required)
- [ ] `routes/auth.js`: register (hash with cost 10, 201, never return the password), login (`bcrypt.compare`, sign `{id, email}` with `JWT_SECRET`, `expiresIn:'1h'`), `/me`
- [ ] `middleware/auth.js`: missing/invalid/expired token → 401 (wrap `jwt.verify` in try/catch)
- [ ] `middleware/validateTask.js` on POST/PUT: missing or blank title → 400 before the DB is touched
- [ ] Task gets `user: { type: ObjectId, ref: 'User', required: true }`. **Every query is scoped to `req.user.id`**. Another user's id → 404, not 403 (doesn't reveal that it exists)
- [ ] Frontend: `Login.jsx` (login + register toggle), `AuthContext` keeps the token (localStorage). `api.js` adds `Authorization: Bearer`, and a 401 → logout + redirect `/login`. Protected `/tasks`. Logout button
- [ ] Evidence: Postman register → login → token → protected call. 401 with no/tampered token
- [ ] **A2 (SECURITY.md):** see Assignments

---

## Phase 3 — Optimization

### Week 8 — Lazy loading (CO1)
- [ ] **Before touching code:** `npm run build` output + Network tab (JS transferred, load time) screenshots → `docs/lab-journal/img/w08-before-*`
- [ ] `lazy(() => import('./pages/Tasks'))`, also Contact. One `<Suspense fallback={<Spinner/>}>` around `<Routes>` only. Pages must be default exports
- [ ] Rebuild: separate chunks in the build output. Slow 3G: the fallback is visible
- [ ] Post-lab: lazy-load one more heavy component. React DevTools Profiler → document one unnecessary re-render (and fix it with `memo`/`useCallback`)
- [ ] Before/after table in the README

### Week 9 — node-cache (CO2, CO4) · Assignment 3
- [ ] **Record 3 uncached Postman timings first** (seed ~500 tasks with a small script so the difference is visible)
- [ ] `cache.js` exports `new NodeCache({ stdTTL: 60 })`
- [ ] ⚠️ The manual's key `'all_tasks'` **would leak user A's tasks to user B** now that W7 scopes tasks per user. Use a per-user key:

```js
const key = `tasks:${req.user.id}`;
const hit = cache.get(key);
if (hit) return res.json(hit);
const tasks = await Task.find({ user: req.user.id });
cache.set(key, tasks);
res.json(tasks);
// in POST/PUT/DELETE after a successful write:
cache.del(`tasks:${req.user.id}`);
```
- [ ] Post-lab: cache `GET /tasks/:id` separately (`task:${id}`, delete it on PUT/DELETE). `GET /debug/cache` → `cache.getStats()` (hits/misses)
- [ ] README: 3 vs 3 timing table + a note that the cache is process-local, so it doesn't work across instances
- [ ] **A3 (LOADTEST.md):** see Assignments

### Week 10 — EventEmitter async processing (CO4) · Assignment 4
- [ ] `events/taskEvents.js` (singleton `TaskEvents extends EventEmitter`). `events/listeners.js` is required once in `server.js`
- [ ] POST: `res.status(201).json(task)` then `taskEvents.emit('task-created', { task, user: req.user.email })`. Log `[API] response sent <iso>`
- [ ] Listener: `setTimeout(2000)` delay then `[Notification] "<title>" for <email> at <iso>`. The log order is the proof
- [ ] Post-lab: `task-deleted` listener. Wrap the listener body in try/catch → `taskEvents.emit('task-error', err)` with its own listener (avoid the bare `'error'` name crashing the process)
- [ ] Evidence: terminal screenshot showing the response timestamp before the notification timestamp, and the Postman time staying fast
- [ ] **A4 (ARCHITECTURE.md):** see Assignments

---

## Phase 4 — DevOps / AI

### Week 11 — Docker + Compose (CO5) · Assignment 5
- [ ] `backend/Dockerfile`: `node:22-alpine`, `npm ci --omit=dev`, `CMD ["node","server.js"]`. `.dockerignore`: `node_modules .env`
- [ ] `frontend/Dockerfile`, multi-stage: `node:22-alpine` builds with `ARG VITE_API_URL`, then `nginx:alpine` serves `dist`. `nginx.conf` has `try_files $uri /index.html;` so React Router deep links work. Smaller image, which helps A5's "image size" mark
- [ ] ⚠️ `VITE_API_URL` must be `http://localhost:5000`, **not** `http://backend:5000`. The browser runs on your host and can't resolve Compose service names. Only backend → mongo uses the service name
- [ ] `docker-compose.yml`: services `frontend` (5173:80), `backend` (5000:5000, `env_file: ./backend/.env`, `MONGO_URI=mongodb://mongodb:27017/taskdb` override, `depends_on: mongodb`), `mongodb` (`mongo:7`, named volume `mongo-data`). Network `app-network`
- [ ] Verify: `docker compose up --build` from clean, `docker ps` shows 3 containers, full flow works, data survives `down`/`up`
- [ ] README: run with one command. Image sizes from `docker images`
- [ ] **A5 (CLOUD.md):** see Assignments

### Week 12 — CI with GitHub Actions (CO5) · Assignment 6
- [ ] `npm i -D jest supertest mongodb-memory-server`. `"test": "jest --runInBand"`
- [ ] `tests/tasks.test.js`, with `beforeAll` starting an in-memory Mongo and connecting, and `afterAll` disconnecting and calling `cache.close()` (otherwise node-cache's timer keeps Jest open). Tests:
  - [ ] `GET /tasks` without a token → 401
  - [ ] register + login → `GET /tasks` with the token → 200 `[]`
  - [ ] `POST /tasks` with `{}` → 400
  - [ ] `POST` valid → 201 then `GET` returns it
  - [ ] unknown route → 404
- [ ] `.github/workflows/ci.yml` at the **repo root**, `on: push: branches: [main]` (+ `pull_request`), `defaults.run.working-directory: backend`, `actions/setup-node@v4` node 22 with `cache: npm` + `cache-dependency-path: backend/package-lock.json`, `npm ci`, `npm test`. `JWT_SECRET` set in the workflow `env:` as a dummy test value (it signs only test tokens)
- [ ] Supplementary: a `lint` job (ESLint) that the test job `needs`. CI badge in the README
- [ ] Required demo: push a deliberately broken assertion → red X screenshot → fix → green screenshot
- [ ] **A6 (DEPLOYMENT.md):** see Assignments

### Week 13 — AI integration (CO6) · Assignment 7
- [ ] Use whichever key the institute provides (OpenAI `gpt-4o-mini` per the manual, or Gemini). `OPENAI_API_KEY` goes only in `backend/.env`
- [ ] `routes/ai.js` `POST /api/ai/generate-description` behind `auth`: validate `title`, call with a 10s timeout, return `{description, fallback:false}`. **Any** error (401/429/timeout) → 200 `{description:'', fallback:true}` plus a server-side log
- [ ] Send only the task title. Never user email or other PII (Responsible AI point for the viva)
- [ ] Frontend `TaskForm`: "✨ Generate description" button → loading state → fills the **editable** description textarea. Disclaimer "AI-generated — review before saving". On fallback: "AI unavailable, write it yourself" and the form keeps working
- [ ] Post-lab/supp: per-user rate limit, 1 request per 10s (in-memory `Map` of userId → last call, 429)
- [ ] Verify no key in history: `git log -p | grep -i "sk-"` → nothing
- [ ] Evidence: working suggestion + invalid-key fallback screenshots
- [ ] **A7 (AIDESIGN.md):** see Assignments

---

## Assignments (repos `assignment-wN-<rollno>`)

| # | Due | Deliverable | Code work (do it in the monorepo, then copy the relevant files into the assignment repo) |
|---|---|---|---|
| A1 | W4 | `MATURITY.md`: Richardson L0–L3 explained, current level with evidence, the changes made to reach L2 (resource URIs + correct verbs + correct status codes, incl. 201 + `Location` header), a HATEOAS sample response (`_links`) | Add a `Location` header on POST and a `_links` sample on `GET /tasks/:id` |
| A2 | W7 | `SECURITY.md`: STRIDE table (6 rows: threat → example in this app → mitigation), HTTPS steps, sanitization proof | `mkcert localhost` → `https.createServer` when `HTTPS=true`. `express-mongo-sanitize`, demo `{"email":{"$gt":""}}` login blocked |
| A3 | W9 | `LOADTEST.md`: commands, a table of RPS / mean latency / failed requests, cached vs uncached, analysis | `ab -n 1000 -c 50 -H "Authorization: Bearer <t>" http://localhost:5000/tasks`, cache on vs off |
| A4 | W10 | `ARCHITECTURE.md`: monolith diagram, 3+ services (auth, tasks, notifications/AI) diagram (Mermaid), trade-off table, decision, stateless note (JWT = stateless, node-cache = not) | none |
| A5 | W11 | `CLOUD.md`: IaaS/PaaS/Serverless compared, mapping this Compose stack to the nearest model, limits explained | `deploy.resources.limits` (`cpus: '0.50'`, `memory: 256M`) per service. `docker stats` screenshot |
| A6 | W12 | `DEPLOYMENT.md`: blue-green steps, the switch, rollback plan, how it compares to rolling updates | `backend-blue` (v1) + `backend-green` (v2, e.g. `/health` returns a version) in Compose. Switch by changing which one maps to host 5000 (or an nginx upstream). Show zero-downtime with curl |
| A7 | W13 | `AIDESIGN.md`: prompts used, raw AI suggestions, what was implemented, critique (accessibility/contrast, bias, privacy) | Implement 1+ AI-suggested change via CSS custom properties (theme tokens) |

**Open question for faculty:** do the assignment repos come from GitHub Classroom templates with their own auto-grader layout? If yes, follow the template's structure over this table.

---

## Viva cheat-sheet (questions most likely to come up)
- Why `Link` over `<a>` · why `[]` in useEffect · why the error handler is last · why bcrypt over SHA · what `jwt.verify` checks · why validate on the server too · why invalidate the cache on writes · why node-cache fails with multiple instances · why `emit` doesn't block · EXPOSE vs `ports` · service name vs localhost · CI vs CD · why the AI key stays on the backend · what never goes to an AI API

All the answers live in the weekly journals, under "Key questions".
