const express = require('express');
const { getAllCars, getCarById, createCar, updateCar, deleteCar } = require('../controllers/carsController');
const validateId = require('../middleware/validateId');
const requireJson = require('../middleware/requireJson');

const router = express.Router();

router.get('/', getAllCars);
router.get('/:id', validateId, getCarById);
router.post('/', requireJson, createCar);
router.put('/:id', validateId, requireJson, updateCar);
router.delete('/:id', validateId, deleteCar);

module.exports = router;
