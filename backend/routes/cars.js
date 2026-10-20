const express = require('express');
const { getAllCars, getCarById, createCar, updateCar, deleteCar } = require('../controllers/carsController');
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const requireJson = require('../middleware/requireJson');
const { validateCreateCar, validateUpdateCar } = require('../middleware/validate');

const router = express.Router();

// Every car route requires a valid JWT.
// Pipeline per request: auth → id check → content-type → validation → controller
router.use(auth);

router.get('/', getAllCars);
router.get('/:id', validateId, getCarById);
router.post('/', requireJson, validateCreateCar, createCar);
router.put('/:id', validateId, requireJson, validateUpdateCar, updateCar);
router.delete('/:id', validateId, deleteCar);

module.exports = router;
