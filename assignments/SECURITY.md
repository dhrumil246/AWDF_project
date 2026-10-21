# Assignment 2 — Threat Modelling, HTTPS/TLS and Secure Coding

**Course:** ITUE301 · **CO2, CO6** · Week 7
**System:** Car Details Management System — React frontend → Express API (JWT auth) → MongoDB, plus a call-out to the Gemini API.
**Evidence:** [`evidence/a2-https-and-injection.txt`](evidence/a2-https-and-injection.txt); automated tests in `backend/tests/api.test.js` → suite *"security (Assignment 2)"* (30/30 tests passing).

---

## 1. System and trust boundaries

```
 Browser (untrusted)                Our server (trusted)                    External
┌──────────────────┐  HTTPS   ┌──────────────────────────────┐        ┌────────────┐
│ React app        │ ───────► │ Express API                  │ ─────► │ MongoDB    │
│ JWT in           │          │ cors → json → sanitize →     │        │ (Atlas)    │
│ localStorage     │ ◄─────── │ logger → auth → validate →   │        └────────────┘
└──────────────────┘          │ controller (owner check)     │ ─────► ┌────────────┐
                              └──────────────────────────────┘ HTTPS  │ Gemini API │
                                                                      └────────────┘
```

Everything that arrives from the browser — body, URL parameters, the token — is untrusted until the server has checked it. Data sent to MongoDB Atlas and Gemini leaves our control.

**Assets worth protecting:** user accounts and passwords, the JWT signing secret, the Gemini API key, the car inventory (only owners may change their cars), and availability of the API.

---

## 2. STRIDE threat model

| | Threat | Example in this app | Mitigation in place | Where |
|---|---|---|---|---|
| **S** | **Spoofing** — pretending to be another user | Forging or editing a JWT to log in as another dealer; guessing passwords | JWTs are signed with a secret only the server knows; `jwt.verify` rejects edited, garbage or expired tokens (tested: 4 × 401). Passwords stored as bcrypt hashes (cost 10). The same 401 message for "no such email" and "wrong password", so accounts cannot be enumerated | `middleware/auth.js`, `controllers/authController.js` |
| **T** | **Tampering** — changing data you should not | Editing or deleting another dealer's car; NoSQL injection such as `{"password":{"$ne":null}}` to bypass login; changing a token's payload | Ownership check → 403. Validation rejects wrong types before any query. `sanitize` strips `$`/`.` keys; Mongoose `sanitizeFilter` refuses operator objects in filters. JWT signature covers the payload | `controllers/carsController.js`, `middleware/validate.js`, `middleware/sanitize.js`, `app.js` |
| **R** | **Repudiation** — denying you did something | A dealer claims they never deleted a car | Every request is logged with method, URL and time; `car-created` / `car-deleted` events log **which user** did it and when; cars record their `owner`, and documents keep `createdAt` / `updatedAt` | `middleware/logger.js`, `events/listeners.js` |
| **I** | **Information disclosure** — leaking data | Password hashes in responses; stack traces revealing internals; secrets committed to git; tokens sniffed on Wi-Fi; personal data sent to the AI provider | `password` has `select: false` and is removed in `toJSON` (tested). The error handler logs stacks server-side only and returns clean JSON. `.env`, `certs/`, `*.pem` git-ignored (history scanned: no keys). HTTPS encrypts traffic. Only car fields go to Gemini — never names, emails or registration numbers (tested) | `models/User.js`, `middleware/errorHandler.js`, `.gitignore`, `server.js`, `services/ai.js` |
| **D** | **Denial of service** — making the API unusable | Huge request bodies; floods of `GET /cars`; draining the Gemini quota | `express.json()` refuses bodies over 100 kB by default. `GET /cars` is cached for 60 s, so floods mostly hit memory, not MongoDB. AI endpoint limited to 1 request per user per 10 s (429). The AI call has a 10 s timeout | `app.js`, `cache.js`, `middleware/rateLimit.js`, `services/ai.js` |
| **E** | **Elevation of privilege** — gaining rights you do not have | Setting `"owner"` in the body to claim another dealer's car; editing someone else's car through the UI | `owner` always comes from the verified token, never the body (allow-list `pickFields`, tested). Every write re-checks ownership on the server; the UI hiding buttons is only cosmetic | `controllers/carsController.js` |

### Remaining risks (honest gaps)
| Risk | Why it matters | Recommended fix |
|---|---|---|
| No rate limit on `/auth/login` | Password guessing is only slowed by bcrypt | Rate limit by IP and email (e.g. 5 attempts / 15 min) |
| JWT in `localStorage` | Any XSS bug could read it | `httpOnly`, `Secure`, `SameSite` cookie + CSRF protection; keep React's default escaping |
| No token revocation | A stolen token works until it expires (1 h) | Short access token + refresh token, or a server-side deny-list |
| No security headers | Clickjacking, MIME sniffing | `helmet` (CSP, `X-Frame-Options`, HSTS when served over HTTPS) |
| Request log has no user id | Repudiation is only partly covered | Log `req.user.id` for authenticated requests |

---

## 3. HTTPS / TLS

### Why
Over plain HTTP every request — including `POST /auth/login` with the password and every `Authorization: Bearer <token>` — travels as readable text that anyone on the same network can capture. TLS encrypts the connection (**confidentiality**), detects any change in transit (**integrity**), and the certificate proves the server is really `localhost`, not an impostor (**authentication**).

