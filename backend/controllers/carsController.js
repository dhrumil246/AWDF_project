const Car = require('../models/Car');

const FIELDS = ['make', 'model', 'year', 'fuelType', 'transmission', 'price', 'status', 'registrationNumber', 'description'];

// Copy only known fields from the request body so clients cannot set _id or timestamps.
const pickFields = (body) =>
  Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

const notFound = (res, id) => res.status(404).json({ error: `Car with id ${id} not found` });

// Express 5 forwards errors from async handlers (rejected promises) to the
// global error handler automatically, so no try/catch is needed here.

async function getAllCars(req, res) {
  const cars = await Car.find().sort({ createdAt: -1 });
  res.status(200).json(cars);
}

async function getCarById(req, res) {
  const car = await Car.findById(req.params.id);
  if (!car) return notFound(res, req.params.id);
  res.status(200).json(car);
}

async function createCar(req, res) {
  const car = await Car.create(pickFields(req.body));
  res.status(201).location(`/cars/${car.id}`).json(car);
}

async function updateCar(req, res) {
  const car = await Car.findByIdAndUpdate(req.params.id, pickFields(req.body), {
    returnDocument: 'after', // return the updated document, not the old one
    runValidators: true, // enforce schema rules on updates too
  });
  if (!car) return notFound(res, req.params.id);
  res.status(200).json(car);
}

async function deleteCar(req, res) {
  const car = await Car.findByIdAndDelete(req.params.id);
  if (!car) return notFound(res, req.params.id);
  res.status(200).json({ message: 'Car deleted', car });
}

module.exports = { getAllCars, getCarById, createCar, updateCar, deleteCar };
