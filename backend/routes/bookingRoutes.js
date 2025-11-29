const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

router.get('/', authenticateToken, bookingController.getUserBookings);
router.get('/billing', authenticateToken, bookingController.getUserBillings);
router.get('/:id', optionalAuth, bookingController.getBookingDetails);
router.delete('/:id', authenticateToken, bookingController.cancelBooking);
// Hold endpoint allows optional authentication (users might not be logged in yet)
router.post('/hold', optionalAuth, bookingController.holdBooking);
router.post('/hotel', optionalAuth, bookingController.bookHotel);

module.exports = router;


