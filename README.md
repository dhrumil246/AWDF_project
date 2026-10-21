# Car Details Management System

Full stack car inventory app built week by week for **ITUE301 – Advanced Web Development Frameworks**.

## Structure

```
car-details-management-system/
├── .github/workflows/ci.yml  lint → test → build → Docker images
├── docker-compose.yml frontend + backend + mongodb
├── deploy/blue-green/ blue-green deployment (two backends + nginx switch)
├── frontend/          React (Vite), Dockerfile, nginx.conf
├── backend/           Node.js + Express REST API, Dockerfile
├── assignments/       assignment write-ups (MATURITY.md, …) and their evidence
└── docs/
    ├── lab-journal/   weekly notes, key-question answers, screenshots
    ├── evidence/      recorded API responses and server logs
    └── postman/       Postman collection for the API
```

## AI descriptions (Week 13)

On the Add / Edit car form, **✨ Generate with AI** asks the backend for a short listing description, which appears in the editable description field with an "AI-generated — review before saving" note.

- `POST /api/ai/generate-description` (JWT required) → `backend/services/ai.js` calls the **Gemini API** with Node's built-in `fetch`. Model: `GEMINI_MODEL` (default `gemini-flash-latest`).
- The key lives only in `GEMINI_API_KEY` on the server (`backend/.env`, or the root `.env` for Docker) and is sent in the `x-goog-api-key` header. The frontend never sees it.
- Only make, model, year, fuel type and transmission are sent — no user name/email, no registration number.
- **Graceful degradation:** no key, invalid key, timeout (`AI_TIMEOUT_MS`, 10 s) or any Gemini error returns `200 { fallback: true }`; the form shows "AI suggestion is unavailable" and saving still works.
- Rate limit: one request per user every `AI_RATE_LIMIT_MS` (10 s), otherwise `429` with `Retry-After`.

If the default model is overloaded (Gemini answers 503 "high demand", which the app turns into the fallback), set `GEMINI_MODEL=gemini-3.5-flash-lite`.

Get a key at https://aistudio.google.com/apikey and add `GEMINI_API_KEY=...` to `backend/.env` (or the root `.env` when using Docker), then restart the backend.

## Tests and CI (Week 12)

```bash
cd backend
npm test        # 31 API tests: Node's built-in test runner + supertest + in-memory MongoDB (Gemini is faked)
npm run lint    # oxlint
```

`.github/workflows/ci.yml` runs on every push and pull request to `main`, every Monday on a schedule, and on demand:

1. **Backend** — `npm ci` → lint → tests (`JWT_SECRET` from the repository secret)
2. **Frontend** — `npm ci` → lint → production build
3. **Docker** — builds both images, only if 1 and 2 passed

## Run everything with Docker (recommended)

Needs Docker Desktop. One command builds both images and starts MongoDB, the API and the frontend:

```bash
cp .env.example .env          # set JWT_SECRET
docker compose up --build -d
docker compose exec backend npm run seed   # optional: demo user + 6 sample cars
```

| Service | Image | URL |
|---|---|---|
| `frontend` | nginx serving the Vite build (multi-stage, 102 MB) | http://localhost:5173 |
| `backend` | Node 22 Alpine, production deps only (266 MB) | http://localhost:5001 |
| `mongodb` | `mongo:7`, data in the `mongo-data` volume | internal only |

Each service has CPU and memory limits (`deploy.resources` — backend 0.5 CPU / 256 MiB, MongoDB 1 CPU / 512 MiB, frontend 0.25 CPU / 64 MiB); see [`assignments/CLOUD.md`](assignments/CLOUD.md).

`docker compose down` stops everything but keeps the data; `docker compose down -v` also deletes the database volume.

## Run the full stack locally (without Docker)

Two terminals — the backend must be running for the frontend to load cars.

**Terminal 1 — backend**

