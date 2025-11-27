const pool = require('../config/database');

const searchCars = async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const result = await pool.query(
      `SELECT * FROM cars 
       WHERE (LOWER(city) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?))
       AND available = true
       ORDER BY price_per_day ASC`,
      [`%${location}%`, `%${location}%`]
    );

    res.json({
      cars: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getCarDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM cars WHERE id = ?', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const bookCar = async (req, res) => {
  try {
    const { car_id, rental_details } = req.body;
    const userId = req.user ? req.user.userId : null;

    const car = await pool.query('SELECT * FROM cars WHERE id = ?', [car_id]);

    if (car.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const bookingReference = `CR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const bookingResult = await pool.query(
      `INSERT INTO bookings (user_id, booking_type, booking_reference, total_amount, booking_details, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, 'car', bookingReference, car.rows[0].price_per_day,
       JSON.stringify({ car_id, rental_details, car_details: car.rows[0] })]
    );
    
    const bookingId = bookingResult.insertId;
    const [bookingRow] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);

    res.status(201).json({
      message: 'Car booking created',
      booking: bookingRow[0] || { id: bookingId, booking_reference: bookingReference }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { searchCars, getCarDetails, bookCar };


