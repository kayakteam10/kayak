const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const searchHotels = async (req, res) => {
  try {
    const { location, check_in, check_out, guests = 1 } = req.query;

    if (!location || !check_in || !check_out) {
      return res.status(400).json({ error: 'Missing required search parameters' });
    }

    const result = await pool.query(
      `SELECT * FROM hotels 
       WHERE (LOWER(city) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?))
       AND available_rooms >= ?
       ORDER BY price_per_night ASC, rating DESC`,
      [`%${location}%`, `%${location}%`, guests]
    );

    res.json({
      hotels: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
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
    
    const bookingResult = await pool.query(
      `INSERT INTO bookings (user_id, booking_type, booking_reference, total_amount, booking_details, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, 'hotel', bookingReference, hotel.rows[0].price_per_night, 
       JSON.stringify({ hotel_id, guest_info, hotel_details: hotel.rows[0] })]
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

module.exports = { searchHotels, getHotelDetails, bookHotel };


