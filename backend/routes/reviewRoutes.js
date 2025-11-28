const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/:entityType/:entityId', reviewController.getReviewsByEntity);

// Protected routes
router.post('/', authenticateToken, reviewController.createReview);
router.get('/user/my-reviews', authenticateToken, reviewController.getReviewsByUser);
router.put('/:id', authenticateToken, reviewController.updateReview);
router.delete('/:id', authenticateToken, reviewController.deleteReview);
router.post('/:id/helpful', reviewController.markHelpful);

module.exports = router;
