import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

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

// AI Service API (running on port 8007)
const aiService = axios.create({
  baseURL: 'http://localhost:8007',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
};

// Flights API
export const flightsAPI = {
  search: (params) => api.get('/api/flights/search', { params }),
  getDetails: (id) => api.get(`/api/flights/${id}`),
  book: (data) => api.post('/api/flights/book', data),
  searchAirports: (query) => api.get('/api/flights/airports/search', { params: { q: query } }),
  getSeats: (id) => api.get(`/api/flights/${id}/seats`),
};



// Bookings API
export const bookingsAPI = {
  create: (data) => api.post('/api/bookings', data),
  getAll: (userId) => api.get(`/api/bookings/user/${userId}`),
  getDetails: (id) => api.get(`/api/bookings/${id}`),
  cancel: (id) => api.delete(`/api/bookings/${id}`),
  hold: (data) => api.post('/api/bookings/hold', data),
};

// Hotels API
export const hotelsAPI = {
  search: (params) => api.get('/api/hotels/search', { params }),
  getDetails: (id) => api.get(`/api/hotels/${id}`),
  book: (data) => api.post(`/api/hotels/${data.hotel_id}/rooms/reserve`, {
    roomCount: 1,
    ...data
  }),
  searchCities: (query) => api.get('/api/hotels/search-cities', { params: { query } }),
};

// Cars API
export const carsAPI = {
  search: (params) => {
    const queryParams = {
      location: params.pickupLocation,
      pickupDate: params.pickupDate,
      returnDate: params.dropoffDate,
      carType: 'any' // Default to 'any' as frontend doesn't have car type selector yet
    };
    return api.get('/api/cars/search', { params: queryParams });
  },
  getDetails: (id) => api.get(`/api/cars/${id}`),
  getById: (id) => api.get(`/api/cars/${id}`),
  book: ({ car_id, ...data }) => api.post(`/api/cars/${car_id}/reserve`, data),
  searchLocations: (query) => api.get('/api/cars/search-locations', { params: { q: query } }),
};

// Reviews API
export const reviewsAPI = {
  create: (data) => api.post('/api/reviews', data),
  getByEntity: (entityType, entityId, params) => api.get(`/api/reviews/${entityType}/${entityId}`, { params }),
  getMyReviews: (userId) => api.get(`/api/reviews/user/${userId}`),
  update: (id, data) => api.put(`/api/reviews/${id}`, data),
  delete: (id) => api.delete(`/api/reviews/${id}`),
  markHelpful: (id) => api.post(`/api/reviews/${id}/helpful`),
};

// Bundles API (AI Service)
export const bundlesAPI = {
  getDetails: (id) => aiService.get(`/bundles/${id}`),
};

export default api;
