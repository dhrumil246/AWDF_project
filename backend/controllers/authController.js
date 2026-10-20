const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 10;

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

async function register(req, res) {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  // A duplicate email throws code 11000 → 409 in the error handler.
  const user = await User.create({ name, email, password: hashedPassword });
  res.status(201).json({ token: signToken(user), user });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  // Same message for "no such user" and "wrong password" so the response
  // does not reveal which emails are registered.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.status(200).json({ token: signToken(user), user });
}

async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ error: 'User no longer exists' });
  res.status(200).json(user);
}

module.exports = { register, login, me };
