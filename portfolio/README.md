# Student Portfolio

React portfolio built for **ITUE301 – Advanced Web Development Frameworks** (Practicals 1–3).

## Tech

- React (Vite)
- React Router (v7, declarative mode — same `BrowserRouter`/`Routes`/`Route`/`Link` API as v6; v6 has unpatched security advisories)
- Plain CSS with CSS variables for light/dark themes

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Routes

| Path | Page | Notes |
|---|---|---|
| `/` | `Home` | About + Skills |
| `/projects` | `Projects` | Project cards |
| `/contact` | `Contact` | Controlled message input with live preview and character count, help toggle |
| `*` | `NotFound` | 404 page for unknown paths |

Navigation uses `NavLink`, so pages switch without a full reload and the active link is highlighted.

## Component structure

```
main.jsx (BrowserRouter)
└── App.jsx              darkMode state
    ├── Header.jsx       name, role, themeColor (props)
    ├── NavBar.jsx       links (props) + theme toggle
    ├── <Routes>
    │   ├── pages/Home.jsx      → About.jsx, Skills.jsx
    │   ├── pages/Projects.jsx  → components/Projects.jsx
    │   ├── pages/Contact.jsx   message + showHelp state
    │   └── pages/NotFound.jsx
    └── Footer.jsx       name, email (props)
```

All profile data lives in `src/App.jsx` and is passed down as props, so no component hardcodes content.

## Lab journal

Weekly notes, answers to the key questions and screenshots are in [`docs/lab-journal`](docs/lab-journal).
