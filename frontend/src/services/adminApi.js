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

// Admin Flights API
export const adminFlightsAPI = {
    getAll: () => api.get('/api/admin/flights'),
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
    getRevenue: (period) => api.get('/api/admin/analytics/revenue', { params: { period } }),
    getPopularRoutes: () => api.get('/api/admin/analytics/routes'),
};

export default api;
