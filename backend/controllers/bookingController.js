const pool = require('../config/database');

const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      bookings: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await pool.query(
      'UPDATE bookings SET status = ? WHERE id = ? AND user_id = ?',
      ['cancelled', id, userId]
    );

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Hold booking (temporary hold for roundtrip flights)
const holdBooking = async (req, res) => {
  try {
    const { flight_id, return_flight_id, passengers, trip_type } = req.body;
    
    // Authentication is required for booking
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required to create a booking' });
    }
    
    const userId = req.user.userId;

    if (!flight_id) {
      return res.status(400).json({ error: 'Missing required booking information' });
    }

    // Check flight availability
    const flight = await pool.query(
      'SELECT * FROM flights WHERE id = ?',
      [flight_id]
    );

    if (flight.rows.length === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    let totalPrice = parseFloat(flight.rows[0].price || 0);
    let bookingDetails = {
      flight_id,
      passenger_count: passengers || 1,
      flight_details: flight.rows[0]
    };

    // For roundtrip, check return flight
    if (trip_type === 'roundtrip' && return_flight_id) {
      const returnFlight = await pool.query(
        'SELECT * FROM flights WHERE id = ?',
        [return_flight_id]
      );

      if (returnFlight.rows.length === 0) {
        return res.status(404).json({ error: 'Return flight not found' });
      }

      totalPrice += parseFloat(returnFlight.rows[0].price || 0);
      bookingDetails.return_flight_id = return_flight_id;
      bookingDetails.return_flight_details = returnFlight.rows[0];
    }

    // Check available seats
    const minSeats = Math.min(
      flight.rows[0].available_seats || 0,
      return_flight_id ? (await pool.query('SELECT available_seats FROM flights WHERE id = ?', [return_flight_id])).rows[0]?.available_seats || 0 : flight.rows[0].available_seats || 0
    );

    if (minSeats < (passengers || 1)) {
      return res.status(400).json({ error: 'Not enough seats available' });
    }

    // Create hold booking (status: 'pending')
    const bookingReference = `HLD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const bookingResult = await pool.query(
      `INSERT INTO bookings (user_id, booking_type, booking_reference, total_amount, booking_details, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        'flight',
        bookingReference,
        totalPrice,
        JSON.stringify(bookingDetails)
      ]
    );
    
    // Extract the inserted ID from the result
    const bookingId = bookingResult.rows && bookingResult.rows[0] ? bookingResult.rows[0].id : null;
    
    if (!bookingId) {
      return res.status(500).json({ error: 'Failed to create booking' });
    }
    
    const bookingRowResult = await pool.query(
      'SELECT * FROM bookings WHERE id = ?',
      [bookingId]
    );
    const bookingRow = bookingRowResult.rows[0];

    res.status(201).json({
      message: 'Booking hold created successfully',
      booking_reference: bookingReference,
      booking: bookingRow || { id: bookingId, booking_reference: bookingReference },
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes hold
    });
  } catch (error) {
    console.error('Hold booking error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = {
  getUserBookings,
  getBookingDetails,
  cancelBooking,
  holdBooking
};


