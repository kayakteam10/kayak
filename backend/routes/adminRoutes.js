const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(isAdmin);

// Bookings
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/:id', adminController.getBookingDetails);
router.put('/bookings/:id/cancel', adminController.cancelBooking);

// Flights
router.get('/flights', adminController.getAllFlights);
router.post('/flights', adminController.createFlight);
router.put('/flights/:id', adminController.updateFlight);
router.delete('/flights/:id', adminController.deleteFlight);

// Analytics
router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/routes', adminController.getPopularRoutes);

module.exports = router;
