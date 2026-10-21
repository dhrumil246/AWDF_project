# Assignment 6 — Blue-Green Deployment Simulation with Docker Compose

**Course:** ITUE301 · **CO5** · Week 12
**Files:** [`deploy/blue-green/docker-compose.yml`](../deploy/blue-green/docker-compose.yml), [`deploy/blue-green/nginx/default.conf`](../deploy/blue-green/nginx/default.conf), [`deploy/blue-green/bluegreen.sh`](../deploy/blue-green/bluegreen.sh), `GET /health` in `backend/app.js`
**Evidence:** [`a6-zero-downtime.txt`](evidence/a6-zero-downtime.txt), [`a6-shared-database.txt`](evidence/a6-shared-database.txt), [`a6-unhealthy-refused.txt`](evidence/a6-unhealthy-refused.txt), [`a6-status.txt`](evidence/a6-status.txt)

---

## 1. What blue-green deployment is
Two complete copies of the application run at the same time:

- **Blue** — the version users are on now.
- **Green** — the new version, deployed and tested while blue keeps serving.

A router in front decides which one receives traffic. Releasing = pointing the router at green. Rolling back = pointing it at blue again. No version is ever stopped while it serves users, so the switch causes no downtime, and the old version stays warm for an instant rollback.

## 2. Setup

```
                         ┌──────────────────────────┐
clients ──► :5002 ──►    │ proxy (nginx:alpine)     │
                         │ upstream backend {       │
                         │   include active-upstream│ ◄── bluegreen.sh writes
                         │ }                        │     "server backend-blue:5000;"
                         └──────┬───────────┬───────┘     or "server backend-green:5000;"
                     live ──────┘           └────── idle (warm, ready)
               ┌───────────────────┐   ┌────────────────────┐
               │ backend-blue      │   │ backend-green      │
               │ APP_VERSION 1.0.0 │   │ APP_VERSION 1.1.0  │
               └─────────┬─────────┘   └─────────┬──────────┘
                         └───────► mongodb ◄──────┘   one shared database
```

| Service | Image | Role |
|---|---|---|
| `backend-blue` | `backend/` image, `APP_VERSION=1.0.0`, `APP_COLOR=blue` | current version |
| `backend-green` | same build, `APP_VERSION=1.1.0`, `APP_COLOR=green` | new version |
| `mongodb` | `mongo:7` | shared by both colours |
| `proxy` | `nginx:alpine`, published on **5002** | the only entry point |

- Both backends run **simultaneously** in one Compose project (`car-bluegreen`); only the proxy is published, so clients cannot bypass it.
- `GET /health` reports `status`, `version` and `color` (503 if the database is down), so it is always clear which version answered. The proxy also adds an `X-Served-By` header.
- In a real release the two colours would run **different image tags** (e.g. `car-backend:1.0.0` and `car-backend:1.1.0`). Here they share one build and differ by `APP_VERSION`, which is enough to show which one is serving.

```bash
deploy/blue-green/bluegreen.sh up            # start everything, blue live
deploy/blue-green/bluegreen.sh status        # live colour + health of both
deploy/blue-green/bluegreen.sh switch green  # release
deploy/blue-green/bluegreen.sh switch blue   # roll back
deploy/blue-green/bluegreen.sh down
```

### How the switch works (`bluegreen.sh switch <colour>`)
1. **Health gate** — calls `/health` *inside* the target container. Unless it answers `"status":"ok"` the script stops and nothing changes.
2. **Change the route** — rewrites `deploy/blue-green/nginx/active-upstream` to `server backend-<colour>:5000;`.
3. **Validate** — `nginx -t` checks the new configuration before it is used.
4. **Graceful reload** — `nginx -s reload` starts new worker processes with the new upstream. The old workers finish the requests they are handling, then exit. No connection is dropped and no container restarts.

**Why switch the proxy instead of the published port?** The task suggests "changing the active port mapping". Docker cannot change a running container's published port: you would have to recreate the containers so that `5002` moves from blue to green, and while the port is released and re-bound, new connections are refused. Changing which upstream the proxy forwards to achieves the same mapping change (`:5002 → blue` becomes `:5002 → green`) with no gap, and it is how load balancers do it in production.

## 3. Traffic switch simulation — results

### Zero downtime ([`a6-zero-downtime.txt`](evidence/a6-zero-downtime.txt))
A script requested `GET http://localhost:5002/health` every ~50 ms for 25 s while I switched to green and then rolled back:

