const pool = require('../config/database');
const seatService = require('../services/seatService');

// ========== BOOKINGS ==========
const getAllBookings = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = ?`;
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND DATE(booking_date) >= ?`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND DATE(booking_date) <= ?`;
    }

    query += ' ORDER BY booking_date DESC';

    const result = await pool.query(query, params);

    res.json({
      bookings: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM bookings WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    // Get booking details
    const booking = await pool.query(
      'SELECT * FROM bookings WHERE id = ?',
      [id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update booking status
    await pool.query(
      'UPDATE bookings SET status = ?, payment_status = ? WHERE id = ?',
      ['cancelled', 'refunded', id]
    );

    // If flight booking, restore seat availability
    const bookingData = booking.rows[0];
    if (bookingData.booking_type === 'flight') {
      const details = JSON.parse(bookingData.booking_details);
      if (details.flight_id) {
        await pool.query(
          'UPDATE flights SET available_seats = available_seats + 1 WHERE id = ?',
          [details.flight_id]
        );
      }
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ========== FLIGHTS MANAGEMENT ==========
const getAllFlights = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM flights ORDER BY departure_time DESC'
    );

    res.json({
      flights: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createFlight = async (req, res) => {
  try {
    const {
      airline,
      flight_number,
      departure_city,
      arrival_city,
      departure_time,
      arrival_time,
      price,
      available_seats,
      total_seats,
      aircraft_type,
      carry_on_fee,
      checked_bag_fee,
      baggage_allowance
    } = req.body;

    // Validate required fields
    if (!airline || !flight_number || !departure_city || !arrival_city ||
      !departure_time || !arrival_time || !price || !available_seats) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO flights (
        airline, flight_number, departure_city, arrival_city,
        departure_time, arrival_time, price, available_seats, total_seats,
        aircraft_type, carry_on_fee, checked_bag_fee, baggage_allowance,
        seat_configuration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        airline,
        flight_number,
        departure_city,
        arrival_city,
        departure_time,
        arrival_time,
        price,
        available_seats,
        total_seats || available_seats,
        aircraft_type || 'Boeing 737',
        carry_on_fee || 0,
        checked_bag_fee || 0,
        baggage_allowance || '1 carry-on, 1 checked bag',
        JSON.stringify({ rows: 30, columns: ['A', 'B', 'C', 'D', 'E', 'F'], type: 'economy' })
      ]
    );

    const flightId = result.rows[0]?.id;

    // Generate seats for the new flight
    if (flightId) {
      await seatService.generateSeatsForFlight(flightId);
    }

    res.status(201).json({
      message: 'Flight created successfully',
      flight_id: flightId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateFlight = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    await pool.query(
      `UPDATE flights SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Flight updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteFlight = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if there are any bookings for this flight
    const bookings = await pool.query(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE booking_type = 'flight' 
       AND JSON_EXTRACT(booking_details, '$.flight_id') = ?
       AND status != 'cancelled'`,
      [id]
    );

    if (parseInt(bookings.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete flight with active bookings. Please cancel bookings first.'
      });
    }

    await pool.query('DELETE FROM flights WHERE id = ?', [id]);

    res.json({ message: 'Flight deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ========== ANALYTICS ==========
const getAnalytics = async (req, res) => {
  try {
    const bookingsCount = await pool.query('SELECT COUNT(*) as count FROM bookings');
    const totalRevenue = await pool.query(
      'SELECT SUM(total_amount) as sum FROM bookings WHERE status = ?',
      ['confirmed']
    );
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const flightsCount = await pool.query('SELECT COUNT(*) as count FROM flights');

    res.json({
      totalBookings: parseInt(bookingsCount.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].sum || 0),
      totalUsers: parseInt(usersCount.rows[0].count),
      totalFlights: parseInt(flightsCount.rows[0].count)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'daily' } = req.query;

    let dateFormat;
    if (period === 'daily') {
      dateFormat = '%Y-%m-%d';
    } else if (period === 'weekly') {
      dateFormat = '%Y-%U';
    } else {
      dateFormat = '%Y-%m';
    }

    const result = await pool.query(
      `SELECT 
        DATE_FORMAT(booking_date, ?) as period,
        SUM(total_amount) as revenue,
        COUNT(*) as bookings
       FROM bookings
       WHERE status = 'confirmed'
       GROUP BY period
       ORDER BY period DESC
       LIMIT 30`,
      [dateFormat]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};


const getPopularRoutes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        f.departure_city,
        f.arrival_city,
        COUNT(b.id) as bookings,
        SUM(b.total_amount) as revenue
       FROM flights f
       LEFT JOIN bookings b ON JSON_EXTRACT(b.booking_details, '$.flight_id') = f.id
       WHERE b.payment_status = 'paid'
       GROUP BY f.departure_city, f.arrival_city
       ORDER BY bookings DESC
       LIMIT 10`
    );

    res.json({ routes: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ========== USERS ==========
const getAllUsers = async (req, res) => {
  try {
    console.log('📊 getAllUsers called');
    // IMPORTANT: Exclude password and password_hash for security
    const result = await pool.query(
      `SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        phone_number, 
        role,
        address,
        city,
        state,
        zip_code,
        created_at
       FROM users
       ORDER BY created_at DESC`
    );

    console.log('✅ Users query result:', result.rows.length, 'users found');
    console.log('Sample user:', result.rows[0]);

    res.json({
      users: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error in getAllUsers:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  // Bookings
  getAllBookings,
  getBookingDetails,
  cancelBooking,

  // Flights
  getAllFlights,
  createFlight,
  updateFlight,
  deleteFlight,

  // Analytics
  getAnalytics,
  getRevenueAnalytics,
  getPopularRoutes,

  // Users
  getAllUsers
};
