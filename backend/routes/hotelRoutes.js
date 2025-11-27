const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');

router.get('/search', hotelController.searchHotels);
router.get('/:id', hotelController.getHotelDetails);
router.post('/book', hotelController.bookHotel);

module.exports = router;


