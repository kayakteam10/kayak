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
        const { listing_type, listing_id, user_id, rating, comment, user_name } = req.body;

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

        const review = {
            listing_type,  // 'flight', 'hotel', or 'car'
            listing_id: parseInt(listing_id),
            user_id: parseInt(user_id),
            user_name: user_name || 'Anonymous',
            rating: parseFloat(rating),
            comment: comment || '',
            created_at: new Date(),
            helpful_count: 0
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

// GET Reviews by User
app.get('/reviews/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const reviews = await reviewsCollection
            .find({ user_id: parseInt(userId) })
            .sort({ created_at: -1 })
            .limit(limit)
            .toArray();

        res.status(200).json({
            success: true,
            data: reviews,
            count: reviews.length
        });
    } catch (error) {
        logger.error(`Error fetching user reviews: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE Review
app.delete('/reviews/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await reviewsCollection.deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Review deleted'
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
    logger.info(`  GET    /reviews/:listingType/:listingId`);
    logger.info(`  GET    /reviews/user/:userId`);
    logger.info(`  DELETE /reviews/:id`);
    logger.info(`  GET    /health`);
    logger.info('═══════════════════════════════════════');
    logger.info('');
});
