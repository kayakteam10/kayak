import api from './api';

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

export default {
    trackPageView,
    trackPropertyClick,
    trackSectionView
};
