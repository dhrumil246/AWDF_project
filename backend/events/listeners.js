// Background "notification" handlers. Required once at startup (server.js).
const carEvents = require('./carEvents');

// Simulates a slow side effect (sending an email/SMS, calling another service).
const NOTIFY_DELAY_MS = Number(process.env.NOTIFY_DELAY_MS ?? 2000);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

carEvents.on('car-created', async ({ car, user }) => {
  console.log(`[Notification] car-created received at ${now()}`);
  await sleep(NOTIFY_DELAY_MS);
  console.log(
    `[Notification] "${car.make} ${car.model}" (${car.year}) listed by ${user.name} <${user.email}> — done at ${now()}`,
  );
});

carEvents.on('car-deleted', async ({ car, user }) => {
  await sleep(NOTIFY_DELAY_MS);
  console.log(`[Notification] "${car.make} ${car.model}" was removed by ${user.name} at ${now()}`);
});

// Errors thrown inside any listener above end up here (captureRejections),
// so a failing notification is logged and never crashes the API.
carEvents.on('error', (err) => {
  console.error(`[Notification] listener failed at ${now()}: ${err.message}`);
});

module.exports = carEvents;
