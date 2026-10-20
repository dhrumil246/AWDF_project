const Car = require('../models/Car');
const { cache, keys, isEnabled } = require('../cache');
const carEvents = require('../events/carEvents');
const { withLinks } = require('../links');

const FIELDS = ['make', 'model', 'year', 'fuelType', 'transmission', 'price', 'status', 'registrationNumber', 'description'];

// Copy only known fields from the request body so clients cannot set _id,
// owner or timestamps.
const pickFields = (body) =>
  Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

const notFound = (res, id) => res.status(404).json({ error: `Car with id ${id} not found` });

const OWNER_FIELDS = 'name';

// Logged in is enough to read; only the user who listed a car may change it.
const isOwner = (car, user) => car.owner && car.owner._id.equals(user.id);
const forbidden = (res) => res.status(403).json({ error: 'You can only modify cars you listed' });

// Express 5 forwards errors from async handlers (rejected promises) to the
// global error handler automatically, so no try/catch is needed here.

// Every logged-in user sees the same car list, so one cache key is safe.
// X-Cache tells the client whether the response came from the cache.
async function getAllCars(req, res) {
  if (isEnabled()) {
    const cached = cache.get(keys.allCars);
    if (cached) return res.set('X-Cache', 'HIT').status(200).json(cached);
  }

  const docs = await Car.find().sort({ createdAt: -1 }).populate('owner', OWNER_FIELDS);
  const cars = docs.map((doc) => doc.toJSON()); // store plain objects, not Mongoose documents

  if (isEnabled()) cache.set(keys.allCars, cars);
  res.set('X-Cache', isEnabled() ? 'MISS' : 'BYPASS').status(200).json(cars);
}

async function getCarById(req, res) {
  const key = keys.car(req.params.id);
  if (isEnabled()) {
    const cached = cache.get(key);
    if (cached) return res.set('X-Cache', 'HIT').status(200).json(withLinks(cached, req.user));
  }

  const doc = await Car.findById(req.params.id).populate('owner', OWNER_FIELDS);
  if (!doc) return notFound(res, req.params.id); // 404s are not cached
  const car = doc.toJSON();

  if (isEnabled()) cache.set(key, car); // cached without _links: they depend on who asks
  res.set('X-Cache', isEnabled() ? 'MISS' : 'BYPASS').status(200).json(withLinks(car, req.user));
}

// Called after every successful write so a stale list or car is never served.
const invalidate = (id) => cache.del(id ? [keys.allCars, keys.car(id)] : [keys.allCars]);

async function createCar(req, res) {
  const car = await Car.create({ ...pickFields(req.body), owner: req.user.id });
  await car.populate('owner', OWNER_FIELDS);
  invalidate();

  // Respond first, then hand the side effect to the event listeners.
  res.status(201).location(`/cars/${car.id}`).json(withLinks(car.toJSON(), req.user));
  console.log(`[API] 201 response sent at ${new Date().toISOString()}`);
  carEvents.emit('car-created', { car: car.toJSON(), user: req.user });
}

async function updateCar(req, res) {
  const car = await Car.findById(req.params.id).populate('owner', OWNER_FIELDS);
  if (!car) return notFound(res, req.params.id);
  if (!isOwner(car, req.user)) return forbidden(res);

  car.set(pickFields(req.body));
  await car.save(); // runs schema validators
  invalidate(car.id);
  res.status(200).json(withLinks(car.toJSON(), req.user));
}

async function deleteCar(req, res) {
  const car = await Car.findById(req.params.id).populate('owner', OWNER_FIELDS);
  if (!car) return notFound(res, req.params.id);
  if (!isOwner(car, req.user)) return forbidden(res);

  await car.deleteOne();
  invalidate(car.id);

  res.status(200).json({ message: 'Car deleted', car });
  carEvents.emit('car-deleted', { car: car.toJSON(), user: req.user });
}

module.exports = { getAllCars, getCarById, createCar, updateCar, deleteCar };
