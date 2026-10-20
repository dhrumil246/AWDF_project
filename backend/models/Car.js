const mongoose = require('mongoose');

const CURRENT_YEAR = new Date().getFullYear();

const carSchema = new mongoose.Schema(
  {
    make: { type: String, required: [true, 'make is required'], trim: true },
    model: { type: String, required: [true, 'model is required'], trim: true },
    year: {
      type: Number,
      required: [true, 'year is required'],
      min: [1950, 'year must be 1950 or later'],
      max: [CURRENT_YEAR + 1, `year cannot be after ${CURRENT_YEAR + 1}`],
    },
    price: { type: Number, required: [true, 'price is required'], min: [0, 'price cannot be negative'] },
    fuelType: {
      type: String,
      enum: { values: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'], message: '{VALUE} is not a valid fuelType' },
      default: 'Petrol',
    },
    transmission: {
      type: String,
      enum: { values: ['Manual', 'Automatic'], message: '{VALUE} is not a valid transmission' },
      default: 'Manual',
    },
    status: {
      type: String,
      enum: { values: ['available', 'sold'], message: '{VALUE} is not a valid status' },
      default: 'available',
    },
    // Optional, but unique when present ("GJ 01 AB 1234" is stored as "GJ01AB1234").
    registrationNumber: {
      type: String,
      unique: true,
      sparse: true,
      set: (v) => (v ? v.replace(/\s+/g, '').toUpperCase() : undefined),
    },
    description: { type: String, trim: true, maxlength: [500, 'description is limited to 500 characters'] },
    // The user who listed the car; only they may update or delete it.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: {
      virtuals: true, // expose `id` instead of `_id`
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id;
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('Car', carSchema);
