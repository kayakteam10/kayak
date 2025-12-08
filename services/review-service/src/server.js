/**
 * Review Service - Simplified MongoDB-based microservice
 * 
 * This service is intentionally simplified due to time constraints.
 * It demonstrates MongoDB operations and can be enhanced later.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const logger = require('./utils/logger');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

let db = null;
let reviewsCollection = null;

// Service URLs
const HOTEL_SERVICE_URL = process.env.HOTEL_SERVICE_URL || 'http://hotel-service:8002';
const CAR_SERVICE_URL = process.env.CAR_SERVICE_URL || 'http://car-service:8003';
const FLIGHT_SERVICE_URL = process.env.FLIGHT_SERVICE_URL || 'http://flight-service:8001';

// Function to enrich reviews with entity details
async function enrichReviewsWithEntityDetails(reviews) {
    const enrichedReviews = await Promise.all(reviews.map(async (review) => {
        // If review already has entity details, return as is
        if (review.entity_name) {
            return review;
        }

        // Determine listing type and ID (handle both old and new schema)
        const listingType = review.listing_type || review.entity_type;
        const listingId = review.listing_id || review.entity_id;

        if (!listingType || !listingId) {
            return review;
        }

        try {
            let entityDetails = {};

            // Fetch entity details based on type
            if (listingType === 'hotel') {
                const response = await axios.get(`${HOTEL_SERVICE_URL}/hotels/${listingId}`, { timeout: 2000 });
                const hotel = response.data;
                entityDetails = {
                    entity_name: hotel.name,
                    entity_address: hotel.address,
                    entity_city: hotel.city
                };
            } else if (listingType === 'car') {
                const response = await axios.get(`${CAR_SERVICE_URL}/cars/${listingId}`, { timeout: 2000 });
                const car = response.data;
                entityDetails = {
                    entity_name: `${car.make} ${car.model}`,
                    entity_address: car.location,
                    entity_city: car.city
                };
            } else if (listingType === 'flight') {
                const response = await axios.get(`${FLIGHT_SERVICE_URL}/flights/${listingId}`, { timeout: 2000 });
                const flight = response.data;
                entityDetails = {
                    entity_name: `${flight.airline} ${flight.flight_number}`,
                    entity_address: `${flight.origin} → ${flight.destination}`,
                    entity_city: flight.destination
                };
            }

            // Merge entity details into review
            return { ...review, ...entityDetails };
        } catch (error) {
            logger.warn(`Failed to fetch entity details for ${listingType} ${listingId}: ${error.message}`);
            return review; // Return original review if fetch fails
        }
    }));

    return enrichedReviews;
}

// MongoDB connection
async function connectMongoDB() {
    try {
        const uri = process.env.MONGO_URL || 'mongodb://localhost:27017';
        const client = new MongoClient(uri);
        await client.connect();
        db = client.db(process.env.MONGO_DB_NAME || 'kayak_db');
        reviewsCollection = db.collection('reviews');

        // Create indexes
        await reviewsCollection.createIndex({ listing_type: 1, listing_id: 1 });
        await reviewsCollection.createIndex({ user_id: 1 });

        logger.info('✅ MongoDB connected');
    } catch (error) {
        logger.error(`❌ MongoDB connection failed: ${error.message}`);
    }
}

connectMongoDB();

// CREATE Review
app.post('/reviews', async (req, res) => {
    try {
        const { 
            listing_type, listing_id, user_id, rating, 
            comment, user_name, title,
            entity_name, entity_address, entity_city,
            pros, cons, stay_date
        } = req.body;

        // Validation
        if (!listing_type || !listing_id || !user_id || !rating) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: listing_type, listing_id, user_id, rating'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5'
            });
        }

        // Standardized review schema
        const review = {
            listing_type,  // 'flight', 'hotel', or 'car'
            listing_id: parseInt(listing_id),
            user_id: parseInt(user_id),
            user_name: user_name || 'Anonymous',
            rating: parseFloat(rating),
            title: title || '',
            comment: comment || '',
            
            // Entity details for better display
            entity_name: entity_name || null,
            entity_address: entity_address || null,
            entity_city: entity_city || null,
            
            // Optional rich fields
            pros: Array.isArray(pros) ? pros : [],
            cons: Array.isArray(cons) ? cons : [],
            stay_date: stay_date || null,
            
            created_at: new Date()
        };

        const result = await reviewsCollection.insertOne(review);
        review._id = result.insertedId;

        res.status(201).json({
            success: true,
            data: review
        });
    } catch (error) {
        logger.error(`Error creating review: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET Reviews by User (MUST be before /:listingType/:listingId to avoid route collision)
app.get('/reviews/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        let reviews = await reviewsCollection
            .find({ user_id: parseInt(userId) })
            .sort({ created_at: -1 })
            .limit(limit)
            .toArray();

        // Enrich reviews with entity details
        reviews = await enrichReviewsWithEntityDetails(reviews);

        // Return array directly for consistency with API client expectations
        res.status(200).json({
            success: true,
            data: reviews
        });
    } catch (error) {
        logger.error(`Error fetching user reviews: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET Reviews by Listing
app.get('/reviews/:listingType/:listingId', async (req, res) => {
    try {
        const { listingType, listingId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const reviews = await reviewsCollection
            .find({
                listing_type: listingType,
                listing_id: parseInt(listingId)
            })
            .sort({ created_at: -1 })
            .limit(limit)
            .toArray();

        // Calculate average rating
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        res.status(200).json({
            success: true,
            data: {
                reviews,
                count: reviews.length,
                average_rating: avgRating.toFixed(1)
            }
        });
    } catch (error) {
        logger.error(`Error fetching reviews: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// UPDATE Review
app.put('/reviews/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment, title, pros, cons } = req.body;

        // Validation
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5'
            });
        }

        const updateData = {
            updated_at: new Date()
        };

        if (rating) updateData.rating = parseFloat(rating);
        if (title !== undefined) updateData.title = title;
        if (comment !== undefined) updateData.comment = comment;
        if (Array.isArray(pros)) updateData.pros = pros;
        if (Array.isArray(cons)) updateData.cons = cons;

        const result = await reviewsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        const updatedReview = await reviewsCollection.findOne({
            _id: new ObjectId(id)
        });

        res.status(200).json({
            success: true,
            data: updatedReview
        });
    } catch (error) {
        logger.error(`Error updating review: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE Review (with user ownership check)
app.delete('/reviews/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query; // Pass user_id as query param for verification

        // Build query - if user_id provided, ensure user owns the review
        const query = { _id: new ObjectId(id) };
        if (user_id) {
            query.user_id = parseInt(user_id);
        }

        const result = await reviewsCollection.deleteOne(query);

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: user_id ? 'Review not found or you do not have permission to delete it' : 'Review not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        logger.error(`Error deleting review: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health Check
app.get('/health', async (req, res) => {
    const mongoHealthy = db !== null;

    res.status(mongoHealthy ? 200 : 503).json({
        status: mongoHealthy ? 'healthy' : 'unhealthy',
        service: 'review-service',
        timestamp: new Date().toISOString(),
        dependencies: {
            mongodb: mongoHealthy ? 'connected' : 'disconnected'
        }
    });
});

const PORT = process.env.PORT || 8006;
app.listen(PORT, () => {
    logger.info('');
    logger.info('═══════════════════════════════════════');
    logger.info('  📝 Review Service');
    logger.info('═══════════════════════════════════════');
    logger.info(`  Port: ${PORT}`);
    logger.info(`  Database: MongoDB`);
    logger.info('');
    logger.info('  Endpoints:');
    logger.info(`  POST   /reviews`);
    logger.info(`  GET    /reviews/user/:userId`);
    logger.info(`  GET    /reviews/:listingType/:listingId`);
    logger.info(`  PUT    /reviews/:id`);
    logger.info(`  DELETE /reviews/:id?user_id=X`);
    logger.info(`  GET    /health`);
    logger.info('═══════════════════════════════════════');
    logger.info('');
});
