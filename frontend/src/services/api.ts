import axios from 'axios';

export const resolvedBase = (() => {
  const v = (import.meta as any).env?.VITE_API_URL;
  if (v && v !== 'undefined' && v !== 'null') return v as string;
  // default to same-origin origin (no path). Use absolute paths like /api/... in requests.
  return window.location.origin;
})();

const api = axios.create({
  baseURL: resolvedBase,
  withCredentials: true,
});

let accessToken: string | null = (typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null);

export function setAccessToken(token: string | null) {
  accessToken = token;
  try {
    if (token) sessionStorage.setItem('accessToken', token);
    else sessionStorage.removeItem('accessToken');
  } catch {}
}

api.interceptors.request.use(async (config) => {
  if (accessToken) {
    (config.headers as any) = config.headers || {};
    (config.headers as any)['Authorization'] = `Bearer ${accessToken}`;
  }
  return config;
});

export default api;
