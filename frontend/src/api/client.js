// Shared fetch wrapper for the backend: base URL, JSON, auth header, errors.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

let authToken = null;
let onUnauthorized = null;

export const setAuthToken = (token) => {
  authToken = token;
};

// Called when a request with a token gets 401 (expired or invalid token).
export const setOnUnauthorized = (handler) => {
  onUnauthorized = handler;
};

export async function request(path, { body, ...options } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);

  if (res.status === 401 && authToken && onUnauthorized) onUnauthorized();

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.details = data?.details; // per-field validation messages from the API
    throw error;
  }
  return data;
}
