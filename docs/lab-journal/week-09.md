# Week 9 — In-Memory Caching and Query Optimization

## Objective
Add server-side caching to the car API with `node-cache`, keep it correct with invalidation, and measure its effect on response time.

## What I built
- `backend/cache.js`: one shared `NodeCache({ stdTTL: 60 })` instance plus the key names (`cars:all`, `car:<id>`). `useClones: false` because only plain JSON objects are stored and never mutated, so deep-copying on every read is wasted work.
- `GET /cars`: check `cars:all` → on a **HIT** return it immediately; on a **MISS** query MongoDB, convert the Mongoose documents to plain objects with `toJSON()`, store them, return them.
- Post-lab: `GET /cars/:id` is cached separately under `car:<id>`. A 404 is never cached.
- **Invalidation:** `invalidate(id)` runs after every *successful* write — `POST` deletes `cars:all`; `PUT` and `DELETE` delete `cars:all` and `car:<id>`. A failed write (400/403/404) changes nothing, so it invalidates nothing.
- `X-Cache: HIT | MISS | BYPASS` response header, so cache behaviour is visible in Postman, curl or DevTools.
- `DISABLE_CACHE=true` in `.env` switches caching off. I used it to record uncached times without editing code, and Assignment 3 needs the same on/off comparison.
- Post-lab: `GET /debug/cache` (non-production only) returns `cache.getStats()` — hits, misses, number of keys — plus the cached key names.
- `npm run seed -- 500` adds 500 generated cars (506 in total), because with 6 cars the query is too fast for any difference to show.

**One key is safe here.** Since Week 7 every logged-in user sees the *same* car list (only edit/delete is restricted to the owner), so the response does not depend on who asks. If each user only saw their own cars, a single key would leak one user's cars to another; the key would have to include the user id (`cars:<userId>`).

## Results
`GET /cars` with 506 cars, local MongoDB, measured with curl `time_total`, 10 readings each after one warm-up request ([`w09-response-times.txt`](../evidence/w09-response-times.txt)):

| | Reading 1 | Reading 2 | Reading 3 | Mean of 10 |
|---|---|---|---|---|
| Uncached (`DISABLE_CACHE=true`) | 21.3 ms | 17.8 ms | 13.7 ms | 13.1 ms |
| Cached (`X-Cache: HIT`) | 2.7 ms | 2.3 ms | 2.5 ms | 2.5 ms |

**Cached responses were 5.3× faster.** A HIT skips the MongoDB query, the `populate` of the owner and the conversion of 506 documents. Against MongoDB Atlas every uncached request also pays the network round trip to the cluster, so the gap would be larger than this local measurement.

Correctness ([`w09-cache-correctness.txt`](../evidence/w09-cache-correctness.txt)):

| Step | X-Cache | Result |
|---|---|---|
| `GET /cars` 1st / 2nd | MISS / HIT | 506 cars both times |
| `POST /cars` Kia Seltos | – | `cars:all` deleted |
| `GET /cars` | MISS | 507 cars, Seltos first |
| `GET /cars/:id` 1st / 2nd | MISS / HIT | |
| `PUT /cars/:id` price 1299000 | – | `cars:all` and `car:<id>` deleted |
| `GET /cars/:id` and `GET /cars` | MISS / MISS | new price in both |
| `DELETE /cars/:id`, then `GET /cars` | MISS | 506 cars; `GET /cars/:id` → 404 |
| `GET /debug/cache` | – | `hits: 2, misses: 7` |

## Key questions
**Why must the cache be invalidated on every write, and what would happen otherwise?**
Without invalidation the cache keeps returning the list as it was when it was stored. After adding, editing or deleting a car, users would see the old data for up to 60 seconds — a deleted car still listed, an old price, a "sold" car shown as available. The run above shows that after each write the next read is a MISS and returns the new data.

**What is a reasonable TTL, and what trade-off does it represent?**
60 seconds. Longer TTL = more hits and less database load, but if something changes the data without going through these routes (for example `npm run seed`, or a second server instance), it can be stale for longer. Shorter TTL = fresher but fewer hits; at a few seconds the cache would almost never be hit. Because every write through the API invalidates immediately, the TTL is only a safety net, so 60 s is a good balance for a car inventory.

**Why is node-cache not suitable for a multi-server deployment, even though it works here?**
The cache is a JavaScript object in one Node process's memory. With two instances behind a load balancer, a `PUT` handled by instance A clears only A's cache; instance B keeps serving the old car until its TTL expires. Each instance also has its own cold cache, and everything is lost on restart. A shared cache such as Redis fixes this, because all instances read and invalidate the same store.

## Errors & fixes
| Symptom | Cause | Fix |
|---|---|---|
| (avoided) Caching Mongoose documents | With node-cache's default `useClones: true`, every get/set deep-copies large Mongoose document objects | Store `doc.toJSON()` plain objects and set `useClones: false` |
| (avoided) No measurable difference with 6 cars | The query was already ~1–2 ms | Seeded 500 extra cars (`npm run seed -- 500`), as the manual's troubleshooting guide suggests |
| Uncached times were recorded with the bypass flag rather than before the cache code existed | I added `DISABLE_CACHE` so both measurements run on the same code and data | Same effect as "comment out the cache check", without editing code between runs |

## Evidence
- Correctness run: [`docs/evidence/w09-cache-correctness.txt`](../evidence/w09-cache-correctness.txt)
- Timing readings and summary: [`docs/evidence/w09-response-times.txt`](../evidence/w09-response-times.txt)
- Postman: send **Cars › Get all cars** twice and look at the `X-Cache` response header (MISS → HIT); **Cars › Cache stats (debug)** shows the counters.

## Post-lab work done
- [x] Cached `GET /cars/:id` separately from the full list
- [x] Cache hit/miss counter exposed through a debug endpoint
