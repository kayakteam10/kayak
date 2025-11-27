const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

router.get('/', authenticateToken, bookingController.getUserBookings);
router.get('/:id', authenticateToken, bookingController.getBookingDetails);
router.delete('/:id', authenticateToken, bookingController.cancelBooking);
// Hold endpoint allows optional authentication (users might not be logged in yet)
router.post('/hold', optionalAuth, bookingController.holdBooking);

module.exports = router;


