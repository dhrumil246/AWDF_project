const express = require('express');
const { register, login, me } = require('../controllers/authController');
const auth = require('../middleware/auth');
const requireJson = require('../middleware/requireJson');
const { validateRegister, validateLogin } = require('../middleware/validate');
const methodNotAllowed = require('../middleware/methodNotAllowed');

const router = express.Router();

router.post('/register', requireJson, validateRegister, register);
router.post('/login', requireJson, validateLogin, login);
router.get('/me', auth, me);

router.all('/register', methodNotAllowed(['POST']));
router.all('/login', methodNotAllowed(['POST']));
router.all('/me', methodNotAllowed(['GET']));

module.exports = router;
