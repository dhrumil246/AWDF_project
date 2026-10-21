# Assignment 5 — Cloud Service Models and Docker Resource Limits

**Course:** ITUE301 · **CO5** · Week 11
**System:** the Docker Compose stack from Practical 11 (`docker-compose.yml`: `frontend`, `backend`, `mongodb`).
**Evidence:** [`evidence/a5-resource-limits.txt`](evidence/a5-resource-limits.txt)

---

## 1. Cloud service models

In every model the provider runs the data centre. The difference is **how much of the stack you still manage yourself**.

| Layer | On-premises | **IaaS** | **PaaS** | **Serverless (FaaS)** |
|---|---|---|---|---|
| Application code | you | you | you | you |
| Runtime (Node.js), dependencies | you | you | provider (you pick a version) | provider |
| Scaling, load balancing | you | you (autoscaling groups) | provider (instance count / auto) | provider, per request, to zero |
| OS, patches, Docker | you | **you** | provider | provider |
| Virtual machines, networking | you | provider | provider | provider |
| Hardware, data centre | you | provider | provider | provider |

| | **IaaS** | **PaaS** | **Serverless** |
|---|---|---|---|
| You get | Virtual machines, disks, networks | A platform that runs your app or container from code/image | Functions that run per event/request |
| Examples | AWS EC2, Azure Virtual Machines, Google Compute Engine, DigitalOcean Droplets | Render, Heroku, Azure App Service, Google App Engine; container platforms such as Google Cloud Run, AWS App Runner; **MongoDB Atlas** (database PaaS / DBaaS) | AWS Lambda, Azure Functions, Google Cloud Functions, Vercel/Netlify Functions |
| Billing | per VM-hour, even when idle | per instance-hour / plan | per invocation and execution time; ~0 when idle |
| Control | maximum (any OS, any software) | medium | minimum |
| Ops effort | highest | low | lowest |
| Scaling | you configure it | built in | automatic, instant, to zero |
| Limits | none beyond the VM | platform rules (ports, filesystem is temporary) | short max duration, **cold starts**, **no in-memory state between calls**, no long-lived processes |
| Best for | custom setups, legacy software, full control | typical web apps and APIs | spiky or event-driven workloads, glue code |

---

## 2. Mapping our Docker Compose stack

**As it runs today** — `docker compose up` on one machine — the nearest model is **IaaS**. Put the same thing in the cloud by renting a VM (e.g. EC2), installing Docker and running `docker compose up -d`. We would still own the OS, Docker updates, firewall, TLS certificates, backups of the `mongo-data` volume, restarts and scaling. Compose gives us *portable packaging*, not a managed platform.

**Each service and its best-fitting model:**

| Service | Today | Best cloud model | Why |
|---|---|---|---|
| `frontend` (nginx + static files) | container | **PaaS / static hosting + CDN** (Netlify, Vercel, S3 + CloudFront) | Only static files after `vite build`; a CDN serves them closer to users, no server to manage |
| `backend` (Express API image) | container | **Container PaaS** (Cloud Run, Render, App Runner, Azure Container Apps) | We already have an image; the platform handles TLS, restarts, scaling and logs |
| `mongodb` (`mongo:7` + volume) | container | **DBaaS / PaaS — MongoDB Atlas** (already used in development) | Backups, replication, upgrades and monitoring are the hardest parts to run yourself |

**Why not serverless for the backend (yet)?** The API keeps state in memory: `node-cache`, the AI rate-limit `Map`, and `EventEmitter` listeners that run *after* the response (Week 10). On a function platform each invocation may run in a fresh instance and is frozen after responding, so the cache would rarely hit, the rate limit would not hold, and background notifications could be cut off. It also opens a MongoDB connection per cold start. The **AI description endpoint** is the part that fits serverless best: stateless, short, called rarely. Moving the cache and rate limiter to Redis (see [`ARCHITECTURE.md`](ARCHITECTURE.md)) would make the rest serverless-friendly too.

**Recommended production layout:** static frontend on a CDN · backend image on a container PaaS · MongoDB Atlas · secrets (`JWT_SECRET`, `GEMINI_API_KEY`, `MONGO_URI`) in the platform's secret store, never in the image.

---

## 3. Docker resource limits

### What was added to `docker-compose.yml`
```yaml
deploy:
  resources:
    limits:        # hard cap
      cpus: "0.50"
      memory: 256M
    reservations:  # guaranteed minimum
      memory: 128M
```

| Service | CPU limit | Memory limit | Memory reservation | Idle usage (`docker stats`) |
|---|---|---|---|---|
| `mongodb` | 1.0 | 512 MiB | 256 MiB | 86.5 MiB (17 %) |
| `backend` | 0.50 | 256 MiB | 128 MiB | 30.2 MiB (12 %) |
| `frontend` | 0.25 | 64 MiB | 16 MiB | 7.3 MiB (11 %) |

`docker inspect` confirms Docker applied them (`NanoCpus=500000000` = 0.5 CPU, `Memory=268435456` = 256 MiB for the backend).

