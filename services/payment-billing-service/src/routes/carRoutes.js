/**
 * Car Routes
 */

const express = require('express');
const router = express.Router();

const createCarRoutes = (carController, validation) => {
    router.get(
        '/search',
        validation.validateCarSearch,
        carController.search
    );

    router.get(
        '/search-locations',
        validation.validateLocationSearch,
        carController.searchLocations
    );

    router.get(
        '/:id',
        validation.validateCarId,
        carController.getDetails
    );

    router.post(
        '/:id/reserve',
        validation.validateCarId,
        validation.validateCarReservation,
        carController.reserve
    );

    return router;
};

module.exports = createCarRoutes;
