import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CarCard from '../components/CarCard';

const CURRENT_YEAR = new Date().getFullYear();

const emptyForm = {
  make: '',
  model: '',
  year: String(CURRENT_YEAR),
  fuelType: 'Petrol',
  transmission: 'Manual',
  price: '',
  status: 'available',
};

function AddCar({ onAdd }) {
  const [form, setForm] = useState(emptyForm);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const year = Number(form.year);
  const price = Number(form.price);
  const isValid =
    form.make.trim() !== '' &&
    form.model.trim() !== '' &&
    year >= 1950 &&
    year <= CURRENT_YEAR + 1 &&
    price > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onAdd({ ...form, make: form.make.trim(), model: form.model.trim(), year, price });
    navigate('/cars');
  };

  return (
    <section className="section add-car">
      <form className="form" onSubmit={handleSubmit}>
        <h2>Add a car</h2>

        <label>
          Make
          <input name="make" value={form.make} onChange={handleChange} placeholder="e.g. Hyundai" required />
        </label>
        <label>
          Model
          <input name="model" value={form.model} onChange={handleChange} placeholder="e.g. Creta" required />
        </label>
        <div className="form-row">
          <label>
            Year
            <input name="year" type="number" min="1950" max={CURRENT_YEAR + 1} value={form.year} onChange={handleChange} required />
          </label>
          <label>
            Price (₹)
            <input name="price" type="number" min="1" value={form.price} onChange={handleChange} placeholder="e.g. 1200000" required />
          </label>
        </div>
        <div className="form-row">
          <label>
            Fuel type
            <select name="fuelType" value={form.fuelType} onChange={handleChange}>
              <option>Petrol</option>
              <option>Diesel</option>
              <option>CNG</option>
              <option>Electric</option>
              <option>Hybrid</option>
            </select>
          </label>
          <label>
            Transmission
            <select name="transmission" value={form.transmission} onChange={handleChange}>
              <option>Manual</option>
              <option>Automatic</option>
            </select>
          </label>
        </div>
        <label>
          Status
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
          </select>
        </label>

        <button type="submit" className="button" disabled={!isValid}>
          Add car
        </button>
      </form>

      <aside>
        <h3>Live preview</h3>
        <CarCard
          car={{
            ...form,
            make: form.make || 'Make',
            model: form.model || 'Model',
            price: price || 0,
          }}
        />
      </aside>
    </section>
  );
}

export default AddCar;
