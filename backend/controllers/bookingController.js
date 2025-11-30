const pool = require('../config/database');

const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY booking_date DESC',
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
    
    // Allow fetching booking without authentication for confirmation page
    const result = await pool.query(
      'SELECT * FROM bookings WHERE id = ?',
      [id]
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

    // Get booking details first to retrieve seat information
    const bookingResult = await pool.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    
    // Parse booking_details to get seat information
    let bookingDetails;
    try {
      bookingDetails = typeof booking.booking_details === 'string' 
        ? JSON.parse(booking.booking_details) 
        : booking.booking_details;
    } catch (e) {
      bookingDetails = {};
    }

    console.log('Cancelling booking:', { bookingId: id, bookingDetails });

    // Get seat information from seat_info or seats field
    const seatData = bookingDetails.seat_info?.seats || bookingDetails.seats;
    const passengerCount = bookingDetails.passenger_count || 1;

    // Release seats if they exist
    if (seatData && Array.isArray(seatData) && seatData.length > 0) {
      // Handle multi-leg bookings
      const isMultiLeg = seatData.some(seat => typeof seat === 'object' && seat.flightId);
      
      if (isMultiLeg) {
        // Group seats by flight ID
        const seatsByFlight = {};
        seatData.forEach(seat => {
          const flightId = seat.flightId;
          if (!seatsByFlight[flightId]) {
            seatsByFlight[flightId] = [];
          }
          seatsByFlight[flightId].push(seat.seatNumber);
        });

        // Release seats for each flight
        for (const [flightId, seatNumbers] of Object.entries(seatsByFlight)) {
          const placeholders = seatNumbers.map(() => '?').join(', ');
          await pool.query(
            `UPDATE flight_seats 
             SET is_available = TRUE 
             WHERE flight_id = ? AND seat_number IN (${placeholders})`,
            [flightId, ...seatNumbers]
          );
          
          console.log(`Released ${seatNumbers.length} seats for flight ${flightId}:`, seatNumbers);
        }
      } else {
        // Single flight - release seats
        const flightId = bookingDetails.flight_id;
        const seatNumbers = seatData.map(s => typeof s === 'object' ? s.seatNumber : s);
        
        if (flightId && seatNumbers.length > 0) {
          const placeholders = seatNumbers.map(() => '?').join(', ');
          await pool.query(
            `UPDATE flight_seats 
             SET is_available = TRUE 
             WHERE flight_id = ? AND seat_number IN (${placeholders})`,
            [flightId, ...seatNumbers]
          );
          
          console.log(`Released ${seatNumbers.length} seats for flight ${flightId}:`, seatNumbers);
        }
      }
    }
    
    // Always restore available_seats count by passenger count
    if (passengerCount && bookingDetails.flight_id) {
      await pool.query(
        'UPDATE flights SET available_seats = available_seats + ? WHERE id = ?',
        [passengerCount, bookingDetails.flight_id]
      );
      
      console.log(`Restored ${passengerCount} seats for flight ${bookingDetails.flight_id}`);
      
      // For roundtrip bookings, also restore return flight seats
      if (bookingDetails.return_flight_id) {
        await pool.query(
          'UPDATE flights SET available_seats = available_seats + ? WHERE id = ?',
          [passengerCount, bookingDetails.return_flight_id]
        );
        
        console.log(`Restored ${passengerCount} seats for return flight ${bookingDetails.return_flight_id}`);
      }
    }

    // Update booking status to cancelled
    await pool.query(
      'UPDATE bookings SET status = ? WHERE id = ? AND user_id = ?',
      ['cancelled', id, userId]
    );

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
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

// Book hotel
const bookHotel = async (req, res) => {
  try {
    console.log('🏨 Hotel booking request received:', {
      hotel_id: req.body.hotel_id,
      check_in: req.body.check_in,
      check_out: req.body.check_out,
      rooms: req.body.rooms,
      user: req.user ? req.user.userId : 'guest'
    });

    const { hotel_id, check_in, check_out, rooms, adults, children, guest_details, payment_details, protection } = req.body;

    if (!hotel_id || !check_in || !check_out || !guest_details) {
      console.log('❌ Missing required fields:', { hotel_id, check_in, check_out, guest_details });
      return res.status(400).json({ error: 'Missing required booking information' });
    }

    // Fetch hotel details
    const hotel = await pool.query('SELECT * FROM hotels WHERE id = ?', [hotel_id]);

    if (hotel.rows.length === 0) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    // Calculate total
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
    const pricePerNight = Number(hotel.rows[0].price_per_night) || 100;
    const subtotal = pricePerNight * nights * (rooms || 1);
    const taxes = subtotal * 0.15;
    const totalAmount = subtotal + taxes;

    // Create booking reference
    const bookingReference = `HT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Get user ID (optional for guest bookings)
    const userId = req.user ? req.user.userId : null;

    // Prepare booking details
    const bookingDetails = {
      hotel_id,
      hotel_name: hotel.rows[0].hotel_name,
      city: hotel.rows[0].city,
      state: hotel.rows[0].state,
      address: hotel.rows[0].address,
      check_in,
      check_out,
      nights,
      rooms: rooms || 1,
      adults: adults || 2,
      children: children || 0,
      guest_details,
      payment_details: {
        method: payment_details?.method || 'card',
        last4: payment_details?.cardNumber ? payment_details.cardNumber.slice(-4) : '****'
      },
      protection: protection || 'none',
      price_breakdown: {
        price_per_night: pricePerNight,
        subtotal,
        taxes,
        total: totalAmount
      }
    };

    // Insert booking
    const bookingResult = await pool.query(
      `INSERT INTO bookings (user_id, booking_type, booking_reference, total_amount, booking_details, status)
       VALUES (?, ?, ?, ?, ?, 'confirmed')`,
      [userId, 'hotel', bookingReference, totalAmount, JSON.stringify(bookingDetails)]
    );

    // Get the booking ID - check if it's in rows or as insertId
    let bookingId;
    if (bookingResult.rows && bookingResult.rows.length > 0 && bookingResult.rows[0].id) {
      bookingId = bookingResult.rows[0].id;
    } else if (bookingResult.insertId) {
      bookingId = bookingResult.insertId;
    } else {
      // If neither works, query for the most recent booking
      const lastBooking = await pool.query(
        'SELECT id FROM bookings WHERE booking_reference = ?',
        [bookingReference]
      );
      bookingId = lastBooking.rows[0]?.id;
    }

    console.log('Hotel booking created:', { bookingId, bookingReference });

    res.status(201).json({
      success: true,
      message: 'Hotel booking confirmed',
      booking_id: bookingId,
      booking_reference: bookingReference
    });
  } catch (error) {
    console.error('Hotel booking error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// Get user billing/payment history
const getUserBillings = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Join billing, bookings, and payments tables to get complete billing information
    const result = await pool.query(
      `SELECT 
        b.id,
        b.billing_id,
        b.user_id,
        b.booking_id,
        b.payment_id,
        b.total_amount,
        b.tax_amount,
        b.billing_date,
        b.invoice_details,
        bk.booking_reference,
        bk.booking_type,
        bk.booking_details,
        p.transaction_id,
        p.payment_method,
        p.payment_status,
        p.payment_date
      FROM billing b
      JOIN bookings bk ON b.booking_id = bk.id
      JOIN payments p ON b.payment_id = p.id
      WHERE b.user_id = ?
      ORDER BY b.billing_date DESC`,
      [userId]
    );

    res.json({
      billings: result.rows
    });
  } catch (error) {
    console.error('Get billings error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = {
  getUserBookings,
  getBookingDetails,
  cancelBooking,
  holdBooking,
  bookHotel,
  getUserBillings
};


