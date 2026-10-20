# Car Details Management System

Full stack car inventory app built week by week for **ITUE301 – Advanced Web Development Frameworks**.

## Structure

```
car-details-management-system/
├── frontend/          React (Vite)
├── backend/           Node.js + Express REST API
└── docs/
    ├── lab-journal/   weekly notes, key-question answers, screenshots
    ├── evidence/      recorded API responses and server logs
    └── postman/       Postman collection for the API
```

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Run the backend

```bash
cd backend
cp .env.example .env   # then set MONGO_URI to your MongoDB Atlas connection string
npm install
npm run seed           # optional: load 6 sample cars
npm run dev
```

The API runs on the `PORT` from `.env` (5001 locally — on macOS port 5000 is taken by AirPlay Receiver; the code defaults to 5000). The server refuses to start if `MONGO_URI` is missing.

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
| GET | `/cars` | 200 list of cars (newest first) | – |
| GET | `/cars/:id` | 200 car | 400 invalid ObjectId, 404 not found |
| POST | `/cars` | 201 created car + `Location` header | 400 validation (per-field `details`) or bad JSON, 409 duplicate registration, 415 not JSON |
| PUT | `/cars/:id` | 200 updated car (validators run on update) | 400, 404, 409, 415 |
| DELETE | `/cars/:id` | 200 `{ message, car }` | 400, 404 |
| * | unknown route | – | 404 JSON |

Middleware pipeline: `express.json()` → `logger` (method, URL, timestamp) → `/cars` router (`validateId`, `requireJson` per route) → `notFound` → `errorHandler` (last; logs the stack server-side, returns a clean JSON error).

Import `docs/postman/car-details-api.postman_collection.json` into Postman or Thunder Client to run every request.

## Tech

- React (Vite)
- React Router v7 in declarative mode — the same `BrowserRouter` / `Routes` / `Route` / `Link` API as v6. v6 has unpatched security advisories (GHSA-wrjc-x8rr-h8h6), fixed only in v7.18.4+.

## Routes

| Path | Page | Notes |
|---|---|---|
| `/` | `Home` | Inventory stats (total / available / sold) |
| `/cars` | `Cars` | Car cards with a show/hide details toggle |
| `/add` | `AddCar` | Controlled form with live preview; adds the car and redirects to `/cars` |
| `/catalog` | `Catalog` | Car makes and models fetched live from the public [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/) (no key needed) |
| `*` | `NotFound` | 404 for unknown paths |

## External API

`frontend/src/api/nhtsa.js` wraps two NHTSA endpoints and throws on non-2xx responses:

- `GET /GetMakesForVehicleType/car?format=json` → car makes
- `GET /GetModelsForMake/{make}?format=json` → models for one make

## Component structure

```
main.jsx (BrowserRouter)
└── App.jsx              cars + notice state
    ├── Header.jsx       title, subtitle (props)
    ├── NavBar.jsx       links (props), NavLink
    ├── Notice.jsx       auto-dismiss message (useEffect + cleanup)
    ├── <Routes>
    │   ├── pages/Home.jsx
    │   ├── pages/Cars.jsx      → CarList.jsx → CarCard.jsx (showDetails state)
    │   ├── pages/AddCar.jsx    form state → CarCard preview
    │   ├── pages/Catalog.jsx   makes fetch (loading/error/data) + search → ModelList.jsx
    │   └── pages/NotFound.jsx
    └── Footer.jsx       appName (props)
```

Car data lives in `frontend/src/data/cars.js`; components never hardcode content.

## Progress

| Week | Topic | Status |
|---|---|---|
| 1 | React + Vite, component architecture | ✅ |
| 2 | useState, React Router, controlled forms | ✅ |
| 3 | API integration with loading / error states | ✅ |
| 4 | Express REST API, middleware pipeline | ✅ |
| 5 | MongoDB + Mongoose schema and validation | ✅ |
