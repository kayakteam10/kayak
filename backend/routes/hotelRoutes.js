const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');

// Important: /cities/search must come BEFORE /:id to prevent route collision
router.get('/cities/search', hotelController.searchCities);
router.get('/search', hotelController.searchHotels);
router.get('/:id', hotelController.getHotelDetails);
router.post('/book', hotelController.bookHotel);

module.exports = router;