| From | To | HTTP | Served by | Requests |
|---|---|---|---|---|
| 07:48:31.516 | 07:48:40.645 | 200 | **blue** | 155 |
| *switch → green logged at 07:48:40.838* | | | | |
| 07:48:40.701 | 07:48:50.947 | 200 | **green** | 175 |
| *rollback → blue logged at 07:48:51.135* | | | | |
| 07:48:51.002 | 07:48:56.470 | 200 | **blue** | 94 |

**424 requests, 0 failed, 0 non-200.** Traffic flipped within one request interval (~55 ms) of each nginx reload. The log line is printed after the reload command returns, which is why it appears a few ms after the first green response.

The whole `switch` command takes ~8 s, almost entirely `docker compose exec` overhead for the health check, `nginx -t` and the reload. The actual cut-over is the reload itself.

### Shared data across versions ([`a6-shared-database.txt`](evidence/a6-shared-database.txt))
A car was created through **blue**, traffic switched to **green**, and `GET /cars/<id>` through green returned the same car **with the same login token**. Both colours use one database and the same `JWT_SECRET`, so users are not logged out by a release.

### Safety check ([`a6-unhealthy-refused.txt`](evidence/a6-unhealthy-refused.txt))
With `backend-green` stopped, `switch green` printed *"backend-green is not healthy — not switching"*, and the proxy kept answering from blue.

## 4. Release procedure
1. **Build and deploy green** next to blue (`up`, or in practice `docker compose up -d backend-green` with the new image tag). Blue keeps serving.
2. **Verify green directly** before any user sees it: `status` (health, version), smoke tests against the green container, check logs.
3. **Switch**: `switch green`. The health gate is applied automatically.
4. **Watch** for 10–15 minutes: error rate, latency, logs, `/health`.
5. **Keep blue running** until green is trusted — it is the rollback.
6. **Retire blue**, or leave it in place as the base for the next release, where the roles swap (green live, the next version deployed to blue).

## 5. Rollback plan
| | |
|---|---|
| **Triggers** | 5xx error rate above normal, `/health` not `ok`, latency (p90) clearly worse than before, failed smoke test, a functional bug reported after the switch |
| **Action** | `deploy/blue-green/bluegreen.sh switch blue` |
| **Time to recover** | traffic back on the old version within one reload (~instant); ~8 s for the command |
| **Data** | none lost: both versions use the same database, so cars created on green are still there on blue |
| **Why it is safe** | blue never stopped, so it is warm and was serving minutes ago; its health is checked before switching back |
| **Afterwards** | leave green running but idle to investigate, fix, redeploy green, switch again |

**When a rollback is *not* that simple: database changes.** Blue and green share one database, so **both versions must work with the same schema at the same time**. A release that renames or removes a field would break blue, and the rollback with it. Use **expand → migrate → contract**:
1. **Expand**: add the new field and keep the old one; green writes both.
2. **Switch** and let it run; rolling back still works because blue's field is untouched.
3. **Contract**: remove the old field in a *later* release, once blue no longer needs it.

## 6. Blue-green vs rolling update
| | **Blue-green** | **Rolling update** | Recreate (for reference) |
|---|---|---|---|
| How | Full second environment, switch all traffic at once | Replace instances a few at a time (e.g. 1 of 4, then the next…) | Stop old, start new |
| Downtime | none | none (if enough instances stay up) | yes, while restarting |
| Versions live at once | one (the switch is atomic) | **both**, during the rollout | one |
| Rollback | instant — switch back | slow — roll every instance back | redeploy old version |
| Extra resources | **2×** during the release | +1 instance or a little spare capacity | none |
| Testing before users | the whole new environment can be tested first | each new instance only after it gets traffic | none |
| Risk if the new version is bad | all users at once, but rollback is instant | only part of users at first, but rollback takes longer | all users, with downtime |
| Good fit | small number of services, rollbacks must be immediate | many instances, cost-sensitive, orchestrated (Kubernetes default) | dev / test environments |

A **canary** release combines the two: send a small share of traffic (e.g. 5 %) to green first, then increase it. With this nginx proxy that is a weighted upstream (`server backend-green:5000 weight=1; server backend-blue:5000 weight=19;`).

**For this project** blue-green is the better fit: one backend service, instant rollback, and the extra cost is a single 0.5-CPU container during releases.

## 7. Rubric checklist
| Criterion | Marks | Where |
|---|---|---|
| Blue-green setup | 4 | §2 two versions running at once behind one proxy, shared DB, `/health` with version and colour, helper script with health gate |
| Traffic switch simulation | 3 | §3 measured switch and rollback (424 requests, 0 failures), shared data across versions, unhealthy-switch refusal |
| Documentation quality | 3 | §4 release procedure, §5 rollback plan with triggers and DB migration strategy, §6 comparison with rolling updates |
