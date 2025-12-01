/**
 * Hotel Routes
 * 
 * Defines all HTTP endpoints for hotel service
 */

const express = require('express');
const router = express.Router();

const createHotelRoutes = (hotelController, validation) => {
    /**
     * Search hotels
     * GET /hotels/search?location=San Francisco&checkIn=2025-12-01&checkOut=2025-12-03&guests=2
     */
    router.get(
        '/search',
        validation.validateHotelSearch,
        hotelController.search
    );

    /**
     * Search cities (autocomplete) - MUST BE BEFORE /:id
     * GET /hotels/search-cities?q=san
     */
    router.get(
        '/search-cities',
        validation.validateCitySearch,
        hotelController.searchCities
    );

    /**
     * Get hotel details
     * GET /hotels/:id
     */
    router.get(
        '/:id',
        validation.validateHotelId,
        hotelController.getDetails
    );

    /**
     * Get room types
     * GET /hotels/:id/rooms
     */
    router.get(
        '/:id/rooms',
        validation.validateHotelId,
        hotelController.getRoomTypes
    );

    /**
     * Reserve rooms
     * POST /hotels/:id/rooms/reserve
     * Body: { roomCount: 2 }
     */
    router.post(
        '/:id/rooms/reserve',
        validation.validateHotelId,
        validation.validateRoomReservation,
        hotelController.reserveRooms
    );

    return router;
};

module.exports = createHotelRoutes;
