// Self-check for the event system: node scripts/check-events.js
// 1. emit() returns before the async listener finishes (non-blocking)
// 2. an error thrown inside a listener reaches the 'error' listener instead of crashing
process.env.NOTIFY_DELAY_MS = '300';
const assert = require('assert');
const carEvents = require('../events/listeners');

const car = { make: 'Kia', model: 'Seltos', year: 2024 };
const user = { name: 'Demo Dealer', email: 'demo@cars.test' };

const start = Date.now();
carEvents.emit('car-created', { car, user });
const emitTook = Date.now() - start;
assert.ok(emitTook < 50, `emit() should return immediately, took ${emitTook} ms`);
console.log(`✓ emit() returned after ${emitTook} ms while the listener is still waiting 300 ms`);

let caught = null;
carEvents.on('error', (err) => {
  caught = err;
});
carEvents.emit('car-created', { car: null, user }); // listener will throw reading car.make

setTimeout(() => {
  assert.ok(caught instanceof TypeError, 'listener error should reach the error listener');
  console.log(`✓ listener error was caught by the 'error' listener: ${caught.message}`);
  console.log('✓ process is still running — the failure did not crash it');
}, 600);
