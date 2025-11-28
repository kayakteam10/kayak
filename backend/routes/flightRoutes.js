const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flightController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
// Important: /airports/search must come BEFORE /:id to prevent route collision
router.get('/airports/search', flightController.searchAirports);
router.get('/search', flightController.searchFlights);
router.get('/:id', flightController.getFlightDetails);
router.get('/:id/seats', flightController.getFlightSeats);

// Protected routes
router.post('/book', authenticateToken, flightController.bookFlight);

module.exports = router;


