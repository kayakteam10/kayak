const { getDB } = require('../config/mongodb');
const { ObjectId } = require('mongodb');

/**
 * Create a new review
 * POST /api/reviews
 */
const createReview = async (req, res) => {
  try {
    console.log('📝 Create review request:', {
      userId: req.user?.userId,
      body: req.body
    });

    const userId = req.user?.userId;
    if (!userId) {
      console.log('❌ Unauthorized - no userId');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      bookingId,
      entityType, // 'flight', 'hotel', 'car'
      entityId,
      rating,
      title,
      reviewText
    } = req.body;

    // Validation
    if (!entityType || !entityId || !rating || !title || !reviewText) {
      console.log('❌ Missing required fields:', { entityType, entityId, rating, title: !!title, reviewText: !!reviewText });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['flight', 'hotel', 'car'].includes(entityType)) {
      console.log('❌ Invalid entity type:', entityType);
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    if (rating < 1 || rating > 5) {
      console.log('❌ Invalid rating:', rating);
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Get user info from MySQL
    const pool = require('../config/database');
    const userResult = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const userName = `${user.first_name} ${user.last_name}`;

    // Create review document
    const db = await getDB();
    const review = {
      bookingId: parseInt(bookingId),
      entityType,
      entityId: parseInt(entityId),
      userId: parseInt(userId),
      userName,
      rating: parseFloat(rating),
      title,
      reviewText,
      verified: true, // Verified since it's from an actual booking
      helpfulCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('reviews').insertOne(review);
    console.log('✅ Review created successfully:', result.insertedId);

    res.status(201).json({
      message: 'Review created successfully',
      review: {
        ...review,
        _id: result.insertedId
      }
    });
  } catch (error) {
    console.error('❌ Create review error:', error);
    res.status(500).json({
      error: 'Failed to create review',
      details: error.message
    });
  }
};

/**
 * Get reviews for a specific entity
 * GET /api/reviews/:entityType/:entityId
 */
const getReviewsByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { sortBy = 'recent', limit = 20, skip = 0 } = req.query;

    if (!['flight', 'hotel', 'car'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const db = await getDB();

    // Build sort criteria
    let sort = { createdAt: -1 }; // Default: most recent
    if (sortBy === 'rating_high') sort = { rating: -1, createdAt: -1 };
    if (sortBy === 'rating_low') sort = { rating: 1, createdAt: -1 };
    if (sortBy === 'helpful') sort = { helpfulCount: -1, createdAt: -1 };

    const reviews = await db.collection('reviews')
      .find({
        entityType,
        entityId: parseInt(entityId)
      })
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray();

    // Calculate average rating
    const stats = await db.collection('reviews').aggregate([
      {
        $match: {
          entityType,
          entityId: parseInt(entityId)
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratings: {
            $push: '$rating'
          }
        }
      }
    ]).toArray();

    const reviewStats = stats[0] || { avgRating: 0, totalReviews: 0 };

    // Calculate rating distribution
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (reviewStats.ratings) {
      reviewStats.ratings.forEach(r => {
        distribution[Math.floor(r)]++;
      });
    }

    res.json({
      reviews,
      stats: {
        averageRating: reviewStats.avgRating || 0,
        totalReviews: reviewStats.totalReviews || 0,
        distribution
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get reviews by user
 * GET /api/reviews/user/my-reviews
 */
const getReviewsByUser = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDB();
    const reviews = await db.collection('reviews')
      .find({ user_id: parseInt(userId) })
      .sort({ created_at: -1 })
      .toArray();

    res.json({ reviews });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Update a review
 * PUT /api/reviews/:id
 */
const updateReview = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { rating, title, reviewText } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    const db = await getDB();

    // Check if review belongs to user
    const existingReview = await db.collection('reviews').findOne({
      _id: new ObjectId(id),
      userId: parseInt(userId)
    });

    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    // Update review
    const updateData = {
      updatedAt: new Date()
    };
    if (rating) updateData.rating = parseFloat(rating);
    if (title) updateData.title = title;
    if (reviewText) updateData.reviewText = reviewText;

    await db.collection('reviews').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updatedReview = await db.collection('reviews').findOne({
      _id: new ObjectId(id)
    });

    res.json({
      message: 'Review updated successfully',
      review: updatedReview
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Delete a review
 * DELETE /api/reviews/:id
 */
const deleteReview = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    const db = await getDB();

    // Check if review belongs to user
    const result = await db.collection('reviews').deleteOne({
      _id: new ObjectId(id),
      userId: parseInt(userId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Mark review as helpful
 * POST /api/reviews/:id/helpful
 */
const markHelpful = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    const db = await getDB();
    await db.collection('reviews').updateOne(
      { _id: new ObjectId(id) },
      { $inc: { helpfulCount: 1 } }
    );

    const review = await db.collection('reviews').findOne({
      _id: new ObjectId(id)
    });

    res.json({ message: 'Marked as helpful', review });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createReview,
  getReviewsByEntity,
  getReviewsByUser,
  updateReview,
  deleteReview,
  markHelpful
};
