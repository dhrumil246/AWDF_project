# Week 5 — MongoDB Integration and Schema Design with Mongoose

## Objective
Connect MongoDB to the Express server with Mongoose and enforce data validation through a schema.

## What I built
- `config/db.js` connects with `mongoose.connect(process.env.MONGO_URI)`. The connection string lives in `.env` (git-ignored); `.env.example` shows the Atlas format with placeholders. `server.js` only starts listening **after** the database connects, and exits with a clear message if `MONGO_URI` is missing.
- `models/Car.js` schema:
  - **required** with custom messages: `make`, `model`, `year`, `price`
  - **min/max**: `year` 1950 – next year, `price` ≥ 0, `description` ≤ 500 chars
  - **enum + default**: `fuelType` (default `Petrol`), `transmission` (default `Manual`), `status` (`available`/`sold`, default `available`)
  - **unique + sparse index** on optional `registrationNumber`, with a setter that stores `"gj 01 kz 4321"` as `"GJ01KZ4321"`
  - `trim` on strings, `timestamps: true` for `createdAt`/`updatedAt`, and `toJSON` that exposes `id` instead of `_id` and hides `__v`
- Controllers now use `Car.find()`, `Car.findById()`, `Car.create()`, `Car.findByIdAndUpdate(id, data, { runValidators: true, returnDocument: 'after' })`, `Car.findByIdAndDelete()`.
- `validateId` checks for a 24-character hex ObjectId (400 before the query runs).
- `errorHandler` turns Mongoose errors into structured JSON:
  - `ValidationError` → 400 `{ "error": "Validation failed", "details": { "<field>": "<message>" } }`
  - type mismatch inside validation (e.g. `year: "abc"`) → `"year must be a number"`
  - duplicate key (`code 11000`) → 409 `"A car with this registrationNumber already exists"`
- `npm run seed` (`scripts/seed.js`) replaces the collection with 6 sample cars.

## Key questions
**What is the purpose of a schema in MongoDB, given that MongoDB itself is schema-less?**
MongoDB will store any document shape, so without a schema one car could have `price: "cheap"` and another no `model` at all. The Mongoose schema gives the application one consistent shape, with types, required fields, ranges and allowed values, so every document in `cars` can be trusted by the rest of the code.

**Why define required fields and defaults at the schema level rather than relying on frontend validation alone?**
The frontend is only one client. Postman, curl or a malicious script can call the API directly and skip it entirely. Schema rules run on the server for every request, whatever sends it. Defaults (`status: 'available'`) also guarantee the field exists even when a client forgets it.

**What happens internally when a document fails Mongoose validation — where is the request stopped?**
`Car.create()` runs the validators *before* sending anything to MongoDB. If any rule fails, it rejects with a `ValidationError` holding one entry per invalid field, and no write reaches the database. Express 5 forwards the rejected promise to `errorHandler`, which returns 400 with `details`. For updates, `findByIdAndUpdate` skips validators by default, so I pass `runValidators: true` (verified: `PUT { "status": "stolen" }` → 400).

**try/catch and Express 5**
The manual wraps each route in `try/catch` and calls `next(err)`. Express 5 does this itself: if an `async` handler's promise rejects, the error goes to the error handler. The controllers stay short, and errors still reach `errorHandler` (every 400/409 below came through it).

## Errors & fixes
| Symptom | Cause | Fix |
|---|---|---|
| `year: "abc"` returned `Cast to Number failed for value "abc" (type string) at path "year" for model "Car"` | Mongoose's raw cast message, which exposes internals | `errorHandler` rewrites cast errors inside a `ValidationError` as `"<field> must be a <type>"` |
| (avoided) Invalid updates would be saved | `findByIdAndUpdate` does not run schema validators by default | Pass `runValidators: true` |
| (avoided) `GET /cars/123` would throw a `CastError` | `123` is not a valid ObjectId | `validateId` rejects anything that is not 24 hex characters with 400 |
| Docker daemon stopped during the session, so local `mongo` container was unavailable for testing | Environment | Tested against a temporary in-memory MongoDB; the app itself uses MongoDB Atlas through `MONGO_URI` |

## Evidence
Every request and response, including persistence after a server restart: [`docs/evidence/w05-api-responses.txt`](../evidence/w05-api-responses.txt)

| Request | Result |
|---|---|
| `GET /cars` after `npm run seed` | 200, 6 cars |
| `POST /cars` with `make: "  Kia "`, `registrationNumber: "gj 01 kz 4321"` | 201, stored as `"Kia"`, `"GJ01KZ4321"`, defaults `fuelType: Petrol`, `status: available` |
| `PUT /cars/:id` `{ price, status: "sold" }` | 200, `updatedAt` changed |
| `POST /cars` `{ make }` only | 400, `price`/`year`/`model` required |
| `POST /cars` year 1900, price -5, fuelType Steam | 400, three field messages |
| `PUT /cars/:id` `{ status: "stolen" }` | 400 (validators on update) |
| `POST /cars` with an existing registration number | 409 |
| `POST /cars` `year: "abc"` | 400, "year must be a number" |
| `GET /cars/123` | 400 invalid id |
| `GET /cars/<valid but missing id>` | 404 |
| `DELETE /cars/:id`, then `GET` | 200, then 404 |
| Restart server, `GET /cars` | still 6 cars, data persisted |

Postman: `docs/postman/car-details-api.postman_collection.json` ("Create car" saves the new id into `{{carId}}` for the following requests).

## Post-lab work done
- [x] Enum-restricted field (`fuelType`, `transmission`, `status`; the car equivalent of `priority`)
- [x] `GET /cars/:id` returning a 404 JSON response when the id does not exist
- [x] Supplementary: normalising input before save (`trim` on strings, setter on `registrationNumber`)