```bash
cd backend
cp .env.example .env   # set MONGO_URI (MongoDB Atlas), JWT_SECRET; CLIENT_URL=http://localhost:5173
npm install
npm run seed           # optional: demo user + 6 sample cars (wipes users and cars); npm run seed -- 500 adds 500 more
npm run dev
```

**Terminal 2 — frontend**

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:5001
npm install
npm run dev
```

Open http://localhost:5173 and log in. After `npm run seed` there is a demo account (test data only): **demo@cars.test / demo12345**, or create your own with "Create an account".

## Backend

The API runs on the `PORT` from `.env` (5001 locally — on macOS port 5000 is taken by AirPlay Receiver; the code defaults to 5000). The server refuses to start if `MONGO_URI` or `JWT_SECRET` is missing. Set `HTTPS_KEY_FILE` and `HTTPS_CERT_FILE` (e.g. a mkcert certificate) to serve HTTPS — see [`assignments/SECURITY.md`](assignments/SECURITY.md).

### Authentication

- `POST /auth/register` and `POST /auth/login` return `{ token, user }`. Passwords are hashed with bcrypt (10 salt rounds) and never returned.
- The token is a JWT signed with `JWT_SECRET`, valid for `JWT_EXPIRES_IN` (default 1h). Send it as `Authorization: Bearer <token>`.
- **All `/cars` routes require a token.** Any logged-in user can read every car; only the user who listed a car (`owner`) can update or delete it.

### Car schema (`backend/models/Car.js`)

| Field | Type | Rules |
|---|---|---|
| `make`, `model` | String | required, trimmed |
| `year` | Number | required, 1950 – next year |
| `price` | Number | required, ≥ 0 |
| `fuelType` | String | `Petrol` \| `Diesel` \| `CNG` \| `Electric` \| `Hybrid`, default `Petrol` |
| `transmission` | String | `Manual` \| `Automatic`, default `Manual` |
| `status` | String | `available` \| `sold`, default `available` |
| `registrationNumber` | String | optional, unique, stored without spaces in upper case |
| `description` | String | optional, max 500 chars |
| `createdAt`, `updatedAt` | Date | automatic (`timestamps: true`) |

### Endpoints

| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/health` | 200 `{ status, version, color, uptimeSeconds }` | 503 if the database is down |
| POST | `/auth/register` | 201 `{ token, user }` | 400 validation, 409 email exists |
| POST | `/auth/login` | 200 `{ token, user }` | 400 validation, 401 invalid email or password |
| GET | `/auth/me` | 200 current user | 401 |
| GET | `/cars` | 200 list of cars (newest first) | – |
| GET | `/cars/:id` | 200 car | 400 invalid ObjectId, 404 not found |
| POST | `/cars` | 201 created car + `Location` header | 400 validation (per-field `details`) or bad JSON, 409 duplicate registration, 415 not JSON |
| PUT | `/cars/:id` | 200 replaced car — full representation (make, model, year, price required) | 400, 403 not owner, 404, 409, 415 |
| PATCH | `/cars/:id` | 200 updated car — only the fields sent change | 400, 403 not owner, 404, 409, 415 |
| DELETE | `/cars/:id` | 200 `{ message, car }` | 400, 403 not owner, 404 |
| POST | `/api/ai/generate-description` | 200 `{ description, fallback: false }`, or `{ description: '', fallback: true }` if the AI is unavailable | 400, 401, 429 |

Every `/cars` route also returns **401** without a valid token (missing, invalid, tampered or expired). An unsupported method on an existing URL returns **405** with an `Allow` header (e.g. `DELETE /cars` → `Allow: GET, POST`).

Single-car responses include **`_links`** (HATEOAS): `self` and `collection` for everyone, plus `update`, `replace`, `delete` and `markSold`/`markAvailable` for the owner. `GET /` lists the API's entry points. See [`assignments/MATURITY.md`](assignments/MATURITY.md).
| * | unknown route | – | 404 JSON |

Middleware pipeline: `cors` (origins from `CLIENT_URL`) → `express.json()` → `sanitize` (strips `$`/`.` keys against NoSQL injection) → `logger` (method, URL, timestamp) → routers → `notFound` → `errorHandler` (last; logs the stack server-side, returns a clean JSON error).