### How it works in brief
The client connects and receives the server's certificate (public key + name, signed by a certificate authority). It checks the signature against a CA it trusts and that the name matches, then both sides agree on session keys and switch to encrypted traffic. TLS 1.3 needs a single round trip for this.

### Enabling it locally with mkcert
mkcert creates a local certificate authority, makes the OS and browsers trust it, and issues a certificate for `localhost`:

```bash
brew install mkcert
mkcert -install        # adds the local CA to the macOS trust store (asks for your password)
cd backend
mkdir -p certs
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1
```

Then in `backend/.env`:

```
HTTPS_KEY_FILE=certs/localhost-key.pem
HTTPS_CERT_FILE=certs/localhost.pem
```

`npm run dev` now logs `Server running on https://localhost:5001`. Set `VITE_API_URL=https://localhost:5001` in `frontend/.env`. The private key never leaves the machine (`certs/` and `*.pem` are git-ignored).

Code: `backend/server.js` uses `https.createServer({ key, cert }, app)` when both variables are set, otherwise `app.listen` (plain HTTP).

### Results ([`evidence/a2-https-and-injection.txt`](evidence/a2-https-and-injection.txt))
Tested with a self-signed `localhost` certificate (same shape as mkcert's). The only step mkcert adds is making the OS trust it.

| Request | Result |
|---|---|
| `curl --cacert localhost.pem https://localhost:5001/` | **TLS 1.3** (AES-256-GCM), `subject: CN=localhost`, **SSL certificate verify ok**, 200 |
| `curl https://localhost:5001/` with no trusted CA | refused: `SSL certificate problem: self signed certificate` — exactly the warning `mkcert -install` removes |
| `curl http://localhost:5001/` | `Empty reply from server` — the port only speaks TLS |
| Register + login over HTTPS | 201, 200 |

In production a public CA (e.g. Let's Encrypt) issues the certificate, or the hosting platform terminates TLS. Add HSTS so browsers never fall back to HTTP.

---

## 4. Input sanitization — NoSQL injection

### The attack
MongoDB queries are objects. If a request body is passed straight into a query, a client can send an **operator** instead of a value:

```json
POST /auth/login
{ "email": "demo@cars.test", "password": { "$ne": null } }
```

`User.findOne({ email: { "$gt": "" } })` matches the first user in the collection. The test *"an operator in a raw query matches any user unless sanitizeFilter is on"* proves it: with protection switched off, that query returned a user.

### Three layers of defence
1. **Validation (Week 7)** — `email` and `password` must be non-empty strings, so an object is rejected with 400 before any query runs.
2. **`express-mongo-sanitize`** — `middleware/sanitize.js` removes every key starting with `$` or containing `.` from `req.body` and `req.params`. `{ "price": { "$gt": 0 } }` becomes `{ "price": {} }`, which validation then rejects.
3. **Mongoose `sanitizeFilter`** — even if an operator object ever reached a query, Mongoose wraps it in `$eq` so it is matched literally; for a `String` field the query is refused with a `CastError`.

**Express 5 compatibility issue found:** the package's usual `app.use(mongoSanitize())` made **every request fail with 500** — *"Cannot set property query of #<IncomingMessage> which has only a getter"* — because Express 5 made `req.query` read-only. I used the package's `sanitize()` function in a small middleware on `body` and `params` instead (this API reads no query-string parameters).

### Results
| Payload | Result |
|---|---|
| `POST /auth/login {"email":{"$gt":""},"password":{"$gt":""}}` | 400 — both fields must be non-empty strings, no token |
| `POST /auth/login {"email":"demo@cars.test","password":{"$ne":null}}` | 400, no token |
| `POST /cars` with `$where`, `owner.id` and `price: {"$gt":0}` | operator keys stripped → 400, no car created |
| Raw `User.findOne({ email: { $gt: '' } })`, protection off / on | returns a user / refused with `CastError` |

---

## 5. Secure coding practices applied
- **Secrets in environment variables only** — `JWT_SECRET`, `MONGO_URI`, `GEMINI_API_KEY`; the server refuses to start without `JWT_SECRET`; `.env.example` contains placeholders only.
- **Passwords** — bcrypt, cost 10, never returned, never logged.
- **Least privilege** — Docker container runs as the `node` user; GitHub Actions token has `contents: read`; MongoDB is not published outside the Docker network.
- **Allow-listing** — only known car fields are copied from requests (`pickFields`); CORS allows only `CLIENT_URL`.
- **Fail safely** — invalid tokens → 401 (never a crash); AI failures → graceful fallback; errors → generic message, details in server logs.
- **Dependency hygiene** — `npm audit`: 0 vulnerabilities; replaced `nodemon` and Jest when they pulled in advisories.

---

## 6. Rubric checklist
| Criterion | Marks | Where |
|---|---|---|
| STRIDE analysis | 4 | §1 trust boundaries, §2 table (all six categories with app-specific examples, mitigations and file references) and remaining risks |
| HTTPS setup | 3 | §3 mkcert steps, `server.js` HTTPS mode, verified TLS 1.3 results |
| Input sanitization | 3 | §4 attack demo, three defence layers, Express 5 issue and fix, test results |
