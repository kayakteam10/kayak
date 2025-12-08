import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';

// Hook to automatically track page views
export const usePageTracking = () => {
    const location = useLocation();

    useEffect(() => {
        // Extract page name from pathname
        const pageName = location.pathname === '/' ? 'home' : location.pathname.split('/')[1] || 'unknown';

        // Track page view
        trackPageView(pageName);
    }, [location]);
};
