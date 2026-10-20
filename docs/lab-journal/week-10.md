# Week 10 — Asynchronous Processing with Event-Driven Architecture

## Objective
Move a side effect (a notification) out of the request–response path using Node's built-in `EventEmitter`, and prove with timestamps that the API responds without waiting for it.

## What I built
- `events/carEvents.js`: `class CarEvents extends EventEmitter {}` and one shared instance, created with `{ captureRejections: true }`.
- `events/listeners.js`, required **once** in `server.js` at startup:
  - `car-created` → logs when it was received, waits `NOTIFY_DELAY_MS` (2000 ms, simulating a slow email/SMS), then logs `[Notification] "<make> <model>" (<year>) listed by <name> <email> — done at <time>` — the car, the timestamp and the user who listed it.
  - `car-deleted` (post-lab) → logs which car was removed and by whom.
  - `error` (post-lab) → logs any failure inside the listeners above.
- `createCar` sends `res.status(201).json(car)`, logs `[API] 201 response sent at …`, **then** calls `carEvents.emit('car-created', { car, user: req.user })`. `deleteCar` emits `car-deleted` after its response the same way.
- `scripts/check-events.js` (`npm run check:events`): a self-check with `assert` that `emit()` returns in under 50 ms while the listener is still waiting, and that an error thrown in a listener reaches the `error` listener.

## Results
Live run against the API ([`w10-event-timestamps.txt`](../evidence/w10-event-timestamps.txt)):

| Time (UTC) | Event |
|---|---|
| 09:14:44.044 | `POST /cars` received (request logger) |
| 09:14:44.053 | `[API] 201 response sent` |
| 09:14:44.053 | `[Notification] car-created received` |
| 09:14:46.055 | `[Notification] "Kia Seltos" (2024) listed by Demo Dealer — done` |

The client measured **9.8 ms** total for the POST. The notification finished **2.0 s after** the response was sent. `DELETE` behaved the same: 12 ms response, removal notification 2 s later.

Self-check ([`w10-check-events.txt`](../evidence/w10-check-events.txt)): `emit()` returned after 1 ms; a listener that threw `Cannot read properties of null (reading 'make')` was caught by the `error` listener and the process kept running.

## Key questions
**Why does emitting an event not block the API response, even though both run in the same Node.js process?**
Precisely: `emit()` calls each listener **synchronously**, in order, before it returns. It is not "magic async". What keeps the response fast is that (1) the response is sent before `emit()` is called, and (2) the listener does almost nothing synchronously — it logs one line, then hits `await sleep(...)`, which hands control back to the event loop. The remaining 2 s of work continue later from a timer callback, while the event loop is free to finish sending the response and serve other requests. A listener doing 2 s of heavy synchronous CPU work would still block the whole process, including other users' requests.

**What would happen to API response time if the notification logic were inside the POST route?**
If the route did `await sleep(2000)` (or awaited a real email service) before `res.json()`, every car creation would take 2 s+ for the user, and a slow or failing email service would make adding a car slow or fail. With the event, creation takes ~10 ms and the notification is independent.

**Why is EventEmitter reasonable at this scale but not for millions of events per day?**
Events live only in this process's memory: if the server crashes or restarts after the response but before the listener finishes, the notification is silently lost, with no retry. Nothing is persisted, there is no backpressure, and work cannot be spread across multiple servers — every event is handled by the instance that emitted it. A message queue (RabbitMQ, Redis/BullMQ, SQS) stores jobs durably, retries failures and lets separate workers process them. For a lab app, EventEmitter shows the same decoupling with no extra infrastructure.

## Errors & fixes
| Symptom | Cause | Fix |
|---|---|---|
| (avoided) An error thrown inside an `async` listener would become an **unhandled promise rejection** | EventEmitter ignores the promise an async listener returns; the manual's troubleshooting note only covers the special `'error'` event | Created the emitter with `captureRejections: true`, so rejections are routed to its `'error'` event, and registered an `'error'` listener. Verified by `check-events.js` |
| (avoided) Notifications never appear | Listener file never required | `require('./events/listeners')` once in `server.js` |
| (avoided) Async effect invisible because both timestamps are identical | No delay in the listener | `NOTIFY_DELAY_MS` (default 2000 ms) |

## Evidence
- Live API run with client timing and server log order: [`docs/evidence/w10-event-timestamps.txt`](../evidence/w10-event-timestamps.txt)
- Self-check output: [`docs/evidence/w10-check-events.txt`](../evidence/w10-check-events.txt)

## Post-lab work done
- [x] Second event `car-deleted` with its own listener and message
- [x] Error listener that catches errors thrown inside the `car-created` handler
- [x] Supplementary: slow handler (2 s `setTimeout`) with the API still responding immediately
