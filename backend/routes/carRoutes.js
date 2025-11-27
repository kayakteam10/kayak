const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');

router.get('/search', carController.searchCars);
router.get('/:id', carController.getCarDetails);
router.post('/book', carController.bookCar);

module.exports = router;


