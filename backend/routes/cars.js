const express = require('express');
const { getAllCars, getCarById, createCar, updateCar, deleteCar } = require('../controllers/carsController');
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const requireJson = require('../middleware/requireJson');
const { validateCreateCar, validateUpdateCar } = require('../middleware/validate');
const methodNotAllowed = require('../middleware/methodNotAllowed');

const router = express.Router();

// Every car route requires a valid JWT.
// Pipeline per request: auth → id check → content-type → validation → controller
router.use(auth);

router.get('/', getAllCars);
router.get('/:id', validateId, getCarById);
router.post('/', requireJson, validateCreateCar, createCar);
// PUT sends the full car (required fields must be present); PATCH changes only
// the fields it contains.
router.put('/:id', validateId, requireJson, validateCreateCar, updateCar);
router.patch('/:id', validateId, requireJson, validateUpdateCar, updateCar);
router.delete('/:id', validateId, deleteCar);

// Any other method on these URLs: 405 + Allow header.
router.all('/', methodNotAllowed(['GET', 'POST']));
router.all('/:id', methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE']));

module.exports = router;
