// Replaces the cars collection with sample data: npm run seed
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Car = require('../models/Car');
const sampleCars = require('../data/sampleCars');

connectDB(process.env.MONGO_URI)
  .then(async () => {
    await Car.deleteMany({});
    const cars = await Car.insertMany(sampleCars);
    console.log(`Seeded ${cars.length} cars`);
  })
  .catch((err) => {
    console.error(`Seeding failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