Per `/cars` request: `auth` (JWT → `req.user`) → `validateId` → `requireJson` → `validateCreateCar` / `validateUpdateCar` (400 before any database call) → controller (ownership check → 403).

Import `docs/postman/car-details-api.postman_collection.json` into Postman or Thunder Client to run every request.

## Tech

- React (Vite)
- React Router v7 in declarative mode — the same `BrowserRouter` / `Routes` / `Route` / `Link` API as v6. v6 has unpatched security advisories (GHSA-wrjc-x8rr-h8h6), fixed only in v7.18.4+.

## Routes

| Path | Page | Notes |
|---|---|---|
| `/login` | `Login` | Log in or create an account |
| `/` | `Home` | Inventory stats (total / available / sold) from the API |
| `/cars` | `Cars` | Cars from the API with Edit, Mark sold/available and Delete (with confirm) |
| `/cars/:id/edit` | `EditCar` | Same `CarForm`, pre-filled; saves with `PUT /cars/:id` |
| `/add` | `AddCar` | Controlled form with live preview; `POST /cars`, shows server validation errors, redirects to `/cars` |
| `/catalog` | `Catalog` | Car makes and models fetched live from the public [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/) (no key needed) |
| `*` | `NotFound` | 404 for unknown paths |

`/`, `/cars`, `/cars/:id/edit` and `/add` are wrapped in `ProtectedRoute`: logged-out users are sent to `/login` and back afterwards. Edit / Mark / Delete only show on cars you listed.

## Background events (Week 10)

