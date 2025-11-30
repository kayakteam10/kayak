const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const searchHotels = async (req, res) => {
  try {
    console.log('Hotel search request received:', req.query);
    const { location, check_in, check_out, guests = 1 } = req.query;

    if (!location || !check_in || !check_out) {
      console.log('Missing parameters:', { location, check_in, check_out });
      return res.status(400).json({ error: 'Missing required search parameters' });
    }

    console.log('Searching hotels for location:', location);
    
    // First, try to find if location matches an airport code
    let airportCity = null;
    const airportResult = await pool.query(
      `SELECT city FROM airports WHERE LOWER(code) = LOWER(?) OR LOWER(name) LIKE LOWER(?) LIMIT 1`,
      [location, `%${location}%`]
    );
    
    if (airportResult.rows.length > 0) {
      airportCity = airportResult.rows[0].city;
      console.log('Found airport city:', airportCity);
    }

    // Search hotels by city, hotel name, address, or airport city
    const searchPattern = `%${location}%`;
    let query = `SELECT * FROM hotels 
       WHERE LOWER(city) LIKE LOWER(?) 
          OR LOWER(hotel_name) LIKE LOWER(?)
          OR LOWER(address) LIKE LOWER(?)
          OR LOWER(state) LIKE LOWER(?)`;
    
    let params = [searchPattern, searchPattern, searchPattern, searchPattern];
    
    // If we found an airport, also search by that city
    if (airportCity) {
      query += ` OR LOWER(city) LIKE LOWER(?)`;
      params.push(`%${airportCity}%`);
    }
    
    query += ` ORDER BY star_rating DESC, user_rating DESC`;
    
    const result = await pool.query(query, params);

    console.log('Hotels found:', result.rows.length);
    res.json({
      hotels: result.rows,
      total: result.rows.length,
      searchType: airportCity ? 'airport' : 'direct'
    });
  } catch (error) {
    console.error('Hotel search error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

const getHotelDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM hotels WHERE id = ?', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const bookHotel = async (req, res) => {
  try {
    const { hotel_id, guest_info } = req.body;
    const userId = req.user ? req.user.userId : null;

    if (!hotel_id || !guest_info) {
      return res.status(400).json({ error: 'Missing required information' });
    }

    const hotel = await pool.query('SELECT * FROM hotels WHERE id = ?', [hotel_id]);

    if (hotel.rows.length === 0) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    const bookingReference = `HT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate base amount and tax (15% for hotels)
    const baseAmount = guest_info.total_price || 200.00;
    const taxAmount = baseAmount * 0.15;
    const totalAmount = baseAmount + taxAmount;
    
    const bookingResult = await pool.query(
      `INSERT INTO bookings (user_id, booking_type, booking_reference, total_amount, booking_details, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, 'hotel', bookingReference, totalAmount, 
       JSON.stringify({ 
         hotel_id, 
         guest_info, 
         hotel_details: hotel.rows[0],
         pricing: {
           base_amount: baseAmount,
           tax_amount: taxAmount,
           total_amount: totalAmount
         }
       })]
    );
    
    const bookingId = bookingResult.insertId;
    const [bookingRow] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);

    res.status(201).json({
      message: 'Hotel booking created',
      booking: bookingRow[0] || { id: bookingId, booking_reference: bookingReference }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Search cities, hotels, and airports for autocomplete
const searchCities = async (req, res) => {
  try {
    const { query } = req.query;

    // If no query, return empty array
    if (!query || query.trim() === '') {
      return res.json([]);
    }

    const searchTerm = query.trim();
    const searchPattern = `%${searchTerm}%`;
    const results = [];

    // 1. Search for cities
    const cityQuery = `
      SELECT DISTINCT city, state
      FROM hotels
      WHERE LOWER(city) LIKE LOWER(?) 
         OR LOWER(state) LIKE LOWER(?)
      LIMIT 5
    `;
    const cityResult = await pool.query(cityQuery, [searchPattern, searchPattern]);
    
    cityResult.rows.forEach(row => {
      results.push({
        label: `${row.city}, ${row.state}`,
        value: row.city,
        type: 'city',
        icon: '📍'
      });
    });

    // 2. Search for specific hotels
    const hotelQuery = `
      SELECT hotel_name, city, state
      FROM hotels
      WHERE LOWER(hotel_name) LIKE LOWER(?)
      LIMIT 5
    `;
    const hotelResult = await pool.query(hotelQuery, [searchPattern]);
    
    hotelResult.rows.forEach(row => {
      results.push({
        label: `${row.hotel_name} - ${row.city}, ${row.state}`,
        value: row.hotel_name,
        type: 'hotel',
        icon: '🏨'
      });
    });

    // 3. Search for airports
    const airportQuery = `
      SELECT code, name, city
      FROM airports
      WHERE LOWER(code) LIKE LOWER(?)
         OR LOWER(name) LIKE LOWER(?)
         OR LOWER(city) LIKE LOWER(?)
      LIMIT 5
    `;
    const airportResult = await pool.query(airportQuery, [searchPattern, searchPattern, searchPattern]);
    
    airportResult.rows.forEach(row => {
      results.push({
        label: `${row.code} - ${row.name} (${row.city})`,
        value: row.code,
        type: 'airport',
        icon: '✈️'
      });
    });

    // Return combined results (max 15 items)
    res.json(results.slice(0, 15));
  } catch (error) {
    console.error('Location search error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = { searchHotels, getHotelDetails, bookHotel, searchCities };


