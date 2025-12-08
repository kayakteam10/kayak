import api from '../services/api';

// Track page clicks/views
export const trackPageView = async (page, section = 'general') => {
    try {
        await api.post('/api/analytics/track', {
            type: 'page_click',
            page,
            section,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Analytics tracking error:', error);
    }
};

// Track property clicks (hotels, flights, cars)
export const trackPropertyClick = async (propertyId, propertyName, propertyType) => {
    try {
        await api.post('/api/analytics/track', {
            type: 'property_click',
            property_id: propertyId,
            property_name: propertyName,
            property_type: propertyType,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Analytics tracking error:', error);
    }
};

// Track section visibility (for least-seen tracking)
export const trackSectionView = async (page, section, visibilityScore) => {
    try {
        await api.post('/api/analytics/track', {
            type: 'section_view',
            page,
            section,
            visibility_score: visibilityScore,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Analytics tracking error:', error);
    }
};

// Track user activity (login, booking, etc.)
export const trackUserActivity = async (activityType, details = {}) => {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) return; // Only track for logged-in users

        await api.post('/api/analytics/track', {
            type: 'user_activity',
            user_id: userId,
            activity_type: activityType,
            details,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Analytics tracking error:', error);
    }
};

// Track search events
export const trackSearch = async (searchType, searchParams) => {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) return; // Only track for logged-in users

        await api.post('/api/analytics/track', {
            type: 'search',
            user_id: userId,
            search_type: searchType,
            search_params: searchParams,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Analytics tracking error:', error);
    }
};

export default {
    trackPageView,
    trackPropertyClick,
    trackSectionView,
    trackUserActivity,
    trackSearch
};
