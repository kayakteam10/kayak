const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');

// Important: /locations must come BEFORE /:id to prevent route collision
router.get('/locations', carController.searchLocations);
router.get('/search', carController.searchCars);
router.get('/:id', carController.getCarDetails);
router.post('/book', carController.bookCar);

module.exports = router;


