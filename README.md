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

## Component structure

```
App.jsx
├── Header.jsx     title, subtitle (props)
├── CarList.jsx    cars array (props)
│   └── CarCard.jsx  one car (props)
└── Footer.jsx     appName (props)
```

Car data lives in `frontend/src/data/cars.js`; components never hardcode content.

## Progress

| Week | Topic | Status |
|---|---|---|
| 1 | React + Vite, component architecture | ✅ |
