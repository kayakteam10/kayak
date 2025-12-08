const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { sendAnalyticsEvent } = require('../events/kafka');

// MongoDB connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongodb:27017';
const MONGO_DB = 'kayak_db';

let mongoClient;
let db;

// Initialize MongoDB connection
async function initMongo() {
    try {
        if (!mongoClient) {
            console.log(`Connecting to MongoDB at ${MONGO_URL}...`);
            mongoClient = new MongoClient(MONGO_URL, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 10000,
            });
            await mongoClient.connect();
            db = mongoClient.db(MONGO_DB);
            console.log('✅ MongoDB connected for analytics');
        }
        if (!db) {
            throw new Error('MongoDB database instance is null');
        }
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        // Reset client to allow retry on next request
        mongoClient = null;
        db = null;
        throw new Error(`MongoDB connection failed: ${error.message}`);
    }
}

// ========== 0. TRACKING ENDPOINT (RECEIVE EVENTS) ==========
router.post('/track', async (req, res) => {
    try {
        const event = req.body;
        // event: { type, page, section, property_id, etc. }

        // Send to Kafka (Async processing)
        await sendAnalyticsEvent(event);

        res.json({ success: true, message: 'Event queued' });
    } catch (error) {
        console.error('Tracking error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== 1. PAGE CLICKS ANALYTICS ==========
router.get('/page-clicks', async (req, res) => {
    try {
        const db = await initMongo();
        const { page, groupBy } = req.query;

        let pipeline = [];

        if (page) {
            pipeline.push({ $match: { page } });
        }

        if (groupBy === 'page') {
            // Group by page
            pipeline.push({
                $group: {
                    _id: '$page',
                    totalClicks: { $sum: '$clicks' },
                    uniqueUsers: { $sum: '$unique_users' },
                    sections: { $push: { section: '$section', clicks: '$clicks' } }
                }
            });
            pipeline.push({ $sort: { totalClicks: -1 } });
        } else if (groupBy === 'section') {
            // Group by section within pages
            pipeline.push({
                $group: {
                    _id: { page: '$page', section: '$section' },
                    clicks: { $sum: '$clicks' },
                    uniqueUsers: { $sum: '$unique_users' }
                }
            });
            pipeline.push({ $sort: { clicks: -1 } });
        } else {
            // Return all data
            pipeline.push({ $sort: { clicks: -1 } });
        }

        const data = await db.collection('page_clicks').aggregate(pipeline).toArray();

        res.json({
            success: true,
            data,
            total: data.length
        });
    } catch (error) {
        console.error('Page clicks analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get page clicks by page name
router.get('/page-clicks/:pageName', async (req, res) => {
    try {
        const db = await initMongo();
        const { pageName } = req.params;

        const data = await db.collection('page_clicks')
            .find({ page: pageName })
            .sort({ clicks: -1 })
            .toArray();

        res.json({
            success: true,
            page: pageName,
            data,
            total: data.length
        });
    } catch (error) {
        console.error('Page clicks by page error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== 2. PROPERTY/LISTING CLICKS ANALYTICS ==========
router.get('/property-clicks', async (req, res) => {
    try {
        const db = await initMongo();
        const { propertyType, limit = 20, sortBy = 'clicks' } = req.query;

        let query = {};
        if (propertyType) {
            query.property_type = propertyType;
        }

        const sortField = sortBy === 'conversion' ? 'conversion_rate' : 'clicks';
        const sortOrder = -1;

        const data = await db.collection('property_clicks')
            .find(query)
            .sort({ [sortField]: sortOrder })
            .limit(parseInt(limit))
            .toArray();

        res.json({
            success: true,
            data,
            total: data.length,
            propertyType: propertyType || 'all'
        });
    } catch (error) {
        console.error('Property clicks analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get property stats summary
router.get('/property-clicks/summary', async (req, res) => {
    try {
        const db = await initMongo();

        const summary = await db.collection('property_clicks').aggregate([
            {
                $group: {
                    _id: '$property_type',
                    totalClicks: { $sum: '$clicks' },
                    totalUsers: { $sum: '$unique_users' },
                    totalBookings: { $sum: '$bookings' },
                    avgConversion: { $avg: { $toDouble: '$conversion_rate' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalClicks: -1 } }
        ]).toArray();

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Property summary error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== 3. SECTION VISIBILITY / LEAST SEEN SECTIONS ==========
router.get('/section-visibility', async (req, res) => {
    try {
        const db = await initMongo();
        const { page, sortBy = 'visibility_score', order = 'asc' } = req.query;

        let query = {};
        if (page) {
            query.page = page;
        }

        const sortOrder = order === 'desc' ? -1 : 1;

        const data = await db.collection('section_visibility')
            .find(query)
            .sort({ [sortBy]: sortOrder })
            .toArray();

        res.json({
            success: true,
            data,
            total: data.length
        });
    } catch (error) {
        console.error('Section visibility error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get least seen sections
router.get('/section-visibility/least-seen', async (req, res) => {
    try {
        const db = await initMongo();
        const { limit = 10 } = req.query;

        const data = await db.collection('section_visibility')
            .find()
            .sort({ visibility_score: 1 })
            .limit(parseInt(limit))
            .toArray();

        res.json({
            success: true,
            message: 'Least seen sections (lowest visibility scores)',
            data,
            total: data.length
        });
    } catch (error) {
        console.error('Least seen sections error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== 4. REVIEW ANALYTICS ==========
router.get('/review-analytics', async (req, res) => {
    try {
        const db = await initMongo();
        const { propertyType, propertyId, sortBy = 'avg_rating', order = 'desc', limit = 50 } = req.query;

        let query = {};
        if (propertyType) {
            query.property_type = propertyType;
        }
        if (propertyId) {
            query.property_id = parseInt(propertyId);
        }

        const sortOrder = order === 'desc' ? -1 : 1;

        const data = await db.collection('review_analytics')
            .find(query)
            .sort({ [sortBy]: sortOrder })
            .limit(parseInt(limit))
            .toArray();

        res.json({
            success: true,
            data,
            total: data.length
        });
    } catch (error) {
        console.error('Review analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get review summary by property type
router.get('/review-analytics/summary', async (req, res) => {
    try {
        const db = await initMongo();

        const summary = await db.collection('review_analytics').aggregate([
            {
                $group: {
                    _id: '$property_type',
                    totalReviews: { $sum: '$total_reviews' },
                    avgRating: { $avg: { $toDouble: '$avg_rating' } },
                    avgSentiment: { $avg: { $toDouble: '$sentiment_score' } },
                    propertyCount: { $sum: 1 }
                }
            },
            { $sort: { avgRating: -1 } }
        ]).toArray();

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Review summary error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get rating distribution for a property type
router.get('/review-analytics/rating-distribution/:propertyType', async (req, res) => {
    try {
        const db = await initMongo();
        const { propertyType } = req.params;

        const data = await db.collection('review_analytics')
            .find({ property_type: propertyType })
            .toArray();

        // Aggregate rating distribution
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let totalReviews = 0;

        data.forEach(item => {
            if (item.rating_distribution) {
                distribution[5] += item.rating_distribution[5] || 0;
                distribution[4] += item.rating_distribution[4] || 0;
                distribution[3] += item.rating_distribution[3] || 0;
                distribution[2] += item.rating_distribution[2] || 0;
                distribution[1] += item.rating_distribution[1] || 0;
                totalReviews += item.total_reviews;
            }
        });

        res.json({
            success: true,
            propertyType,
            totalReviews,
            distribution,
            percentages: {
                5: ((distribution[5] / totalReviews) * 100).toFixed(1),
                4: ((distribution[4] / totalReviews) * 100).toFixed(1),
                3: ((distribution[3] / totalReviews) * 100).toFixed(1),
                2: ((distribution[2] / totalReviews) * 100).toFixed(1),
                1: ((distribution[1] / totalReviews) * 100).toFixed(1)
            }
        });
    } catch (error) {
        console.error('Rating distribution error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== 5. USER TRACE DIAGRAM DATA ==========
router.get('/user-trace/:userId', async (req, res) => {
    try {
        const db = await initMongo();
        const { userId } = req.params;
        const userIdNum = parseInt(userId);

        // Get user activity timeline
        const activities = await db.collection('activity_logs')
            .find({ user_id: userIdNum })
            .sort({ timestamp: 1 })
            .toArray();

        // Get user searches
        const searches = await db.collection('search_history')
            .find({ user_id: userIdNum })
            .sort({ timestamp: 1 })
            .toArray();

        // Get user preferences
        const preferences = await db.collection('user_preferences')
            .findOne({ user_id: userIdNum });

        // Combine into timeline
        const timeline = [
            ...activities.map(a => ({ ...a, event_type: 'activity' })),
            ...searches.map(s => ({ ...s, event_type: 'search' }))
        ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.json({
            success: true,
            userId: userIdNum,
            preferences,
            timeline,
            stats: {
                totalActivities: activities.length,
                totalSearches: searches.length,
                bookings: activities.filter(a => a.activity_type === 'booking_created').length,
                logins: activities.filter(a => a.activity_type === 'login').length
            }
        });
    } catch (error) {
        console.error('User trace error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get cohort trace (e.g., all users from San Jose, CA)
router.get('/cohort-trace/:cohortName', async (req, res) => {
    try {
        const db = await initMongo();
        const { cohortName } = req.params;
        const { limit = 100 } = req.query;

        // Get cohort info
        const cohort = await db.collection('user_cohorts')
            .findOne({ cohort_name: cohortName });

        if (!cohort) {
            return res.status(404).json({ success: false, error: 'Cohort not found' });
        }

        // For location cohorts, get activity by city
        let activities = [];
        if (cohort.cohort_type === 'location' && cohort.city) {
            activities = await db.collection('activity_logs')
                .find({ 'location.city': cohort.city })
                .sort({ timestamp: -1 })
                .limit(parseInt(limit))
                .toArray();
        }

        // Group by activity type
        const activityBreakdown = {};
        activities.forEach(act => {
            const type = act.activity_type || 'unknown';
            activityBreakdown[type] = (activityBreakdown[type] || 0) + 1;
        });

        res.json({
            success: true,
            cohort: cohort.cohort_name,
            cohortInfo: cohort,
            activities,
            activityBreakdown,
            totalActivities: activities.length
        });
    } catch (error) {
        console.error('Cohort trace error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== 6. COMPREHENSIVE ANALYTICS DASHBOARD DATA ==========
router.get('/dashboard', async (req, res) => {
    try {
        const db = await initMongo();

        // Get top metrics
        const [
            topPages,
            topProperties,
            leastSeen,
            reviewSummary,
            topCohorts
        ] = await Promise.all([
            db.collection('page_clicks').aggregate([
                { $group: { _id: '$page', totalClicks: { $sum: '$clicks' } } },
                { $sort: { totalClicks: -1 } },
                { $limit: 5 }
            ]).toArray(),

            db.collection('property_clicks').find().sort({ clicks: -1 }).limit(10).toArray(),

            db.collection('section_visibility').find().sort({ visibility_score: 1 }).limit(5).toArray(),

            db.collection('review_analytics').aggregate([
                {
                    $group: {
                        _id: null,
                        totalReviews: { $sum: '$total_reviews' },
                        avgRating: { $avg: { $toDouble: '$avg_rating' } }
                    }
                }
            ]).toArray(),

            db.collection('user_cohorts').find().sort({ total_bookings: -1 }).limit(5).toArray()
        ]);

        res.json({
            success: true,
            dashboard: {
                topPages,
                topProperties,
                leastSeenSections: leastSeen,
                reviewSummary: reviewSummary[0] || {},
                topCohorts
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
