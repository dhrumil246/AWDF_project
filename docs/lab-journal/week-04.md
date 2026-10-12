# Week 4 — Building a RESTful API with Node.js and Express

## Objective
Design and implement a RESTful backend with full CRUD endpoints for the Car resource, using an Express middleware pipeline (in-memory storage, no database yet).

## What I built
- `backend/` Node project with Express 5 and `dotenv` (`PORT` comes from `.env`; `.env` is git-ignored and `.env.example` is committed).
- `app.js` builds and exports the app; `server.js` loads `.env` and calls `listen`. Keeping them separate means tests (Week 12) can import the app without starting a server.
- `routes/cars.js` maps URLs to handlers in `controllers/carsController.js`: `getAllCars`, `getCarById`, `createCar`, `updateCar`, `deleteCar`, working on an in-memory array in `data/cars.js`.
- Middleware pipeline, in order: `express.json()` → `logger` → `/cars` router → `notFound` → `errorHandler`.
- Status codes: 200 (read/update/delete), 201 + `Location` header (create), 400 (bad id / missing fields / malformed JSON), 404 (missing car or route), 415 (not JSON), 500 (unexpected error).
- Post-lab: `requireJson` (rejects POST/PUT without `Content-Type: application/json` → 415), `validateId` (route-specific, rejects non-numeric ids → 400), JSON 404 handler for unknown routes.
- `createCar`/`updateCar` copy only known fields (`make`, `model`, `year`, `fuelType`, `transmission`, `price`, `status`), so a client cannot overwrite `id`.
- Postman collection: `docs/postman/car-details-api.postman_collection.json` (CRUD + every error case).

## Key questions
**Why must the error-handling middleware be defined last?**
Express runs middleware in registration order. An error handler (recognised by its 4 arguments `err, req, res, next`) only receives errors from middleware and routes registered before it. If it were registered first, routes defined after it would throw into Express's default handler, which sends an HTML stack trace.

**What is the difference between `app.use()` and route-specific middleware?**
`app.use(logger)` runs for every request on every path. Route-specific middleware is listed in one route definition, e.g. `router.put('/:id', validateId, requireJson, updateCar)`, so it only runs for that method + path. `validateId` makes no sense for `GET /cars`, so it is attached only to routes that have `:id`.

**Why is it bad practice to send raw stack traces to the client?**
A stack trace exposes file paths, library versions and internal logic that help an attacker, and it is useless to a normal client. The error handler logs `err.stack` on the server (see the server log) and sends only `{ "error": "Something went wrong" }`.

**Why `next()`?**
Each middleware must either end the response (`res.json(...)`) or call `next()`. If it does neither, the request hangs until the client times out. `logger` calls `next()`; `validateId` either responds 400 or calls `next()`.

## Errors & fixes
| Symptom | Cause | Fix |
|---|---|---|
| Every request returned **403 Forbidden** with an empty body, and my logger printed nothing | On macOS, **AirPlay Receiver** (ControlCenter, `Server: AirTunes`) already listens on port 5000, so curl hit it instead of Express. Found with `lsof -nP -iTCP:5000 -sTCP:LISTEN` | Set `PORT=5001` in `.env`. The code still defaults to 5000 for other machines and Docker |
| (handled) Malformed JSON body would return Express's default error | `express.json()` throws a `SyntaxError` with `type: 'entity.parse.failed'` | `errorHandler` maps it to 400 `{"error":"Request body is not valid JSON"}` |

## Evidence
- Every endpoint and status code, recorded with curl: [`docs/evidence/w04-api-responses.txt`](../evidence/w04-api-responses.txt)
- Request logger output and server-side stack traces: [`docs/evidence/w04-server-log.txt`](../evidence/w04-server-log.txt)

Summary of the recorded run:

| Request | Status |
|---|---|
| `GET /cars` | 200 |
| `GET /cars/2` | 200 |
| `POST /cars` (Kia Seltos) | 201, `Location: /cars/4` |
| `PUT /cars/4` | 200 |
| `DELETE /cars/4` | 200 |
| `GET /cars/4` after delete | 404 |
| `GET /cars/abc` | 400 |
| `POST /cars` with only `make` | 400 |
| `POST /cars` form-encoded | 415 |
| `POST /cars` malformed JSON | 400 |
| `GET /unknown` | 404 |
| `GET /debug/error` (deliberate throw) | 500 |

## Post-lab work done
- [x] Middleware rejecting POST/PUT without `Content-Type: application/json`
- [x] Custom JSON 404 handler for undefined routes
- [x] Supplementary: route-specific middleware validating the id format
