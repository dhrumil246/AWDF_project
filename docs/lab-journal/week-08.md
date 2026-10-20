# Week 8 — Performance Optimization and Lazy Loading in React

## Objective
Reduce the JavaScript downloaded up front by lazy-loading route components, and measure the effect before and after.

## What I built
- **Baseline first:** recorded `npm run build` output and the JS downloaded by the browser *before* changing any code ([`w08-build-before.txt`](../evidence/w08-build-before.txt), [`w08-network-before.txt`](../evidence/w08-network-before.txt)).
- **Route-based code splitting** in `App.jsx`: `const Cars = lazy(() => import('./pages/Cars'))`, and the same for `AddCar`, `EditCar`, `Catalog`, `Login`, `NotFound`. `Home` is a normal import because it is the landing page and is needed immediately.
- **One `<Suspense fallback={<Spinner label="Loading page..." />}>`** wrapping only `<Routes>`, so the header, nav and footer stay on screen while a page chunk loads.
- **Post-lab, extra lazy component:** `ModelList` inside `Catalog` is lazy with its own `Suspense`, because it is only needed after the user picks a make.
- **Post-lab, unnecessary re-render:** found and fixed with `memo(CarCard)` + `useCallback` (details below).

## Results
### Build output (`npm run build`)
| | Before | After |
|---|---|---|
| Main bundle | `index-B_9PN_Rr.js` 277.10 kB (87.33 kB gzip) | `index-DCDFnl6d.js` 267.32 kB (85.03 kB gzip) |
| Other JS chunks | none | `Cars` 0.70, `CarCard` 1.67, `AddCar` 0.25, `CarForm` 3.41, `EditCar` 0.82, `Catalog` 2.33, `ModelList` 0.79, `Login` 1.90, `NotFound` 0.32 kB |

Vite created one chunk per `import()`. `CarForm` and `CarCard` became their own shared chunks automatically because two lazy pages import each of them.

### What the browser downloads (production build, `vite preview`, gzip)
| Step | Before | After |
|---|---|---|
| Open `/` | 86,437 B (everything) | 84,158 B (main bundle only) |
| Click Cars | nothing new | +702 B `Cars` + 745 B `CarCard` |
| Click Add Car | nothing new | +255 B `AddCar` + 1,194 B `CarForm` |
| Click Catalog | nothing new | +1,155 B `Catalog` |
| Pick a make | nothing new | +795 B `ModelList` |

**Saving on first load: 2,279 bytes (≈ 2.6 %).** Load times on localhost were ~17 ms, which is too small and too noisy to compare, so the byte counts are the measurement I rely on.

### Honest interpretation
The saving is small because ~85 kB of the bundle is React, React DOM and React Router, which every page needs. The app's own pages are only a few kB in total. The technique works (chunks clearly load on demand), but for an app this size the benefit is marginal. It would matter much more with a heavy dependency on one page (a chart or map library), which is exactly what the "lazy-load a heavy component" post-lab is about.

### Unnecessary re-render (post-lab)
Measured with a temporary render counter in `CarCard` (removed afterwards), on `/cars` with 8 cars ([`w08-rerender-measurement.txt`](../evidence/w08-rerender-measurement.txt)):

| | "Mark sold" on one car | Toast disappears 3 s later |
|---|---|---|
| Before | 18 card renders | +16 (all 8 cards ×2 in StrictMode) |
| After `memo` + `useCallback` | 4 (only that card) | +0 |

Cause: `App` re-renders when `notice` changes and created new handler functions each time, so every card got "new" props. `memo` skips a card whose props are unchanged; `useCallback` keeps the handler references the same between renders.

## Key questions
**What is the difference between the initial bundle and a lazy-loaded chunk in terms of when each is downloaded?**
The initial bundle is referenced by `index.html` and must download before the app renders anything. A lazy chunk is fetched only when React first tries to render that component. Seen in the Network log: `Catalog-*.js` was requested the moment I clicked Catalog, not before.

**Why does lazy loading improve perceived performance even though the total code downloaded eventually stays the same?**
The user only waits for the code of the page they are looking at. Code for pages they never visit is never downloaded, and code for later pages arrives in small pieces while they use the app, instead of all of it delaying the first screen.

**When would lazy loading not be worth the added complexity?**
When the app is small or most of the bundle is shared framework code — like here: 2.6 % saved on first load. Each lazy route also adds a short loading state on first visit and an extra request. It pays off when individual routes or components are large.

## Common mistakes avoided
- `React.lazy()` needs a **default export**. Every page already used `export default`.
- `Suspense` wraps only `<Routes>`, not the whole `App`, so the layout does not disappear while a page loads.
- Baseline metrics captured before any code change.

## Errors & fixes
| Symptom | Cause | Fix |
|---|---|---|
| Every car card re-rendered when only the toast changed | New handler functions on each `App` render | `memo(CarCard)` + `useCallback` handlers |
| (measurement issue) Second visits showed `transferSize` 300 B or 0 B | The browser served the bundle from cache | Used `encodedBodySize` (actual compressed size) for the comparison |

## Evidence
- Build before/after: [`w08-build-before.txt`](../evidence/w08-build-before.txt), [`w08-build-after.txt`](../evidence/w08-build-after.txt)
- Network before/after: [`w08-network-before.txt`](../evidence/w08-network-before.txt), [`w08-network-after.txt`](../evidence/w08-network-after.txt)
- Re-render measurement: [`w08-rerender-measurement.txt`](../evidence/w08-rerender-measurement.txt)
- **To add yourself:** screenshots of DevTools → Network with **Disable cache** and **Slow 3G**, showing (1) the single bundle before (`git checkout week-07`), (2) the separate chunks after, and (3) the "Loading page..." fallback while a chunk loads. My tools could not throttle the network, so these need a real DevTools session.

## Post-lab work done
- [x] Lazy-loaded one additional component beyond the routes (`ModelList`)
- [x] Identified and fixed one unnecessary re-render (`CarCard` on toast changes)
