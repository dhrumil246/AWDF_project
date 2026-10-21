# Assignment 3 — Performance Load Testing with Apache Bench

**Course:** ITUE301 · **CO4** · Week 9
**Endpoint tested:** `GET /cars` (JWT-protected, returns all 506 cars ≈ 152 KB of JSON)
**Compared:** in-memory cache **on** (node-cache, 60 s TTL — Practical 9) vs **off** (`DISABLE_CACHE=true`)
**Raw output:** [`evidence/a3-cache-on.txt`](evidence/a3-cache-on.txt), [`evidence/a3-cache-off.txt`](evidence/a3-cache-off.txt)
**Reproduce:** [`loadtest.sh`](loadtest.sh)

---

## 1. Metrics
| Metric | Meaning | From `ab` |
|---|---|---|
| **RPS** (throughput) | How many requests the server completes per second | `Requests per second` |
| **Latency** | How long one user waits for one response | `Time per request (mean)`, percentiles `50% / 90% / 99%` |
| **Error rate** | Share of requests that failed | `Failed requests` + `Non-2xx responses` ÷ `Complete requests` |

Percentiles matter more than the mean: p99 = 99 % of users waited at most this long.

## 2. Setup
| | |
|---|---|
| Machine | Apple M1, 8 cores, Node v22.23.2, ApacheBench 2.3 (preinstalled on macOS) |
| API | `node server.js`, one process, local |
| Database | local MongoDB (in-memory server), **not** Atlas — load tests and `npm run seed` must never hit shared or production data |
| Data | `npm run seed -- 500` → 1 demo user + 506 cars |
| Each run | 1 warm-up request, then `ab -n 1000 -c <10 \| 50 \| 100> -H "Authorization: Bearer <token>" http://127.0.0.1:5001/cars` |

```bash
# cache on
cd backend && npm run dev
assignments/loadtest.sh http://127.0.0.1:5001 1000 10 50 100
# cache off
DISABLE_CACHE=true npm run dev
assignments/loadtest.sh http://127.0.0.1:5001 1000 10 50 100
```

`ab -q` hides progress, `-n` = total requests, `-c` = requests in flight at once, `-H` sends the JWT (without it every request would be a 401 and the test would measure nothing useful).

## 3. Results

### Comparison table
| Concurrency | | RPS | Mean latency | p50 | p90 | p99 | Max | Failed | Error rate |
|---|---|---|---|---|---|---|---|---|---|
| **10** | cache **on** | **738.7** | **13.5 ms** | 13 | 14 | 18 | 22 | 0 / 1000 | 0 % |
| | cache off | 118.2 | 84.6 ms | 82 | 89 | 98 | 135 | 0 / 1000 | 0 % |
| **50** | cache **on** | **766.6** | **65.2 ms** | 64 | 67 | 70 | 71 | 0 / 1000 | 0 % |
| | cache off | 121.1 | 412.9 ms | 412 | 419 | 425 | 428 | 0 / 1000 | 0 % |
| **100** | cache **on** | **772.2** | **129.5 ms** | 128 | 131 | 134 | 134 | 0 / 1000 | 0 % |
| | cache off | 119.7 | 835.6 ms | 824 | 888 | 949 | 954 | 0 / 1000 | 0 % |

(latency percentiles in ms)

### Summary
- **Throughput: 6.3× higher with the cache** (≈ 770 vs ≈ 120 RPS).
- **Latency: 6.3× lower** at every concurrency level (65 ms vs 413 ms mean at c = 50).
- **Error rate: 0 %** in all six runs (6,000 requests) — no failures, timeouts or non-2xx responses.
- **Server time per request** (`Time per request, across all concurrent requests`): **1.3 ms** cached vs **8.3 ms** uncached.

## 4. Analysis

**Why the cache helps so much.** A cache MISS runs a MongoDB query for 506 documents, populates each car's owner, and converts every Mongoose document to JSON-ready objects — about 8.3 ms of work per request. A HIT skips all of that and only serialises an already-prepared array (≈ 1.3 ms). The work per request drops ~6×, and throughput rises by the same factor.

**Throughput stays flat as concurrency grows.** RPS is the same at c = 10, 50 and 100 in both modes. Node runs JavaScript on **one thread**, so once that thread is fully busy, more simultaneous clients cannot make it faster — they just queue. The server is **CPU-bound**, not waiting on the network or the database.

**Latency grows in proportion to concurrency.** Because the throughput is fixed, each extra waiting client adds to the queue. The numbers follow **Little's law** almost exactly — *latency ≈ concurrency ÷ throughput*:

| | c ÷ RPS | measured mean |
|---|---|---|
| cache on, c = 50 | 50 ÷ 766.6 = 65.2 ms | 65.2 ms |
| cache off, c = 50 | 50 ÷ 121.1 = 412.9 ms | 412.9 ms |

So the way to serve more users at the same latency is to raise throughput: cheaper requests (cache, pagination) or more processes (scaling out).

**Tail latency is tight.** p99 stays within ~10 % of the median (e.g. 70 vs 64 ms cached at c = 50). The behaviour is steady queuing, not random slow outliers; the one exception is the uncached c = 100 run (p99 949 ms vs p50 824 ms), where the database starts adding variance.

**The response is the remaining bottleneck.** Even cached, every request sends 152 KB and transfers ≈ 110 MB/s. Returning all cars at once does not scale: **pagination** (`GET /cars?page=1&limit=20`) would cut response size and serialisation cost by ~25×.

## 5. Limitations of this test
- **Local and loopback only.** Client, API and database share one laptop; a real network would add latency, and `ab` itself competes for CPU. Absolute numbers are machine-specific; the **ratios** are what matter.
- **Atlas would widen the gap.** Each uncached request would also pay the network round trip to the cluster, which a cache HIT avoids entirely.
- **One endpoint, one user.** Every request is the same `GET /cars`, which is the best case for a single cache key. Real traffic mixes reads and writes; writes invalidate the cache and cause MISSes.
- **`ab` is HTTP/1.0 without keep-alive by default**, so every request opens a new TCP connection. Browsers reuse connections, so real clients would see slightly better results.

## 6. Recommendations
1. Keep the cache for read-heavy endpoints (6× throughput for ~30 lines of code).
2. Add pagination to `GET /cars` — the largest remaining cost is the 152 KB response.
3. To go beyond one CPU core, run several Node processes (`node:cluster`, PM2, or more containers behind a load balancer) and move the cache to **Redis** so all instances share it and invalidation works everywhere (see [`ARCHITECTURE.md`](ARCHITECTURE.md)).
4. Re-run this test in CI or before releases to catch performance regressions.

## 7. Rubric checklist
| Criterion | Marks | Where |
|---|---|---|
| Test execution | 4 | §2 exact commands and setup, `loadtest.sh`, raw `ab` output for 6 runs (6,000 requests) |
| Comparison table | 3 | §3 RPS, mean and percentile latency, error rate, cached vs uncached at three concurrency levels |
| Analysis | 3 | §4 why caching helps, CPU-bound plateau, Little's law check, tail latency, payload size; §5 limitations; §6 recommendations |
