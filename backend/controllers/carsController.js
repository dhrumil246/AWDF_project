const Car = require('../models/Car');

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

async function getAllCars(req, res) {
  const cars = await Car.find().sort({ createdAt: -1 }).populate('owner', OWNER_FIELDS);
  res.status(200).json(cars);
}

async function getCarById(req, res) {
  const car = await Car.findById(req.params.id).populate('owner', OWNER_FIELDS);
  if (!car) return notFound(res, req.params.id);
  res.status(200).json(car);
}

async function createCar(req, res) {
  const car = await Car.create({ ...pickFields(req.body), owner: req.user.id });
  await car.populate('owner', OWNER_FIELDS);
  res.status(201).location(`/cars/${car.id}`).json(car);
}

async function updateCar(req, res) {
  const car = await Car.findById(req.params.id).populate('owner', OWNER_FIELDS);
  if (!car) return notFound(res, req.params.id);
  if (!isOwner(car, req.user)) return forbidden(res);

  car.set(pickFields(req.body));
  await car.save(); // runs schema validators
  res.status(200).json(car);
}

async function deleteCar(req, res) {
  const car = await Car.findById(req.params.id).populate('owner', OWNER_FIELDS);
  if (!car) return notFound(res, req.params.id);
  if (!isOwner(car, req.user)) return forbidden(res);

  await car.deleteOne();
  res.status(200).json({ message: 'Car deleted', car });
}

module.exports = { getAllCars, getCarById, createCar, updateCar, deleteCar };
