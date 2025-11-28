/**
 * MongoDB Helper Utilities
 * Updated for finalized simplified schemas
 */

const { getDB: getMongoDb } = require('../config/mongodb');

/**
 * Get user profile image
 * @param {number} userId - MySQL User ID
 * @returns {Promise<Object|null>} Image document
 */
async function getUserProfileImage(userId) {
    try {
        const db = await getMongoDb();
        return await db.collection('images').findOne({
            entity_type: 'user',
            entity_id: userId,
            image_type: 'profile'
        });
    } catch (error) {
        console.error('Error fetching user profile image:', error);
        return null;
    }
}

/**
 * Get all images for a hotel
 * @param {number} hotelId - MySQL Hotel ID
 * @returns {Promise<Array>} Array of image documents
 */
async function getHotelImages(hotelId) {
    try {
        const db = await getMongoDb();
        return await db.collection('images')
            .find({
                entity_type: 'hotel',
                entity_id: hotelId
            })
            .sort({ created_at: -1 })
            .toArray();
    } catch (error) {
        console.error('Error fetching hotel images:', error);
        return [];
    }
}

/**
 * Save/Update user profile image
 * @param {number} userId - MySQL User ID
 * @param {string} base64Data - Complete base64 image string
 * @param {string} mimeType - Image MIME type
 * @returns {Promise<Object>} MongoDB operation result
 */
async function saveUserProfileImage(userId, base64Data, mimeType = 'image/png') {
    try {
        const db = await getMongoDb();
        return await db.collection('images').updateOne(
            {
                entity_type: 'user',
                entity_id: userId,
                image_type: 'profile'
            },
            {
                $set: {
                    entity_type: 'user',
                    entity_id: userId,
                    image_type: 'profile',
                    mime_type: mimeType,
                    base64_data: base64Data,
                    created_at: new Date()
                }
            },
            { upsert: true }
        );
    } catch (error) {
        console.error('Error saving user profile image:', error);
        throw error;
    }
}

/**
 * Get reviews for an entity (flight, hotel, car)
 * @param {string} targetType - 'flight', 'hotel', or 'car'
 * @param {number} targetId - MySQL entity ID
 * @param {number} limit - Maximum reviews to return
 * @returns {Promise<Array>} Array of review documents
 */
async function getReviewsByTarget(targetType, targetId, limit = 10) {
    try {
        const db = await getMongoDb();
        return await db.collection('reviews')
            .find({
                target_type: targetType,
                target_id: targetId
            })
            .sort({ created_at: -1 })
            .limit(limit)
            .toArray();
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
}

/**
 * Create a review
 * @param {Object} reviewData - Review data (user_id, target_type, target_id, rating, comment)
 * @returns {Promise<Object>} MongoDB insert result
 */
async function createReview(reviewData) {
    try {
        const db = await getMongoDb();
        return await db.collection('reviews').insertOne({
            user_id: reviewData.user_id,
            target_type: reviewData.target_type,
            target_id: reviewData.target_id,
            rating: reviewData.rating,
            comment: reviewData.comment,
            created_at: new Date()
        });
    } catch (error) {
        console.error('Error creating review:', error);
        throw error;
    }
}

/**
 * Log an analytics event
 * @param {Object} logData - Event data
 * @returns {Promise<Object>} MongoDB insert result
 */
async function logEvent(logData) {
    try {
        const db = await getMongoDb();
        return await db.collection('logs').insertOne({
            user_id: logData.user_id || null,
            event_type: logData.event_type,
            page_url: logData.page_url,
            target_entity: logData.target_entity || null,
            target_id: logData.target_id || null,
            session_id: logData.session_id,
            meta: logData.meta || {},
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error logging event:', error);
        // Don't throw - logging failures shouldn't break the app
        return null;
    }
}

/**
 * Get user notifications
 * @param {number} userId - MySQL User ID
 * @param {boolean} unreadOnly - Filter for unread only
 * @returns {Promise<Array>} Array of notification documents
 */
async function getUserNotifications(userId, unreadOnly = false) {
    try {
        const db = await getMongoDb();
        const query = { user_id: userId };
        if (unreadOnly) {
            query.is_read = false;
        }
        return await db.collection('notifications')
            .find(query)
            .sort({ created_at: -1 })
            .toArray();
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

/**
 * Create a notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} MongoDB insert result
 */
async function createNotification(notificationData) {
    try {
        const db = await getMongoDb();
        return await db.collection('notifications').insertOne({
            user_id: notificationData.user_id,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            is_read: false,
            created_at: new Date()
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

/**
 * Mark notification as read
 * @param {string} notificationId - MongoDB notification _id
 * @returns {Promise<Object>} MongoDB update result
 */
async function markNotificationRead(notificationId) {
    try {
        const { ObjectId } = require('mongodb');
        const db = await getMongoDb();
        return await db.collection('notifications').updateOne(
            { _id: new ObjectId(notificationId) },
            { $set: { is_read: true } }
        );
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

module.exports = {
    // Image helpers
    getUserProfileImage,
    getHotelImages,
    saveUserProfileImage,

    // Review helpers
    getReviewsByTarget,
    createReview,

    // Analytics helpers
    logEvent,

    // Notification helpers
    getUserNotifications,
    createNotification,
    markNotificationRead
};
