# MongoDB Integration - Complete Implementation Guide

## Overview
You currently have ~60% of MongoDB integration complete. Here's what exists and what needs to be added.

---

## ✅ What You Already Have

### 1. Review Service Backend (Port 8006)
**Location**: `/services/review-service/src/server.js`

**Existing Endpoints:**
- ✅ `POST /reviews` - Create review
- ✅ `GET /reviews/:listingType/:listingId` - Get reviews by listing
- ✅ `GET /reviews/user/:userId` - Get reviews by user
- ✅ `DELETE /reviews/:id` - Delete review
- ✅ `GET /health` - Health check

**Existing Features:**
- MongoDB connection
- Basic CRUD operations
- Review validation
- Average rating calculation
- Indexed queries

### 2. Platform Service Integration
**Location**: `/services/platform-service/src/server.js`

**Existing:**
- ✅ Proxy to review service at `/api/reviews/*`
- ✅ Routes to review service (port 8006)

### 3. Frontend API Client
**Location**: `/frontend/src/services/api.js`

**Existing:**
```javascript
reviewsAPI = {
  create, getByEntity, getMyReviews, update, delete, markHelpful
}
```

### 4. MongoDB Schema
**Location**: `/database/init-mongodb-final.js`

**Collections Defined:**
- ✅ `images` - For profile pictures, hotel images
- ✅ `reviews` - Review data
- ✅ `logs` - User activity logs
- ✅ `notifications` - System notifications

---

## ❌ What's Missing (4-6 hours of work)

### TASK 1: Complete Review Service API (2 hours)

#### 1.1 Add Missing Endpoints

**File**: `/services/review-service/src/server.js`

Add these endpoints AFTER the existing DELETE endpoint:

```javascript
// UPDATE Review
app.put('/reviews/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

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
        if (comment !== undefined) updateData.comment = comment;

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

// MARK Review as Helpful
app.post('/reviews/:id/helpful', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await reviewsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $inc: { helpful_count: 1 } }
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
        logger.error(`Error marking review helpful: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET Review Statistics (for analytics)
