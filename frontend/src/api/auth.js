import { request } from './client';

export const register = (name, email, password) =>
  request('/auth/register', { method: 'POST', body: { name, email, password } });
export const login = (email, password) => request('/auth/login', { method: 'POST', body: { email, password } });
export const getMe = () => request('/auth/me');
