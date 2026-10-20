// Server-side validation that runs before the controller, so malformed
// requests never reach the database. Each rule returns an error message or
// null. Returns 400 { error, details: { field: message } }.

const CURRENT_YEAR = new Date().getFullYear();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const nonEmptyString = (name) => (v) => (typeof v === 'string' && v.trim() !== '' ? null : `${name} must be a non-empty string`);
const numberBetween = (name, min, max) => (v) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? null : `${name} must be a number between ${min} and ${max}`;
const oneOf = (name, values) => (v) => (values.includes(v) ? null : `${name} must be one of: ${values.join(', ')}`);
const optionalString = (name, max) => (v) =>
  typeof v === 'string' && v.length <= max ? null : `${name} must be a string of at most ${max} characters`;

const carRules = {
  make: nonEmptyString('make'),
  model: nonEmptyString('model'),
  year: numberBetween('year', 1950, CURRENT_YEAR + 1),
  price: numberBetween('price', 0, 1e9),
  fuelType: oneOf('fuelType', ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid']),
  transmission: oneOf('transmission', ['Manual', 'Automatic']),
  status: oneOf('status', ['available', 'sold']),
  registrationNumber: optionalString('registrationNumber', 20),
  description: optionalString('description', 500),
};

function validate(rules, required) {
  return (req, res, next) => {
    const body = req.body || {};
    const details = {};

    for (const field of required) {
      if (isBlank(body[field])) details[field] = `${field} is required`;
    }
    for (const [field, rule] of Object.entries(rules)) {
      if (!details[field] && body[field] !== undefined) {
        const message = rule(body[field]);
        if (message) details[field] = message;
      }
    }
    if (required.length === 0 && !Object.keys(rules).some((f) => body[f] !== undefined)) {
      details.body = 'Provide at least one field to update';
    }

    if (Object.keys(details).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details });
    }
    next();
  };
}

const validateCreateCar = validate(carRules, ['make', 'model', 'year', 'price']);
const validateUpdateCar = validate(carRules, []);

const validateRegister = validate(
  {
    name: nonEmptyString('name'),
    email: (v) => (typeof v === 'string' && EMAIL.test(v) ? null : 'email must be a valid email address'),
    password: (v) => (typeof v === 'string' && v.length >= 8 ? null : 'password must be at least 8 characters'),
  },
  ['name', 'email', 'password'],
);

const validateLogin = validate(
  {
    email: nonEmptyString('email'),
    password: nonEmptyString('password'),
  },
  ['email', 'password'],
);

const validateDescriptionRequest = validate(
  {
    make: carRules.make,
    model: carRules.model,
    year: carRules.year,
    fuelType: carRules.fuelType,
    transmission: carRules.transmission,
  },
  ['make', 'model'],
);

module.exports = { validateCreateCar, validateUpdateCar, validateRegister, validateLogin, validateDescriptionRequest };
