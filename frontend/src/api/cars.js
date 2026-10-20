import { request } from './client';

export const getCars = (signal) => request('/cars', { signal });
export const createCar = (car) => request('/cars', { method: 'POST', body: car });
export const updateCar = (id, changes) => request(`/cars/${id}`, { method: 'PUT', body: changes });
export const deleteCar = (id) => request(`/cars/${id}`, { method: 'DELETE' });
