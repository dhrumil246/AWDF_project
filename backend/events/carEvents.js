const EventEmitter = require('events');

// One shared emitter for car events. captureRejections: true means that if
// an async listener throws, the rejection is routed to this emitter's
// 'error' event instead of becoming an unhandled promise rejection.
class CarEvents extends EventEmitter {}

module.exports = new CarEvents({ captureRejections: true });
