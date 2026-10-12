// Temporary in-memory storage (replaced by MongoDB in Practical 5).
const cars = [
  { id: 1, make: 'Maruti Suzuki', model: 'Swift', year: 2022, fuelType: 'Petrol', transmission: 'Manual', price: 650000, status: 'available' },
  { id: 2, make: 'Hyundai', model: 'Creta', year: 2023, fuelType: 'Diesel', transmission: 'Automatic', price: 1450000, status: 'available' },
  { id: 3, make: 'Tata', model: 'Nexon EV', year: 2024, fuelType: 'Electric', transmission: 'Automatic', price: 1550000, status: 'sold' },
];

module.exports = cars;
