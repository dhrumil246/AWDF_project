// Single place for the backend URL and all car API calls.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

async function request(path, { body, ...options } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed with status ${res.status}`);
    error.details = data?.details; // per-field validation messages from the API
    throw error;
  }
  return data;
}

export const getCars = (signal) => request('/cars', { signal });
export const createCar = (car) => request('/cars', { method: 'POST', body: car });
export const updateCar = (id, changes) => request(`/cars/${id}`, { method: 'PUT', body: changes });
export const deleteCar = (id) => request(`/cars/${id}`, { method: 'DELETE' });
