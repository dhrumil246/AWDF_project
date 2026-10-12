# Car Details Management System

Full stack car inventory app built week by week for **ITUE301 – Advanced Web Development Frameworks**.

## Structure

```
car-details-management-system/
├── frontend/          React (Vite)
└── docs/lab-journal/  weekly notes, key-question answers, screenshots
```

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

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
