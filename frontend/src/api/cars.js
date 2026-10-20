import { request } from './client';

export const getCars = (signal) => request('/cars', { signal });
export const createCar = (car) => request('/cars', { method: 'POST', body: car });
// PUT replaces the whole car (the edit form sends every field);
// PATCH changes only the fields given (e.g. the status toggle).
export const updateCar = (id, car) => request(`/cars/${id}`, { method: 'PUT', body: car });
export const patchCar = (id, changes) => request(`/cars/${id}`, { method: 'PATCH', body: changes });
export const deleteCar = (id) => request(`/cars/${id}`, { method: 'DELETE' });
