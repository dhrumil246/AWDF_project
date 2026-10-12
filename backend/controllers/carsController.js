const cars = require('../data/cars');

let nextId = cars.length + 1;

const FIELDS = ['make', 'model', 'year', 'fuelType', 'transmission', 'price', 'status'];

// Copy only known fields from the request body so clients cannot set `id`.
const pickFields = (body) =>
  Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

const findIndex = (id) => cars.findIndex((c) => c.id === Number(id));

const notFound = (res, id) => res.status(404).json({ error: `Car with id ${id} not found` });

function getAllCars(req, res) {
  res.status(200).json(cars);
}

function getCarById(req, res) {
  const index = findIndex(req.params.id);
  if (index === -1) return notFound(res, req.params.id);
  res.status(200).json(cars[index]);
}

function createCar(req, res) {
  const { make, model } = req.body;
  if (!make || !model) {
    return res.status(400).json({ error: 'make and model are required' });
  }
  const car = { id: nextId++, status: 'available', ...pickFields(req.body) };
  cars.push(car);
  res.status(201).location(`/cars/${car.id}`).json(car);
}

function updateCar(req, res) {
  const index = findIndex(req.params.id);
  if (index === -1) return notFound(res, req.params.id);
  cars[index] = { ...cars[index], ...pickFields(req.body) };
  res.status(200).json(cars[index]);
}

function deleteCar(req, res) {
  const index = findIndex(req.params.id);
  if (index === -1) return notFound(res, req.params.id);
  const [removed] = cars.splice(index, 1);
  res.status(200).json({ message: 'Car deleted', car: removed });
}

module.exports = { getAllCars, getCarById, createCar, updateCar, deleteCar };
