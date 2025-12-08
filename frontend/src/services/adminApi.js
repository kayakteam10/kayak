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

// Admin Flights API
export const adminFlightsAPI = {
    getAll: (params) => api.get('/api/admin/flights', { params }),
    create: (data) => api.post('/api/admin/flights', data),
    update: (id, data) => api.put(`/api/admin/flights/${id}`, data),
    delete: (id) => api.delete(`/api/admin/flights/${id}`),
};

// Admin Bookings API
export const adminBookingsAPI = {
    getAll: (params) => api.get('/api/admin/bookings', { params }),
    getDetails: (id) => api.get(`/api/admin/bookings/${id}`),
    cancel: (id) => api.put(`/api/admin/bookings/${id}/cancel`),
};

// Admin Analytics API
export const adminAnalyticsAPI = {
    getOverview: () => api.get('/api/admin/analytics'),
    getSummary: (year, period) => api.get('/api/admin/analytics/summary', { params: { year, period } }),
    getRevenue: (period) => api.get('/api/admin/analytics/revenue', { params: { period } }),
    getPopularRoutes: () => api.get('/api/admin/analytics/routes'),
    getRevenueByProperty: (year, period) => api.get('/api/admin/analytics/revenue-by-property', { params: { year, period } }),
    getRevenueByCity: (year, period) => api.get('/api/admin/analytics/revenue-by-city', { params: { year, period } }),
    getTopProviders: () => api.get('/api/admin/analytics/top-providers'),
    getReviewsStats: () => api.get('/api/admin/analytics/reviews-stats'),
    getBookingTrends: (period) => api.get('/api/admin/analytics/booking-trends', { params: { period } }),
};

// Admin Users API
export const adminUsersAPI = {
    getAll: (params) => api.get('/api/admin/users', { params }),
};

// Admin Hotels API
export const adminHotelsAPI = {
    getAll: (params) => api.get('/api/admin/hotels', { params }),
    update: (id, data) => api.put(`/api/admin/hotels/${id}`, data),
    delete: (id) => api.delete(`/api/admin/hotels/${id}`),
};

// Admin Cars API
export const adminCarsAPI = {
    getAll: (params) => api.get('/api/admin/cars', { params }),
    update: (id, data) => api.put(`/api/admin/cars/${id}`, data),
    delete: (id) => api.delete(`/api/admin/cars/${id}`),
};

export default api;
