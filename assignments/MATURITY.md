# Assignment 1 — Richardson Maturity Model: Evaluating the Car Details API

**Course:** ITUE301 Advanced Web Development Frameworks · **CO2** · Week 4
**API evaluated:** the Car Details Management System backend (`backend/`), as it stood after Practical 13.
**Evidence:** [`evidence/a1-before.txt`](evidence/a1-before.txt) (recorded before any change) and [`evidence/a1-after.txt`](evidence/a1-after.txt) (after). Automated checks: `backend/tests/api.test.js`, suite *"REST maturity (Assignment 1)"*.

---

## 1. The Richardson Maturity Model

Leonard Richardson's model grades how fully an HTTP API uses the web's own ideas, in four steps. Each level builds on the one below.

| Level | Name | What it means | Typical sign |
|---|---|---|---|
| **0** | The swamp of POX | HTTP is only a transport. One endpoint, one method; the action is inside the body. | `POST /api` with `{ "action": "getCar", "id": 7 }` |
| **1** | Resources | Each thing gets its own URL, but the method still does not carry meaning. | `POST /cars/7/delete`, `GET /deleteCar?id=7` |
| **2** | HTTP verbs | Resources **and** standard methods with their real meaning (GET is safe, PUT/DELETE are idempotent) **and** correct status codes. | `DELETE /cars/7` → `200`, missing → `404`, wrong method → `405` |
| **3** | Hypermedia controls (HATEOAS) | Responses contain links telling the client what it can do next, so it follows links instead of building URLs itself. | `"_links": { "delete": { "href": "/cars/7", "method": "DELETE" } }` |

Level 2 is what most people mean by "a REST API". Level 3 is what Roy Fielding (who defined REST) considers necessary for an API to really be RESTful.

---

## 2. Evaluation of the API before the changes

### Level 0 → 1: Resources ✅
The API is organised around nouns, each with its own URL:

| Resource | URL |
|---|---|
| Car collection | `/cars` |
| One car | `/cars/:id` |
| Current user | `/auth/me` |

There is no single "do everything" endpoint, and there are no verbs in the car URLs.

### Level 1 → 2: HTTP verbs and status codes — ✅ mostly, with three gaps
**What was already correct:**

| Request | Meaning | Status codes used |
|---|---|---|
| `GET /cars` | list (safe, cacheable — cached for 60 s since Week 9) | 200, 401 |
| `GET /cars/:id` | read one | 200, 400 bad id, 401, 404 |
| `POST /cars` | create | **201 Created + `Location: /cars/<id>`**, 400, 401, 409, 415 |
| `PUT /cars/:id` | update | 200, 400, 401, 403, 404, 409, 415 |
| `DELETE /cars/:id` | delete | 200, 401, 403, 404 |

Errors were consistent JSON (`{ "error", "details"? }`), and 401 ("who are you?") and 403 ("you may not") were used correctly.

**Gaps found** (from [`evidence/a1-before.txt`](evidence/a1-before.txt)):

| # | Request | Before | Why it is wrong at Level 2 |
|---|---|---|---|
| 1 | `DELETE /cars`, `PUT /cars`, `POST /cars/:id` | **404** "Route … not found" | The URL *does* exist; only the method is unsupported. HTTP has **405 Method Not Allowed**, which must include an `Allow` header listing the valid methods. A 404 wrongly tells the client the resource is missing. |
| 2 | `PATCH /cars/:id` | **404** | There was no partial-update method. |
| 3 | `PUT /cars/:id` with `{ "status": "sold" }` | **200**, changed only `status` | PUT means "replace the resource with this representation". The frontend's status toggle was sending a *partial* PUT — that is PATCH semantics. |

### Level 3: Hypermedia ❌
No response contained links. A client had to know in advance that a car lives at `/cars/<id>`, and that only its owner may delete it (it learned that only by receiving a 403).

**Verdict before: Level 2, with three Level-2 gaps and no Level-3 hypermedia.**

---

## 3. Changes made

### Fix 1 — `405 Method Not Allowed` + `Allow` header (`backend/middleware/methodNotAllowed.js`)
After the real routes, every known URL gets a catch-all for other methods:

```js
router.all('/', methodNotAllowed(['GET', 'POST']));
router.all('/:id', methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE']));
```

The same applies to `/auth/register`, `/auth/login`, `/auth/me` and `/api/ai/generate-description`. Truly unknown URLs still get 404.

### Fix 2 — PATCH vs PUT (`backend/routes/cars.js`)
- **`PATCH /cars/:id`** — partial update; only the fields sent change (validated with the update rules).
- **`PUT /cars/:id`** — full representation; `make`, `model`, `year` and `price` are now required (validated with the create rules), so a partial PUT gets 400.
- Frontend: "Mark sold/available" now sends `PATCH { status }`; the edit form, which sends every field, keeps using `PUT`.

### Fix 3 — Hypermedia (`backend/links.js`)
Single-car responses (`GET /cars/:id`, `POST /cars`, `PUT`/`PATCH /cars/:id`) include `_links`. The links depend on **who** is asking and on the car's **state**:

