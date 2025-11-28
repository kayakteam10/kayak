const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/auth');

// Protected routes (must come before /:entityType/:entityId to avoid conflicts)
router.get('/user/my-reviews', authenticateToken, reviewController.getReviewsByUser);
router.post('/', authenticateToken, reviewController.createReview);
router.put('/:id', authenticateToken, reviewController.updateReview);
router.delete('/:id', authenticateToken, reviewController.deleteReview);

// Public routes
router.get('/:entityType/:entityId', reviewController.getReviewsByEntity);
router.post('/:id/helpful', reviewController.markHelpful);

module.exports = router;
