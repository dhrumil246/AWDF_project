// Replaces users and cars with sample data:
//   npm run seed          → demo user + 6 sample cars
//   npm run seed -- 500   → also adds 500 generated cars (for cache / load testing)
// Demo login (test data only): demo@cars.test / demo12345
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Car = require('../models/Car');
const User = require('../models/User');
const sampleCars = require('../data/sampleCars');

const DEMO_USER = { name: 'Demo Dealer', email: 'demo@cars.test', password: 'demo12345' };
const EXTRA = Number(process.argv[2]) || 0;

const MODELS = {
  'Maruti Suzuki': ['Baleno', 'Brezza', 'Dzire', 'Ertiga', 'Swift'],
  Hyundai: ['Creta', 'i20', 'Venue', 'Verna'],
  Tata: ['Harrier', 'Nexon', 'Punch', 'Safari'],
  Mahindra: ['Scorpio-N', 'Thar', 'XUV700'],
  Honda: ['Amaze', 'City', 'Elevate'],
  Kia: ['Carens', 'Seltos', 'Sonet'],
  Toyota: ['Fortuner', 'Glanza', 'Innova Hycross'],
};
const FUELS = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
const pick = (list, i) => list[i % list.length];

function generateCars(count) {
  const makes = Object.keys(MODELS);
  return Array.from({ length: count }, (_, i) => {
    const make = pick(makes, i);
    return {
      make,
      model: pick(MODELS[make], Math.floor(i / makes.length)),
      year: 2015 + (i % 11),
      price: 400000 + ((i * 37500) % 2600000),
      fuelType: pick(FUELS, i),
      transmission: i % 3 === 0 ? 'Automatic' : 'Manual',
      status: i % 4 === 0 ? 'sold' : 'available',
    };
  });
}

connectDB(process.env.MONGO_URI)
  .then(async () => {
    await Promise.all([Car.deleteMany({}), User.deleteMany({})]);
    const owner = await User.create({ ...DEMO_USER, password: await bcrypt.hash(DEMO_USER.password, 10) });
    const all = [...sampleCars, ...generateCars(EXTRA)];
    const cars = await Car.insertMany(all.map((car) => ({ ...car, owner: owner._id })));
    console.log(`Seeded 1 user (${DEMO_USER.email}) and ${cars.length} cars`);
  })
  .catch((err) => {
    console.error(`Seeding failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
