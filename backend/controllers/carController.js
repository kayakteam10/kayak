const pool = require('../config/database');
const { getDB } = require('../config/mongodb');
const { ObjectId } = require('mongodb');

const searchCars = async (req, res) => {
  try {
    // Accept both 'location' and 'pickupLocation' for flexibility
    const location = req.query.location || req.query.pickupLocation;
    const pickupDate = req.query.pickupDate;
    const dropoffDate = req.query.dropoffDate;

    console.log('🚗 Car search request:', { 
      query: req.query, 
      location,
      pickupDate,
      dropoffDate
    });

    if (!location) {
      return res.status(400).json({ error: 'Location (pickupLocation) is required' });
    }

    // Calculate rental days
    let rentalDays = 1; // Default to 1 day
    if (pickupDate && dropoffDate) {
      const pickup = new Date(pickupDate);
      const dropoff = new Date(dropoffDate);
      const diffTime = Math.abs(dropoff - pickup);
      rentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // At least 1 day
    }
    console.log('📅 Rental days:', rentalDays);

    // Get cars from MySQL
    const result = await pool.query(
      `SELECT * FROM cars 
       WHERE (LOWER(location_city) LIKE LOWER(?) OR LOWER(airport_code) LIKE LOWER(?))
       AND status = 'available'
       ORDER BY daily_rental_price ASC`,
      [`%${location}%`, `%${location}%`]
    );

    const cars = result.rows || result || [];
    console.log('🚗 Found cars:', cars.length);

    // Fetch images from MongoDB for each car
    const db = await getDB();
    const imagesCollection = db.collection('images');

    const carsWithImages = await Promise.all(
      cars.map(async (car) => {
        let imageData = null;
        
        try {
          // Find image by entity_id (matches car.id in MySQL)
          const image = await imagesCollection.findOne({
            entity_type: 'car',
            entity_id: car.id
          });
          
          console.log(`🔍 Car ${car.id} (${car.model}): image found = ${!!image}, has base64 = ${!!image?.base64_data}`);
          
          if (image && image.base64_data) {
            // Check if base64_data already has data URL prefix
            if (image.base64_data.startsWith('data:')) {
              imageData = image.base64_data;
              console.log(`✅ Car ${car.id}: Using existing data URL`);
            } else {
              // Convert base64 to data URL
              imageData = `data:${image.mime_type || 'image/jpeg'};base64,${image.base64_data}`;
              console.log(`✅ Car ${car.id}: Created data URL`);
            }
          } else {
            console.log(`⚠️ Car ${car.id}: No image data found`);
          }
        } catch (err) {
          console.log(`❌ Could not fetch image for car ${car.id}:`, err.message);
        }

        return {
          ...car,
          image_url: imageData,
          rental_days: rentalDays,
          total_price: parseFloat(car.daily_rental_price) * rentalDays
        };
      })
    );

    // Filter to only return cars that have images
    const carsWithImagesOnly = carsWithImages.filter(c => c.image_url);
    console.log(`✅ Returning ${carsWithImagesOnly.length} cars with images (filtered from ${carsWithImages.length} total)`);

    res.json({
      cars: carsWithImagesOnly,
      total: carsWithImagesOnly.length
    });
  } catch (error) {
    console.error('❌ Car search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getCarDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM cars WHERE id = ?', [id]);
    const cars = result.rows || result || [];

    if (cars.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const car = cars[0];
    let imageData = null;

    // Fetch image from MongoDB by entity_id
    try {
      const db = await getDB();
      const imagesCollection = db.collection('images');
      const image = await imagesCollection.findOne({
        entity_type: 'car',
        entity_id: car.id
      });
      
      if (image && image.base64_data) {
        // Check if base64_data already has data URL prefix
        if (image.base64_data.startsWith('data:')) {
          imageData = image.base64_data;
        } else {
          imageData = `data:${image.mime_type || 'image/jpeg'};base64,${image.base64_data}`;
        }
      }
    } catch (err) {
      console.log(`⚠️ Could not fetch image for car ${car.id}:`, err.message);
    }

    res.json({
      ...car,
      image_url: imageData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const bookCar = async (req, res) => {
  try {
    const { car_id, rental_details } = req.body;
    const userId = req.user ? req.user.userId : null;

    const carResult = await pool.query('SELECT * FROM cars WHERE id = ?', [car_id]);
    const cars = carResult.rows || carResult || [];

    if (cars.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const bookingReference = `CR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate base amount and tax (10% for cars)
    const baseAmount = rental_details.total_price || car.rows[0].price_per_day;
    const taxAmount = baseAmount * 0.1;
    const totalAmount = baseAmount + taxAmount;
    
    const bookingResult = await pool.query(
      `INSERT INTO bookings (user_id, booking_type, booking_reference, total_amount, booking_details, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, 'car', bookingReference, cars[0].daily_rental_price,
       JSON.stringify({ car_id, rental_details, car_details: cars[0] })]
    );
    
    const bookingId = bookingResult?.insertId || bookingResult?.rows?.[0]?.id;
    const bookingRowResult = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    const bookingRows = bookingRowResult.rows || bookingRowResult || [];

    res.status(201).json({
      message: 'Car booking created',
      booking: bookingRows[0] || { id: bookingId, booking_reference: bookingReference }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Search locations for car rentals (placeholder function)
const searchLocations = async (req, res) => {
  try {
    const { query } = req.query;

    // If no query, return empty array
    if (!query || query.trim() === '') {
      return res.json([]);
    }

    const searchTerm = query.trim();

    // Simple location search from cars table
    const searchQuery = `
      SELECT DISTINCT location_city, airport_code
      FROM cars
      WHERE LOWER(location_city) LIKE LOWER(?) 
         OR LOWER(airport_code) LIKE LOWER(?)
      LIMIT 10
    `;

    const searchPattern = `%${searchTerm}%`;
    const result = await pool.query(searchQuery, [searchPattern, searchPattern]);
    const rows = result.rows || result || [];

    // Format response
    const locations = rows.map(row => ({
      label: `${row.location_city}${row.airport_code ? ' (' + row.airport_code + ')' : ''}`,
      value: row.location_city,
      type: 'location'
    }));

    res.json(locations);
  } catch (error) {
    console.error('Location search error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = { searchCars, getCarDetails, bookCar, searchLocations };


