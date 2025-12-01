/**
 * Flight Routes
 * 
 * Defines all HTTP endpoints for flight service
 * Uses middleware for validation
 */

const express = require('express');
const router = express.Router();

const createFlightRoutes = (flightController, validation) => {
    /**
     * Search flights
     * GET /flights/search?from=SFO&to=JFK&date=2024-12-01&passengers=2&type=oneway
     */
    router.get(
        '/search',
        validation.validateFlightSearch,
        flightController.search
    );

    /**
     * Get flight details
     * GET /flights/:id
     */
    router.get(
        '/:id',
        validation.validateFlightId,
        flightController.getDetails
    );

    /**
     * Get available seats
     * GET /flights/:id/seats
     */
    router.get(
        '/:id/seats',
        validation.validateFlightId,
        flightController.getSeats
    );

    /**
     * Reserve seats
     * POST /flights/:id/seats/reserve
     * Body: { seatNumbers: ['12A', '12B'] }
     */
    router.post(
        '/:id/seats/reserve',
        validation.validateFlightId,
        validation.validateSeatReservation,
        flightController.reserveSeats
    );

    /**
     * Search airports (autocomplete)
     * GET /airports/search?q=san
     */
    router.get(
        '/airports/search',
        validation.validateAirportSearch,
        flightController.searchAirports
    );

    return router;
};

module.exports = createFlightRoutes;
