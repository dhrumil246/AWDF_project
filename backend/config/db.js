const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy .env.example to .env and add your MongoDB connection string.');
  }
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = connectDB;
