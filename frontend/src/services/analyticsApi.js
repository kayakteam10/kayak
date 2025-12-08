import api from './api';

// ========== ANALYTICS API ENDPOINTS ==========

// Page Clicks Analytics
export const analyticsPageClicksAPI = {
    track: (data) => api.post('/api/analytics/track', data),
    getAll: (params) => api.get('/api/analytics/page-clicks', { params }),
    getByPage: (pageName) => api.get(`/api/analytics/page-clicks/${pageName}`)
};

// Property Clicks Analytics
export const analyticsPropertyClicksAPI = {
    getAll: (params) => api.get('/api/analytics/property-clicks', { params }),
    getSummary: () => api.get('/api/analytics/property-clicks/summary')
};

// Section Visibility Analytics
export const analyticsSectionVisibilityAPI = {
    getAll: (params) => api.get('/api/analytics/section-visibility', { params }),
    getLeastSeen: (limit = 10) => api.get(`/api/analytics/section-visibility/least-seen?limit=${limit}`)
};

// Review Analytics
export const analyticsReviewsAPI = {
    getAll: (params) => api.get('/api/analytics/review-analytics', { params }),
    getSummary: () => api.get('/api/analytics/review-analytics/summary'),
    getRatingDistribution: (propertyType) => api.get(`/api/analytics/review-analytics/rating-distribution/${propertyType}`)
};

// User Cohort Analytics
export const analyticsCohortsAPI = {
    getAll: (params) => api.get('/api/analytics/user-cohorts', { params }),
    getById: (cohortName) => api.get(`/api/analytics/user-cohorts/${encodeURIComponent(cohortName)}`),
    getComparison: (type) => api.get(`/api/analytics/user-cohorts/compare/${type}`)
};

// User Trace Analytics
export const analyticsUserTraceAPI = {
    getUserTrace: (userId) => api.get(`/api/analytics/user-trace/${userId}`),
    getCohortTrace: (cohortName, limit = 100) =>
        api.get(`/api/analytics/cohort-trace/${encodeURIComponent(cohortName)}?limit=${limit}`)
};

// Dashboard
export const analyticsDashboardAPI = {
    get: () => api.get('/api/analytics/dashboard')
};

export default {
    pageClicks: analyticsPageClicksAPI,
    propertyClicks: analyticsPropertyClicksAPI,
    sectionVisibility: analyticsSectionVisibilityAPI,
    reviews: analyticsReviewsAPI,
    cohorts: analyticsCohortsAPI,
    userTrace: analyticsUserTraceAPI,
    dashboard: analyticsDashboardAPI
};
