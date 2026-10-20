import { request } from './client';

// The browser only talks to our backend; the Gemini key never reaches the frontend.
export const generateDescription = ({ make, model, year, fuelType, transmission }) =>
  request('/api/ai/generate-description', {
    method: 'POST',
    body: { make, model, year, fuelType, transmission },
  });
