// Replaces users and cars with sample data: npm run seed
// Demo login (test data only): demo@cars.test / demo12345
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Car = require('../models/Car');
const User = require('../models/User');
const sampleCars = require('../data/sampleCars');

const DEMO_USER = { name: 'Demo Dealer', email: 'demo@cars.test', password: 'demo12345' };

connectDB(process.env.MONGO_URI)
  .then(async () => {
    await Promise.all([Car.deleteMany({}), User.deleteMany({})]);
    const owner = await User.create({ ...DEMO_USER, password: await bcrypt.hash(DEMO_USER.password, 10) });
    const cars = await Car.insertMany(sampleCars.map((car) => ({ ...car, owner: owner._id })));
    console.log(`Seeded 1 user (${DEMO_USER.email}) and ${cars.length} cars`);
  })
  .catch((err) => {
    console.error(`Seeding failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
