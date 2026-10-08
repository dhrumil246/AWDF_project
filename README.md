# Student Portfolio

React portfolio built for **ITUE301 – Advanced Web Development Frameworks** (Practicals 1–3).

## Tech

- React (Vite)
- Plain CSS

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Component structure

```
App.jsx
├── Header.jsx    name, role, themeColor (props)
├── NavBar.jsx    section links (props)
├── About.jsx     bio (props)
├── Skills.jsx    skillList array (props)
├── Projects.jsx  projects array (props)
└── Footer.jsx    name, email (props)
```

All profile data lives in `src/App.jsx` and is passed down as props, so no component hardcodes content.

## Lab journal

Weekly notes, answers to the key questions and screenshots are in [`docs/lab-journal`](docs/lab-journal).