### What each limit does
- **`cpus`** — a CPU-time quota. `0.50` means the container may use at most half of one core per scheduling period, even if the machine is idle. The kernel *throttles* it (pauses it until the next period); the process is never killed for CPU.
- **`memory` (limit)** — a hard ceiling. If the process needs more, the kernel's OOM killer stops it, and `restart: unless-stopped` brings it back. Node 22 sizes its heap from the container limit, so it garbage-collects before reaching it.
- **`reservations`** — the minimum the scheduler should guarantee when the host is busy (used to decide placement, e.g. in Docker Swarm).

### Measured effect of the CPU limit
`ab -n 1000 -c 20 GET /cars` (506 cars, cache on) against the backend container:

| Backend CPU limit | RPS | Mean latency | p50 | p90 | p99 | Failed | CPU in `docker stats` | Memory |
|---|---|---|---|---|---|---|---|---|
| **0.50** (configured) | 178.8 | 111.9 ms | 101 ms | 165 ms | 227 ms | 0 | **50.00 %** (pinned at the limit) | 41 MiB / 256 MiB |
| 1.0 (`docker update --cpus 1.0`) | 471.2 | 42.4 ms | 39 ms | 51 ms | 83 ms | 0 | — | 44 MiB / 256 MiB |

- The limit **is enforced**: under load the backend sat at exactly 50 % CPU.
- Doubling the CPU gave **2.6× the throughput**, more than 2×, because quota throttling is bursty: the process runs, uses up its slice and is paused, which also stretches the tail (p90 165 ms vs 51 ms).
- Memory stayed at ~44 MiB under load, so 256 MiB leaves plenty of headroom; CPU is the constraint for this API (matches A3).
- In both runs, `0` failed requests: the limits slow the service down but do not break it.

### Choosing the values
Start from measured usage (idle ~30 MiB, load ~44 MiB for the backend), add headroom for spikes and garbage collection (memory limit ≈ 4–6× load usage), and give CPU according to how much throughput is needed (0.5 CPU ≈ 180 RPS here). Limits protect the other services on the same machine — a runaway backend cannot starve MongoDB — and make cloud costs predictable, since container platforms bill by the CPU and memory you allocate.

---

## 4. Dockerfile quality
| Practice | Backend | Frontend |
|---|---|---|
| Small base image | `node:22-alpine` | `node:22-alpine` → `nginx:alpine` |
| **Multi-stage build** | not needed (no build step) | ✅ build stage discarded; only `dist/` shipped |
| Layer caching: manifests copied before source | ✅ `COPY package*.json` → `npm ci` → `COPY . .` | ✅ same |
| Reproducible installs | ✅ `npm ci` (exact lock file) | ✅ `npm ci` |
| Production dependencies only | ✅ `--omit=dev` (no test tools in the image) | ✅ (none at runtime) |
| `.dockerignore` | ✅ `node_modules`, `.env`, Docker files | ✅ `node_modules`, `dist`, `.env` |
| No secrets in the image | ✅ env vars at runtime only | ✅ only the public API URL is baked in |
| Non-root user | ✅ `USER node` | nginx master as root, workers as `nginx` (image default) |
| Exec-form `CMD` (signals reach the process) | ✅ `CMD ["node", "server.js"]` | ✅ nginx default |

## 5. Compose setup
| Feature | How |
|---|---|
| One-command start | `docker compose up --build -d` |
| Service discovery | backend uses `mongodb://mongodb:27017/cardb` on the `app-network` bridge |
| Start order | `mongodb` health check (`mongosh … ping`) + `depends_on: condition: service_healthy` |
| Persistence | named volume `mongo-data:/data/db` (data survived `down`/`up` in Practical 11) |
| Restart policy | `restart: unless-stopped` on every service |
| Secrets | `JWT_SECRET` (required), `GEMINI_API_KEY` from the root `.env`, not committed |
| Exposure | only `5173` (frontend) and `5001` (API) published; MongoDB is reachable only inside the network |
| **Resource limits** | `deploy.resources.limits` + `reservations` on all three services (this assignment) |

## 6. Image size
| Image | Size | Of which our own layers |
|---|---|---|
| `frontend` (multi-stage) | **102 MB** | build output only (a few hundred kB) on top of `nginx:alpine` |
| frontend built single-stage (stage 1 only, measured for comparison) | 461 MB | Node, all `node_modules` and the source |
| `backend` | **267 MB** | **~26 MB** (`npm ci --omit=dev` 26 MB + code 184 kB) — the rest is the `node:22-alpine` base (~173 MB) |

The multi-stage build makes the frontend **4.5× smaller**. For the backend, the application adds only ~26 MB; going further would mean a different runtime base (e.g. a distroless Node image), not changing our code.

---

## 7. Rubric checklist
| Criterion | Marks | Where |
|---|---|---|
| Dockerfile quality | 4 | §4 checklist (both images) |
| Compose setup | 4 | §5 features, §3 resource limits added and verified with `docker inspect` / `docker stats` and a load test |
| Image size | 2 | §6 sizes, layer breakdown, multi-stage vs single-stage comparison |
| *(task)* Cloud models + mapping | — | §1 IaaS / PaaS / Serverless, §2 mapping of this stack and each service |