`backend/events/carEvents.js` is a single `EventEmitter` (Node's built-in `events` module, no message queue). After `POST /cars` the controller sends the 201 response **first**, then emits `car-created`; `DELETE /cars/:id` emits `car-deleted`. Listeners in `backend/events/listeners.js` (registered once in `server.js`) log a notification after a simulated `NOTIFY_DELAY_MS` (default 2000 ms). An `error` listener catches failures inside async listeners (`captureRejections: true`), so a broken notification never crashes the API.

```bash
npm run check:events   # asserts emit() is non-blocking and listener errors are caught
```

Recorded run: the client got its 201 in 9.8 ms; the notification finished 2 s later ([`docs/evidence/w10-event-timestamps.txt`](docs/evidence/w10-event-timestamps.txt)).

## Caching (Week 9)

`GET /cars` and `GET /cars/:id` are cached in memory with `node-cache` (`backend/cache.js`, TTL 60 s). Every successful POST / PUT / DELETE deletes the affected keys, so the next read always comes from MongoDB. The `X-Cache` response header shows `HIT`, `MISS`, or `BYPASS` (when `DISABLE_CACHE=true`). `GET /debug/cache` shows hit/miss counts (non-production only).

| `GET /cars`, 506 cars | Mean of 10 readings |
|---|---|
| Uncached | 13.1 ms |
| Cached | 2.5 ms (5.3× faster) |

The cache lives in the Node process's memory: it is empty after a restart and is not shared between multiple server instances. See [`docs/lab-journal/week-09.md`](docs/lab-journal/week-09.md).

## Performance (Week 8)

Routes are code-split with `React.lazy()` + one `<Suspense>` around `<Routes>`: `Cars`, `AddCar`, `EditCar`, `Catalog`, `Login` and `NotFound` are separate chunks downloaded on first visit, and `ModelList` loads only after a make is picked. `CarCard` is wrapped in `memo`.

| | Before | After |
|---|---|---|
| JS chunks | 1 (277.10 kB, 87.33 kB gzip) | main 267.32 kB (85.03 kB gzip) + 9 small on-demand chunks |
| JS downloaded to open `/` | 86,437 B | 84,158 B |

Details: [`docs/lab-journal/week-08.md`](docs/lab-journal/week-08.md).

## Frontend ↔ backend

`frontend/src/api/client.js` is the only file that knows the backend URL (`VITE_API_URL`). It adds `Authorization: Bearer <token>` to every request and throws an `Error` carrying the API's message and per-field `details` on any non-2xx response. A 401 logs the user out (session expired). `api/cars.js` and `api/auth.js` build on it.

`context/AuthContext.jsx` holds the token and user (persisted in `localStorage`), checks a stored token with `GET /auth/me` on load, and exposes `login`, `register`, `logout`.

`App.jsx` loads cars once on mount (loading / error / Retry) and, after every write, updates state **from the server's response** — never optimistically.

## External API

`frontend/src/api/nhtsa.js` wraps two NHTSA endpoints and throws on non-2xx responses:

- `GET /GetMakesForVehicleType/car?format=json` → car makes
- `GET /GetModelsForMake/{make}?format=json` → models for one make

## Component structure

```
main.jsx (BrowserRouter → AuthProvider)
└── App.jsx              cars, loading, error, notice state; CRUD handlers → api/cars.js
    ├── Header.jsx       title, subtitle (props)
    ├── NavBar.jsx       links (props), NavLink
    ├── Notice.jsx       success / error toast, auto-dismiss (useEffect + cleanup)
    ├── <Routes>
    │   ├── pages/Home.jsx
    │   ├── pages/Cars.jsx      → CarList.jsx → CarCard.jsx (showDetails, busy state; Edit / Mark / Delete)
    │   ├── pages/AddCar.jsx    → CarForm.jsx (form, submitting, serverError state) → CarCard preview
    │   ├── pages/EditCar.jsx   → CarForm.jsx pre-filled from the car
    │   ├── pages/Catalog.jsx   makes fetch (loading/error/data) + search → ModelList.jsx
    │   └── pages/NotFound.jsx
    └── Footer.jsx       appName (props)
```

Car data lives in `frontend/src/data/cars.js`; components never hardcode content.

## Assignments

| # | Week | Topic | File | Status |
|---|---|---|---|---|
| A1 | 4 | Richardson Maturity Model | [`assignments/MATURITY.md`](assignments/MATURITY.md) | ✅ |
| A2 | 7 | STRIDE, HTTPS/TLS, secure coding | [`assignments/SECURITY.md`](assignments/SECURITY.md) | ✅ |
| A3 | 9 | Load testing with Apache Bench | [`assignments/LOADTEST.md`](assignments/LOADTEST.md) | ✅ |
| A4 | 10 | Monolith vs microservices | [`assignments/ARCHITECTURE.md`](assignments/ARCHITECTURE.md) | ✅ |
| A5 | 11 | Cloud service models, Docker resource limits | [`assignments/CLOUD.md`](assignments/CLOUD.md) | ✅ |
| A6 | 12 | Blue-green deployment | [`assignments/DEPLOYMENT.md`](assignments/DEPLOYMENT.md) | ✅ |
| A7 | 13 | AI-assisted UI design (Gemini) | [`assignments/AIDESIGN.md`](assignments/AIDESIGN.md) | ✅ |

## Progress

| Week | Topic | Status |
|---|---|---|
| 1 | React + Vite, component architecture | ✅ |
| 2 | useState, React Router, controlled forms | ✅ |
| 3 | API integration with loading / error states | ✅ |
| 4 | Express REST API, middleware pipeline | ✅ |
| 5 | MongoDB + Mongoose schema and validation | ✅ |
| 6 | Full stack integration (React ↔ Express ↔ MongoDB) | ✅ |
| 7 | JWT authentication, validation middleware | ✅ |
| 8 | Lazy loading, code splitting, re-render fix | ✅ |
| 9 | In-memory caching with node-cache | ✅ |
| 10 | Event-driven background processing (EventEmitter) | ✅ |
| 11 | Docker + Docker Compose | ✅ |
| 12 | Automated tests + GitHub Actions CI | ✅ |
| 13 | AI integration (Gemini) with graceful degradation | ✅ |
