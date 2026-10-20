import { useState } from 'react';
import CarCard from './CarCard';
import { generateDescription } from '../api/ai';

const CURRENT_YEAR = new Date().getFullYear();

const emptyForm = {
  make: '',
  model: '',
  year: String(CURRENT_YEAR),
  fuelType: 'Petrol',
  transmission: 'Manual',
  price: '',
  status: 'available',
  registrationNumber: '',
  description: '',
};

// Turn a car from the API into string values for the inputs.
const toForm = (car) => ({
  ...emptyForm,
  ...car,
  year: String(car.year),
  price: String(car.price),
  registrationNumber: car.registrationNumber || '',
  description: car.description || '',
});

function CarForm({ title, initialCar, submitLabel, onSubmit }) {
  const [form, setForm] = useState(initialCar ? toForm(initialCar) : emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  // AI suggestion state: 'idle' | 'loading' | 'done' | 'unavailable'
  const [ai, setAi] = useState({ status: 'idle', message: '' });

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

  const canAskAi = form.make.trim() !== '' && form.model.trim() !== '' && ai.status !== 'loading';

  const handleGenerate = async () => {
    setAi({ status: 'loading', message: '' });
    try {
      const result = await generateDescription({
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number(form.year) || undefined,
        fuelType: form.fuelType,
        transmission: form.transmission,
      });
      if (result.fallback) {
        setAi({ status: 'unavailable', message: result.message });
      } else {
        // Put the suggestion in the textarea; the user can still edit or delete it.
        setForm((prev) => ({ ...prev, description: result.description }));
        setAi({ status: 'done', message: '' });
      }
    } catch (err) {
      // e.g. 429 rate limit or network error: the form keeps working without AI
      setAi({ status: 'unavailable', message: err.message });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    const { registrationNumber, ...rest } = form;
    const car = { ...rest, make: form.make.trim(), model: form.model.trim(), year, price };
    if (registrationNumber.trim()) car.registrationNumber = registrationNumber;

    setSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(car); // the parent navigates away on success
    } catch (err) {
      setServerError(err);
      setSubmitting(false);
    }
  };

  return (
    <section className="section add-car">
      <form className="form" onSubmit={handleSubmit}>
        <h2>{title}</h2>

        {serverError && (
          <div className="error" role="alert">
            <p>{serverError.message}</p>
            {serverError.details && (
              <ul>
                {Object.entries(serverError.details).map(([field, msg]) => (
                  <li key={field}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}

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
        <div className="form-row">
          <label>
            Status
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
            </select>
          </label>
          <label>
            Registration no. (optional)
            <input name="registrationNumber" value={form.registrationNumber} onChange={handleChange} placeholder="e.g. GJ 01 AB 1234" />
          </label>
        </div>
        <label>
          <span className="label-row">
            Description (optional)
            <button type="button" className="action ai-button" onClick={handleGenerate} disabled={!canAskAi}>
              {ai.status === 'loading' ? 'Generating...' : '✨ Generate with AI'}
            </button>
          </span>
          <textarea
            name="description"
            rows={4}
            maxLength={500}
            value={form.description}
            onChange={handleChange}
            placeholder={canAskAi || form.make ? '' : 'Enter make and model to get an AI suggestion'}
          />
        </label>
        {ai.status === 'done' && (
          <p className="ai-note">AI-generated suggestion — review and edit it before saving.</p>
        )}
        {ai.status === 'unavailable' && <p className="ai-note ai-note-warn">{ai.message}</p>}

        <button type="submit" className="button" disabled={!isValid || submitting}>
          {submitting ? 'Saving...' : submitLabel}
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

export default CarForm;