- Everyone: `self`, `collection`.
- Only the owner: `update` (PATCH), `replace` (PUT), `delete`.
- Only the owner, and only one of: `markSold` if the car is available, `markAvailable` if it is sold — with the exact body to send.

`GET /` became an entry point listing all top-level links (`register`, `login`, `me`, `cars`, `createCar`, `generateDescription`).

Links are added per request (`withLinks(car, req.user)`) and never stored in the cache, because they differ per user while the cached car does not.

---

## 4. Results after the changes

From [`evidence/a1-after.txt`](evidence/a1-after.txt):

| Request | Before | After |
|---|---|---|
| `DELETE /cars` | 404 | **405**, `Allow: GET, POST` |
| `PUT /cars` | 404 | **405**, `Allow: GET, POST` |
| `POST /cars/:id` | 404 | **405**, `Allow: GET, PUT, PATCH, DELETE` |
| `GET /auth/login` | 404 | **405**, `Allow: POST` |
| `PATCH /cars/:id { "price": 1300000 }` | 404 | **200**, only `price` changed |
| `PUT /cars/:id { "price": 1 }` | 200 (partial) | **400** — full representation required |
| `GET /cars/:id` | car only | car + `_links` |
| `GET /` | message only | message + entry-point `_links` |

### Sample HATEOAS response — `GET /cars/:id` as the car's owner
```json
{
  "id": "6ad778647e17e21a163515d8",
  "make": "Kia",
  "model": "Seltos",
  "year": 2026,
  "price": 1350000,
  "status": "available",
  "owner": { "id": "6ad73487475bce46bcd5f3e2", "name": "Demo Dealer" },
  "_links": {
    "self":       { "href": "/cars/6ad778647e17e21a163515d8", "method": "GET" },
    "collection": { "href": "/cars", "method": "GET" },
    "update":     { "href": "/cars/6ad778647e17e21a163515d8", "method": "PATCH" },
    "replace":    { "href": "/cars/6ad778647e17e21a163515d8", "method": "PUT" },
    "delete":     { "href": "/cars/6ad778647e17e21a163515d8", "method": "DELETE" },
    "markSold":   { "href": "/cars/6ad778647e17e21a163515d8", "method": "PATCH", "body": { "status": "sold" } }
  }
}
```
The same request from **another user** returns only `self` and `collection` — the client can tell from the response itself that it may not modify this car, without trying and getting a 403. After `PATCH { "status": "sold" }`, the owner's links offer `markAvailable` instead of `markSold`.

Automated proof (all passing, 26/26 tests): 405 + `Allow` on four URLs; PATCH vs full PUT; owner vs non-owner link sets; `markSold` → `markAvailable` after the state change; root entry points.

---

## 5. Final level and honest limitations

**The API now meets Level 2 fully and Level 3 partially.**

Where it falls short of "pure" Level 3, and why:

1. **The list `GET /cars` has no links.** It still returns a plain array because the React app expects an array; wrapping it as `{ "_embedded": { "cars": [...] }, "_links": {...} }` would be a breaking change. Each car in it can be followed via `/cars/<id>`, which does have links.
2. **The React client does not navigate by links yet.** It still builds URLs in `src/api/cars.js`. The links are there for any client to use; switching the frontend to them would be the next step.
3. **Two endpoints are deliberately action-shaped (RPC style):** `POST /auth/login` and `POST /api/ai/generate-description`. Neither creates or changes a stored resource — one exchanges credentials for a token, the other computes text. Modelling them as resources (`POST /sessions`, `POST /descriptions`) would be purer but adds no benefit here, so they are documented exceptions.
4. **Links use a simple home-made format** (`href`, `method`, optional `body`) rather than a standard such as HAL or JSON:API. Adding a media type like `application/hal+json` would let generic clients understand them.

## 6. HATEOAS — why it matters
- **Decoupling:** if a URL changes, clients that follow `_links` keep working; clients that hardcode URLs break.
- **The server owns the rules:** "only the owner can delete" and "only an available car can be marked sold" are decided once on the server and expressed as which links appear. The frontend could simply show a Delete button when `_links.delete` exists.
- **Discoverability:** a new client can start at `GET /` and find every capability.
- **The cost:** bigger responses, logic to build links, and real benefit only when clients actually follow them, which is why most public APIs stop at Level 2.

## 7. Rubric checklist
| Criterion | Marks | Where |
|---|---|---|
| Maturity evaluation | 4 | §1 levels explained, §2 level-by-level evaluation with recorded evidence, §5 final level and limitations |
| Level 2 compliance | 3 | §2 gaps, §3 fixes 1–2 (405 + `Allow`, PATCH vs PUT), §4 before/after table, automated tests |
| HATEOAS awareness | 3 | §3 fix 3 and §4 sample: state- and permission-dependent `_links` and the `GET /` entry point; §6 benefits and costs |
