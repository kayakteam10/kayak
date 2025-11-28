import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8089';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  updateMe: (data) => api.put('/api/auth/me', data),
};

// Flights API
export const flightsAPI = {
  search: (params) => api.get('/api/flights/search', { params }),
  getDetails: (id) => api.get(`/api/flights/${id}`),
  book: (data) => api.post('/api/flights/book', data),
  searchAirports: (query) => api.get('/api/flights/airports/search', { params: { query } }),
};

// Hotels API
export const hotelsAPI = {
  search: (params) => api.get('/api/hotels/search', { params }),
  getDetails: (id) => api.get(`/api/hotels/${id}`),
  book: (data) => api.post('/api/hotels/book', data),
};

// Cars API
export const carsAPI = {
  search: (params) => api.get('/api/cars/search', { params }),
  getDetails: (id) => api.get(`/api/cars/${id}`),
  book: (data) => api.post('/api/cars/book', data),
};

// Bookings API
export const bookingsAPI = {
  getAll: () => api.get('/api/bookings'),
  getDetails: (id) => api.get(`/api/bookings/${id}`),
  cancel: (id) => api.delete(`/api/bookings/${id}`),
  hold: (data) => api.post('/api/bookings/hold', data),
};

// Reviews API
export const reviewsAPI = {
  create: (data) => api.post('/api/reviews', data),
  getByEntity: (entityType, entityId, params) => api.get(`/api/reviews/${entityType}/${entityId}`, { params }),
  getMyReviews: () => api.get('/api/reviews/user/my-reviews'),
  update: (id, data) => api.put(`/api/reviews/${id}`, data),
  delete: (id) => api.delete(`/api/reviews/${id}`),
  markHelpful: (id) => api.post(`/api/reviews/${id}/helpful`),
};

export default api;
