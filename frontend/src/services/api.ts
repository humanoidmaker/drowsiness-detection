import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const register = (data: { name: string; email: string; password: string }) => api.post('/auth/register', data);
export const login = (data: { email: string; password: string }) => api.post('/auth/login', data);
export const verifyEmail = (token: string) => api.post('/auth/verify-email', { token });
export const forgotPassword = (email: string) => api.post('/auth/forgot-password', { email });
export const resetPassword = (data: { token: string; password: string }) => api.post('/auth/reset-password', data);
export const getMe = () => api.get('/auth/me');

// Detection
export const detectFrame = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/detect/frame', fd);
};
export const getSession = () => api.get('/detect/session');
export const startSession = () => api.post('/detect/session/start');
export const endSession = () => api.post('/detect/session/end');
export const getHistory = (skip = 0, limit = 20) => api.get(`/detect/history?skip=${skip}&limit=${limit}`);
export const getDetectStats = () => api.get('/detect/stats');

// Settings
export const getSettings = () => api.get('/settings/');
export const updateSettings = (data: Record<string, any>) => api.put('/settings/', data);

export default api;