app.get('/reviews/stats/:listingType/:listingId', async (req, res) => {
    try {
        const { listingType, listingId } = req.params;

        const reviews = await reviewsCollection
            .find({
                listing_type: listingType,
                listing_id: parseInt(listingId)
            })
            .toArray();

        if (reviews.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    total: 0,
                    average: 0,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                }
            });
        }

        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(r => {
            const rating = Math.floor(r.rating);
            distribution[rating] = (distribution[rating] || 0) + 1;
        });

        res.status(200).json({
            success: true,
            data: {
                total: reviews.length,
                average: parseFloat(avgRating.toFixed(1)),
                distribution,
                recent: reviews.slice(0, 5).map(r => ({
                    id: r._id,
                    rating: r.rating,
                    comment: r.comment?.substring(0, 100),
                    user_name: r.user_name,
                    created_at: r.created_at
                }))
            }
        });
    } catch (error) {
        logger.error(`Error fetching review stats: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
```

**Update the startup log** to include new endpoints:

```javascript
logger.info('  Endpoints:');
logger.info(`  POST   /reviews`);
logger.info(`  GET    /reviews/:listingType/:listingId`);
logger.info(`  GET    /reviews/user/:userId`);
logger.info(`  GET    /reviews/stats/:listingType/:listingId`);
logger.info(`  PUT    /reviews/:id`);
logger.info(`  DELETE /reviews/:id`);
logger.info(`  POST   /reviews/:id/helpful`);
logger.info(`  GET    /health`);
```

---

### TASK 2: Add Image Upload Service (1.5 hours)

Create a new file: `/services/review-service/src/server.js`

Add these endpoints to handle images:

```javascript
// Image Upload Collection
let imagesCollection = null;

// Initialize images collection
async function connectMongoDB() {
    try {
        const uri = process.env.MONGO_URL || 'mongodb://localhost:27017';
        const client = new MongoClient(uri);
        await client.connect();
        db = client.db(process.env.MONGO_DB_NAME || 'kayak_db');
        reviewsCollection = db.collection('reviews');
        imagesCollection = db.collection('images');  // ADD THIS

        // Create indexes
        await reviewsCollection.createIndex({ listing_type: 1, listing_id: 1 });
        await reviewsCollection.createIndex({ user_id: 1 });
        await imagesCollection.createIndex({ entity_type: 1, entity_id: 1 });  // ADD THIS

        logger.info('✅ MongoDB connected');
    } catch (error) {
        logger.error(`❌ MongoDB connection failed: ${error.message}`);
    }
}
```

Add these image endpoints AFTER the review endpoints:

```javascript
// UPLOAD Image (Profile Picture or Hotel Image)
app.post('/images', async (req, res) => {
    try {
        const { entity_type, entity_id, image_type, mime_type, base64_data } = req.body;

        // Validation
        if (!entity_type || !entity_id || !image_type || !base64_data) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: entity_type, entity_id, image_type, base64_data'
            });
        }

        const validEntityTypes = ['user', 'hotel', 'car'];
        const validImageTypes = ['profile', 'room', 'property_exterior', 'vehicle'];
        const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (!validEntityTypes.includes(entity_type)) {
            return res.status(400).json({
                success: false,
                error: `Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}`
            });
        }

        if (!validImageTypes.includes(image_type)) {
            return res.status(400).json({
                success: false,
                error: `Invalid image_type. Must be one of: ${validImageTypes.join(', ')}`
            });
        }

        if (mime_type && !validMimeTypes.includes(mime_type)) {
            return res.status(400).json({
                success: false,
                error: `Invalid mime_type. Must be one of: ${validMimeTypes.join(', ')}`
            });
        }

        // Delete existing image for this entity (replace old profile picture)
        if (image_type === 'profile') {
            await imagesCollection.deleteMany({
                entity_type,
                entity_id: parseInt(entity_id),
                image_type
            });
        }

        const image = {
            entity_type,
            entity_id: parseInt(entity_id),
            image_type,
            mime_type: mime_type || 'image/png',
            base64_data,
            created_at: new Date()
        };

        const result = await imagesCollection.insertOne(image);
        image._id = result.insertedId;

        res.status(201).json({
            success: true,
            data: image
        });
    } catch (error) {
        logger.error(`Error uploading image: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET Images by Entity
app.get('/images/:entityType/:entityId', async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const { imageType } = req.query;

        const query = {
            entity_type: entityType,
            entity_id: parseInt(entityId)
        };

        if (imageType) {
            query.image_type = imageType;
        }

        const images = await imagesCollection
            .find(query)
            .sort({ created_at: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            data: images,
            count: images.length
        });
    } catch (error) {
        logger.error(`Error fetching images: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE Image
app.delete('/images/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await imagesCollection.deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Image deleted'
        });
    } catch (error) {
        logger.error(`Error deleting image: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
```

Update startup log:

```javascript
logger.info('  Image Endpoints:');
logger.info(`  POST   /images`);
logger.info(`  GET    /images/:entityType/:entityId`);
logger.info(`  DELETE /images/:id`);
```

---

### TASK 3: Add User Activity Logging (30 minutes)

Add this to the review service:

```javascript
// Logs Collection
let logsCollection = null;

// Update connectMongoDB
async function connectMongoDB() {
    // ... existing code ...
    logsCollection = db.collection('logs');  // ADD THIS
    await logsCollection.createIndex({ user_id: 1, timestamp: -1 });  // ADD THIS
    await logsCollection.createIndex({ action_type: 1 });  // ADD THIS
}

// LOG User Activity
app.post('/logs', async (req, res) => {
    try {
        const { user_id, action_type, entity_type, entity_id, metadata } = req.body;

        if (!user_id || !action_type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: user_id, action_type'
            });
        }

        const log = {
            user_id: parseInt(user_id),
            action_type, // 'search', 'view', 'book', 'review', 'login', etc.
            entity_type: entity_type || null,
            entity_id: entity_id ? parseInt(entity_id) : null,
            metadata: metadata || {},
            timestamp: new Date(),
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent') || 'unknown'
        };

        const result = await logsCollection.insertOne(log);
        log._id = result.insertedId;

        res.status(201).json({
            success: true,
            data: log
        });
    } catch (error) {
        logger.error(`Error creating log: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET User Activity Logs
app.get('/logs/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 100;
        const actionType = req.query.actionType;

        const query = { user_id: parseInt(userId) };
        if (actionType) {
            query.action_type = actionType;
        }

        const logs = await logsCollection
            .find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();

        res.status(200).json({
            success: true,
            data: logs,
            count: logs.length
        });
    } catch (error) {
        logger.error(`Error fetching logs: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET Activity Statistics (for analytics)
app.get('/logs/stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const matchStage = {};
        if (startDate || endDate) {
            matchStage.timestamp = {};
            if (startDate) matchStage.timestamp.$gte = new Date(startDate);
            if (endDate) matchStage.timestamp.$lte = new Date(endDate);
        }

        const stats = await logsCollection.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$action_type',
                    count: { $sum: 1 },
                    unique_users: { $addToSet: '$user_id' }
                }
            },
            {
                $project: {
                    action_type: '$_id',
                    count: 1,
                    unique_users: { $size: '$unique_users' }
                }
            },
            { $sort: { count: -1 } }
        ]).toArray();

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error(`Error fetching log stats: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
```

Update startup log:

```javascript
logger.info('  Activity Log Endpoints:');
logger.info(`  POST   /logs`);
logger.info(`  GET    /logs/user/:userId`);
logger.info(`  GET    /logs/stats`);
```

---

### TASK 4: Update Frontend API Client (15 minutes)

**File**: `/frontend/src/services/api.js`

Update the reviewsAPI and add imagesAPI and logsAPI:

```javascript
// Reviews API (UPDATE)
export const reviewsAPI = {
  create: (data) => api.post('/api/reviews', data),
  getByEntity: (entityType, entityId, params) => 
    api.get(`/api/reviews/${entityType}/${entityId}`, { params }),
  getStats: (entityType, entityId) => 
    api.get(`/api/reviews/stats/${entityType}/${entityId}`),
  getMyReviews: (userId) => api.get(`/api/reviews/user/${userId}`),
  update: (id, data) => api.put(`/api/reviews/${id}`, data),
  delete: (id) => api.delete(`/api/reviews/${id}`),
  markHelpful: (id) => api.post(`/api/reviews/${id}/helpful`),
};

// Images API (NEW)
export const imagesAPI = {
  upload: (data) => api.post('/api/images', data),
  getByEntity: (entityType, entityId, imageType) => 
    api.get(`/api/images/${entityType}/${entityId}`, { 
      params: imageType ? { imageType } : {} 
    }),
  delete: (id) => api.delete(`/api/images/${id}`),
};

// Logs API (NEW)
export const logsAPI = {
  create: (data) => api.post('/api/logs', data),
  getUserLogs: (userId, actionType, limit) => 
    api.get(`/api/logs/user/${userId}`, { 
      params: { actionType, limit } 
    }),
  getStats: (startDate, endDate) => 
    api.get('/api/logs/stats', { 
      params: { startDate, endDate } 
    }),
};
```

---

### TASK 5: Add Frontend Review Submission Form (2 hours)

Create a new component: `/frontend/src/components/ReviewModal.js`

```javascript
import React, { useState } from 'react';
import { FaStar, FaTimes } from 'react-icons/fa';
import './ReviewModal.css';

function ReviewModal({ isOpen, onClose, onSubmit, entityType, entityId, entityName }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSubmit({
        listing_type: entityType,
        listing_id: entityId,
        rating,
        comment
      });
      
      // Reset form
      setRating(0);
      setComment('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-header">
          <h2>Write a Review</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="review-modal-body">
          <p className="entity-name">{entityName}</p>

          <form onSubmit={handleSubmit}>
            <div className="rating-section">
              <label>Your Rating *</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    className={star <= (hoverRating || rating) ? 'star filled' : 'star'}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  />
                ))}
              </div>
              <span className="rating-text">
                {rating > 0 ? `${rating} out of 5 stars` : 'Click to rate'}
              </span>
            </div>

            <div className="comment-section">
              <label>Your Review (Optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={5}
                maxLength={1000}
              />
              <span className="char-count">{comment.length}/1000</span>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-cancel">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-submit">
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ReviewModal;
```

Create the CSS file: `/frontend/src/components/ReviewModal.css`

```css
.review-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-in;
}

.review-modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

.review-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.review-modal-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.review-modal-body {
  padding: 20px;
}

.entity-name {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
}

.rating-section {
  margin-bottom: 20px;
}

.rating-section label {
  display: block;
  font-weight: 600;
  margin-bottom: 10px;
  color: #333;
}

.star-rating {
  display: flex;
  gap: 8px;
  margin-bottom: 5px;
}

.star {
  font-size: 32px;
  color: #ddd;
  cursor: pointer;
  transition: all 0.2s;
}

.star:hover {
  transform: scale(1.1);
}

.star.filled {
  color: #ffd700;
}

.rating-text {
  display: block;
  font-size: 14px;
  color: #666;
}

.comment-section {
  margin-bottom: 20px;
}

.comment-section label {
  display: block;
  font-weight: 600;
  margin-bottom: 10px;
  color: #333;
}

.comment-section textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s;
}

.comment-section textarea:focus {
  outline: none;
  border-color: #007bff;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 15px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-cancel,
.btn-submit {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: #f0f0f0;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-submit {
  background: #007bff;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-submit:disabled {
  background: #ccc;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

### TASK 6: Integrate Review Modal in Booking Confirmation (30 minutes)

**File**: `/frontend/src/pages/BookingConfirmationPage.js` (or HotelConfirmationPage.js)

Add this import:

```javascript
import ReviewModal from '../components/ReviewModal';
import { reviewsAPI, logsAPI } from '../services/api';
```

Add state:

```javascript
const [showReviewModal, setShowReviewModal] = useState(false);
```

Add the review submission handler:

```javascript
const handleReviewSubmit = async (reviewData) => {
  try {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName') || 'Anonymous';

    await reviewsAPI.create({
      ...reviewData,
      user_id: userId,
      user_name: userName
    });

    // Log the activity
    await logsAPI.create({
      user_id: userId,
      action_type: 'review',
      entity_type: reviewData.listing_type,
      entity_id: reviewData.listing_id
    });

    alert('Thank you for your review!');
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
};
```

Add button in the UI (after booking details):

```javascript
<button 
  className="btn-primary"
  onClick={() => setShowReviewModal(true)}
>
  Write a Review
</button>

<ReviewModal
  isOpen={showReviewModal}
  onClose={() => setShowReviewModal(false)}
  onSubmit={handleReviewSubmit}
  entityType="flight" // or 'hotel', 'car' based on booking type
  entityId={booking.flight_id} // or hotel_id, car_id
  entityName={`${booking.departure_city} to ${booking.arrival_city}`}
/>
```

---

### TASK 7: Add Activity Logging Middleware (30 minutes)

Create middleware to automatically log user actions.

**File**: `/services/platform-service/src/middleware/activityLogger.js`

```javascript
const axios = require('axios');

const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://localhost:8006';

const activityLogger = (actionType) => {
  return async (req, res, next) => {
    // Skip if no user
    const userId = req.user?.id || req.headers['x-user-id'];
    if (!userId) {
      return next();
    }

    try {
      // Log after response is sent
      res.on('finish', async () => {
        if (res.statusCode < 400) {
          try {
            await axios.post(`${REVIEW_SERVICE_URL}/logs`, {
              user_id: userId,
              action_type: actionType,
              entity_type: req.params.entityType || null,
              entity_id: req.params.entityId || req.params.id || null,
              metadata: {
                method: req.method,
                path: req.path,
                query: req.query,
                status: res.statusCode
              }
            }, { timeout: 1000 });
          } catch (err) {
            // Silently fail - logging shouldn't break the app
            console.error('Activity logging failed:', err.message);
          }
        }
      });
    } catch (error) {
      // Continue even if logging fails
    }

    next();
  };
};

module.exports = activityLogger;
```

**File**: `/services/platform-service/src/server.js`

Add import and use:

```javascript
const activityLogger = require('./middleware/activityLogger');

// Add logging to proxies
app.use('/api/flights/search', activityLogger('search'));
app.use('/api/hotels/search', activityLogger('search'));
app.use('/api/cars/search', activityLogger('search'));
app.use('/api/flights/:id', activityLogger('view'));
app.use('/api/hotels/:id', activityLogger('view'));
app.use('/api/bookings', activityLogger('book'));
```

---

## 🚀 Quick Implementation Checklist

### Step-by-Step Execution (4-6 hours)

**Hour 1-2: Complete Review Service**
- [ ] Add UPDATE endpoint
- [ ] Add HELPFUL endpoint  
- [ ] Add STATS endpoint
- [ ] Test with Postman/curl
- [ ] Restart Docker container

**Hour 2-3: Add Image Upload**
- [ ] Add imagesCollection to MongoDB connection
- [ ] Add POST /images endpoint
- [ ] Add GET /images/:entityType/:entityId endpoint
- [ ] Add DELETE /images/:id endpoint
- [ ] Test image upload with base64 data

**Hour 3-4: Add Activity Logging**
- [ ] Add logsCollection to MongoDB connection
- [ ] Add POST /logs endpoint
- [ ] Add GET /logs/user/:userId endpoint
- [ ] Add GET /logs/stats endpoint
- [ ] Test logging

**Hour 4-5: Frontend Integration**
- [ ] Update API client (api.js)
- [ ] Create ReviewModal component
- [ ] Add ReviewModal CSS
- [ ] Integrate in confirmation pages
- [ ] Test review submission flow

**Hour 5-6: Activity Logging Middleware**
- [ ] Create activityLogger middleware
- [ ] Add to platform service routes
- [ ] Test automatic logging
- [ ] Verify logs in MongoDB

---

## 🧪 Testing Commands

### Test Review Endpoints

```bash
# Create review
curl -X POST http://localhost:8006/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "listing_type": "flight",
    "listing_id": 1,
    "user_id": 1,
    "user_name": "John Doe",
    "rating": 5,
    "comment": "Great flight!"
  }'

# Get reviews
curl http://localhost:8006/reviews/flight/1

# Get review stats
curl http://localhost:8006/reviews/stats/flight/1

# Update review
curl -X PUT http://localhost:8006/reviews/<review_id> \
  -H "Content-Type: application/json" \
  -d '{"rating": 4, "comment": "Updated comment"}'

# Mark helpful
curl -X POST http://localhost:8006/reviews/<review_id>/helpful
```

### Test Image Upload

```bash
# Upload profile picture
curl -X POST http://localhost:8006/images \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "user",
    "entity_id": 1,
    "image_type": "profile",
    "mime_type": "image/png",
    "base64_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  }'

# Get user images
curl http://localhost:8006/images/user/1
```

### Test Activity Logs

```bash
# Create log
curl -X POST http://localhost:8006/logs \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "action_type": "search",
    "entity_type": "flight",
    "metadata": {"query": "SFO to NYC"}
  }'

# Get user logs
curl http://localhost:8006/logs/user/1

# Get activity stats
curl "http://localhost:8006/logs/stats?startDate=2025-01-01&endDate=2025-12-31"
```

---

## 📊 Expected Results

After completion, you'll have:

1. ✅ **Full CRUD for Reviews** - Create, Read, Update, Delete + Stats
2. ✅ **Image Upload System** - Profile pictures, hotel images  
3. ✅ **Activity Logging** - Track all user actions
4. ✅ **Frontend Review Forms** - Beautiful modal to submit reviews
5. ✅ **Automatic Logging** - Middleware logs searches, views, bookings
6. ✅ **MongoDB at 100%** - All collections fully utilized

---

## 🎯 Success Metrics

**Before:** MongoDB at ~60%
- Basic review display
- No image uploads
- No activity tracking

**After:** MongoDB at ~95%
- Full review system with ratings
- Image upload/storage
- Complete activity tracking
- Frontend integration
- Automatic logging

**Estimated Grade Impact:** +5-8 points (from MongoDB Integration section)

---

## 🆘 Troubleshooting

### Issue: MongoDB connection fails
**Solution:** Check docker-compose.yml has review service connected to MongoDB

### Issue: Images too large
**Solution:** Add file size validation, compress images on frontend before upload

### Issue: Logs filling up database
**Solution:** Add TTL index to logs collection for auto-deletion:
```javascript
await logsCollection.createIndex(
  { timestamp: 1 }, 
  { expireAfterSeconds: 2592000 } // 30 days
);
```

### Issue: Review modal not showing
**Solution:** Check z-index, ensure overlay is rendered, verify state management

---

Good luck with the implementation! This should take 4-6 focused hours to complete. Start with the backend (Tasks 1-3), then move to frontend (Tasks 4-6), and finish with middleware (Task 7).
