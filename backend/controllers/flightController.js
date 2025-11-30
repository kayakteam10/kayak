const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Normalize city name: strip state/country suffixes and airport codes
const normalizeCityName = (cityName) => {
  if (!cityName) return '';

  let normalized = cityName.trim();

  // Remove airport codes in parentheses: "New York (JFK)" → "New York"
  normalized = normalized.replace(/\s*\([A-Z]{3,4}\)\s*$/i, '');

  // Remove state/country suffixes: "New York, NY" → "New York"
  normalized = normalized.replace(/\s*,\s*[A-Z]{2,3}(\s*\([^)]+\))?\s*$/i, '');
  normalized = normalized.replace(/\s*,\s*(USA|United States|US)\s*$/i, '');

  // Remove extra whitespace
  normalized = normalized.trim();

  return normalized;
};

// Search flights
const searchFlights = async (req, res) => {
  try {
    const { origin, destination, departure_date, return_date, passengers = 1, tripType } = req.query;

    // Handle multi-city searches
    if (tripType === 'multicity') {
      // Parse multi-city leg parameters
      const legs = [];

      // Try parsing 'legs' JSON parameter first (from frontend)
      if (req.query.legs) {
        try {
          const parsedLegs = JSON.parse(req.query.legs);
          if (Array.isArray(parsedLegs)) {
            parsedLegs.forEach(leg => {
              if (leg.from && leg.to && (leg.date || leg.departDate)) {
                legs.push({
                  from: normalizeCityName(leg.from),
                  to: normalizeCityName(leg.to),
                  date: leg.date || leg.departDate
                });
              }
            });
          }
        } catch (error) {
          console.error('Error parsing legs parameter:', error);
        }
      }

      // Fallback to individual parameters if legs array is still empty
      if (legs.length === 0) {
        let legIndex = 1;
        while (req.query[`leg${legIndex}_from`] && req.query[`leg${legIndex}_to`] && req.query[`leg${legIndex}_date`]) {
          legs.push({
            from: normalizeCityName(req.query[`leg${legIndex}_from`]),
            to: normalizeCityName(req.query[`leg${legIndex}_to`]),
            date: req.query[`leg${legIndex}_date`]
          });
          legIndex++;
        }
      }

      if (legs.length === 0) {
        return res.status(400).json({ error: 'Missing required multi-city leg parameters' });
      }

      console.log('🔍 Multi-city search:', {
        legsCount: legs.length,
        legs: legs.map((leg, i) => ({ leg: i + 1, from: leg.from, to: leg.to, date: leg.date }))
      });

      // Search for each leg separately
      const legResults = [];
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        const legStart = `${leg.date} 00:00:00`;
        const legEnd = `${leg.date} 23:59:59`;

        const legQuery = `
          SELECT f.*, dep.city as departure_city, arr.city as arrival_city 
          FROM flights f
          INNER JOIN airports dep ON f.departure_airport = dep.code
          INNER JOIN airports arr ON f.arrival_airport = arr.code
          WHERE (LOWER(dep.city) LIKE ? OR LOWER(dep.city) = ?)
            AND (LOWER(arr.city) LIKE ? OR LOWER(arr.city) = ?)
            AND f.departure_time BETWEEN ? AND ?
            AND f.available_seats >= ?
          ORDER BY f.price ASC`;

        const legFromLower = leg.from.toLowerCase();
        const legToLower = leg.to.toLowerCase();
        const legParams = [
          `%${legFromLower}%`, legFromLower,
          `%${legToLower}%`, legToLower,
          legStart, legEnd, parseInt(passengers)
        ];

        const legResult = await pool.query(legQuery, legParams);

        console.log(`🔍 Leg ${i + 1} (${leg.from} → ${leg.to}, ${leg.date}):`, {
          found: legResult.rows.length
        });

        if (legResult.rows.length === 0) {
          // If any leg has no results, return empty
          return res.json({
            flights: [],
            total: 0,
            searchParams: { tripType: 'multicity', legs }
          });
        }

        legResults.push(legResult.rows);
      }

      // Combine all leg results into multi-city options
      // Each combination is one flight option with all legs
      const multiCityFlights = [];

      // Generate all combinations of flights across legs
      const generateCombinations = (legIndex, currentCombination) => {
        if (legIndex === legResults.length) {
          // Calculate total price
          const totalPrice = currentCombination.reduce((sum, flight) => {
            return sum + parseFloat(flight.price || 0);
          }, 0);

          multiCityFlights.push({
            legs: currentCombination,
            total_price: totalPrice,
            is_multicity: true,
            leg_count: legResults.length
          });
          return;
        }

        // Try each flight option for this leg
        legResults[legIndex].forEach(flight => {
          generateCombinations(legIndex + 1, [...currentCombination, flight]);
        });
      };

      generateCombinations(0, []);

      console.log('🔍 Multi-city combinations:', {
        legsCount: legResults.length,
        flightsPerLeg: legResults.map(leg => leg.length),
        totalCombinations: multiCityFlights.length
      });

      return res.json({
        flights: multiCityFlights,
        total: multiCityFlights.length,
        searchParams: { tripType: 'multicity', legs }
      });
    }

    // Handle regular one-way and roundtrip searches
    if (!origin || !destination || !departure_date) {
      return res.status(400).json({ error: 'Missing required search parameters' });
    }

    // Normalize city names
    const normalizedOrigin = normalizeCityName(origin);
    const normalizedDestination = normalizeCityName(destination);

    // Build day-range date filters (00:00:00 to 23:59:59)
    const departStart = `${departure_date} 00:00:00`;
    const departEnd = `${departure_date} 23:59:59`;

    // Search for outbound flights with case-insensitive matching and day-range date filter
    // Join with airports table to search by city name
    const outboundQuery = `
      SELECT f.*, dep.city as departure_city, arr.city as arrival_city 
      FROM flights f
      INNER JOIN airports dep ON f.departure_airport = dep.code
      INNER JOIN airports arr ON f.arrival_airport = arr.code
      WHERE (LOWER(dep.city) LIKE ? OR LOWER(dep.city) = ?)
        AND (LOWER(arr.city) LIKE ? OR LOWER(arr.city) = ?)
        AND f.departure_time BETWEEN ? AND ?
        AND f.available_seats >= ?
      ORDER BY f.price ASC`;

    // Use LIKE with % wildcards for flexible matching, also try exact match
    const normalizedOriginLower = normalizedOrigin.toLowerCase();
    const normalizedDestinationLower = normalizedDestination.toLowerCase();
    const outboundParams = [
      `%${normalizedOriginLower}%`, normalizedOriginLower,
      `%${normalizedDestinationLower}%`, normalizedDestinationLower,
      departStart, departEnd, parseInt(passengers)
    ];

    const outboundResult = await pool.query(outboundQuery, outboundParams);

    // Log actual SQL query with bound values for debugging
    const outboundParamsCopy = [...outboundParams];
    const outboundSqlDebug = outboundQuery
      .replace(/\?/g, () => {
        const val = outboundParamsCopy.shift();
        if (val === undefined) return 'undefined';
        return typeof val === 'string' ? `'${val}'` : val;
      });

    console.log('🔍 Outbound search:', {
      original: { origin, destination },
      normalized: { origin: normalizedOrigin, destination: normalizedDestination },
      departure_date,
      dateRange: { start: departStart, end: departEnd },
      passengers,
      found: outboundResult.rows.length,
      sql: outboundSqlDebug
    });

    let flights = outboundResult.rows;
    let missingLeg = null;

    // If return_date is provided, search for return flights and combine them
    if (return_date) {
      // Build day-range date filter for return flights
      const returnStart = `${return_date} 00:00:00`;
      const returnEnd = `${return_date} 23:59:59`;

      // Return flights: destination → origin (reversed route)
      // Join with airports table to search by city name
      const returnQuery = `
        SELECT f.*, dep.city as departure_city, arr.city as arrival_city 
        FROM flights f
        INNER JOIN airports dep ON f.departure_airport = dep.code
        INNER JOIN airports arr ON f.arrival_airport = arr.code
        WHERE (LOWER(dep.city) LIKE ? OR LOWER(dep.city) = ?)
          AND (LOWER(arr.city) LIKE ? OR LOWER(arr.city) = ?)
          AND f.departure_time BETWEEN ? AND ?
          AND f.available_seats >= ?
        ORDER BY f.price ASC`;

      // Use LIKE with % wildcards for flexible matching, also try exact match
      const normalizedDestinationLower = normalizedDestination.toLowerCase();
      const normalizedOriginLower = normalizedOrigin.toLowerCase();
      const returnParams = [
        `%${normalizedDestinationLower}%`, normalizedDestinationLower,
        `%${normalizedOriginLower}%`, normalizedOriginLower,
        returnStart, returnEnd, parseInt(passengers)
      ];

      const returnResult = await pool.query(returnQuery, returnParams);

      // Check for missing legs
      if (outboundResult.rows.length === 0) {
        missingLeg = 'outbound';
      } else if (returnResult.rows.length === 0) {
        missingLeg = 'return';
      }

      // Log actual SQL query with bound values for debugging
      const returnParamsCopy = [...returnParams];
      const returnSqlDebug = returnQuery
        .replace(/\?/g, () => {
          const val = returnParamsCopy.shift();
          if (val === undefined) return 'undefined';
          return typeof val === 'string' ? `'${val}'` : val;
        });

      console.log('🔍 Return search:', {
        original: { origin: destination, destination: origin },
        normalized: { origin: normalizedDestination, destination: normalizedOrigin },
        return_date,
        dateRange: { start: returnStart, end: returnEnd },
        passengers,
        found: returnResult.rows.length,
        sql: returnSqlDebug
      });

      const returnFlights = returnResult.rows;

      // Combine outbound and return flights into roundtrip options
      // Each outbound flight can be paired with each return flight
      const roundtripFlights = [];
      outboundResult.rows.forEach(outbound => {
        returnFlights.forEach(returnFlight => {
          roundtripFlights.push({
            ...outbound,
            return_flight: returnFlight,
            total_price: parseFloat(outbound.price) + parseFloat(returnFlight.price),
            is_roundtrip: true
          });
        });
      });

      console.log('🔍 Roundtrip combinations:', {
        outboundCount: outboundResult.rows.length,
        returnCount: returnFlights.length,
        roundtripCount: roundtripFlights.length
      });

      flights = roundtripFlights;
    } else {
      // One-way flights - mark them as such
      flights = outboundResult.rows.map(flight => ({
        ...flight,
        is_roundtrip: false
      }));
    }

    // Log final normalized params
    console.log('✅ Final search results:', {
      normalizedParams: {
        origin: normalizedOrigin,
        destination: normalizedDestination,
        departure_date,
        return_date: return_date || null,
        passengers
      },
      totalFlights: flights.length
    });

    const response = {
      flights: flights,
      total: flights.length,
      searchParams: {
        origin: normalizedOrigin,
        destination: normalizedDestination,
        departure_date,
        return_date,
        passengers
      }
    };

    // Add missingLeg if applicable
    if (missingLeg) {
      response.missingLeg = missingLeg;
    }

    res.json(response);
  } catch (error) {
    console.error('Flight search error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// Get flight details
const getFlightDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT f.*, dep.city as departure_city, arr.city as arrival_city 
       FROM flights f
       INNER JOIN airports dep ON f.departure_airport = dep.code
       INNER JOIN airports arr ON f.arrival_airport = arr.code
       WHERE f.id = ?`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Book flight
const bookFlight = async (req, res) => {
  try {
    const { flight_id, passenger_details, passengers, payment_details, selected_seats } = req.body;
    const userId = req.user ? req.user.userId : null;

    // Support both old format (passenger_details) and new format (passengers array)
    let passengerData;
    let passengerCount = 1;

    if (passengers && Array.isArray(passengers)) {
      // New format: array of passengers
      passengerData = passengers;
      passengerCount = passengers.length;

      // Validate passengers array
      if (passengers.length === 0) {
        return res.status(400).json({ error: 'At least one passenger is required' });
      }

      // Validate each passenger
      for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i];
        if (!p.firstName || !p.lastName || !p.email) {
          return res.status(400).json({
            error: `Passenger ${i + 1}: Missing required fields (firstName, lastName, email)`
          });
        }
      }
    } else if (passenger_details) {
      // Old format: single passenger object (backward compatibility)
      passengerData = passenger_details;
      passengerCount = 1;
    } else {
      return res.status(400).json({ error: 'Missing required passenger information' });
    }

    if (!flight_id) {
      return res.status(400).json({ error: 'Missing flight_id' });
    }

    // Check flight availability
    const flight = await pool.query(
      'SELECT * FROM flights WHERE id = ?',
      [flight_id]
    );

    if (flight.rows.length === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    // Check if enough seats available for all passengers
    if (flight.rows[0].available_seats < passengerCount) {
      return res.status(400).json({
        error: `Not enough seats available. Required: ${passengerCount}, Available: ${flight.rows[0].available_seats}`
      });
    }

    const flightData = flight.rows[0];
    let baseAmount = flightData.price * passengerCount; // Base price × number of passengers

    // Handle seat selection
    let seatInfo = null;
    let seatPrice = 0;
    if (selected_seats && selected_seats.length > 0) {
      const seatService = require('../services/seatService');

      // Validate seat count matches passenger count (or multiple thereof for round-trip/multi-leg)
      if (selected_seats.length % passengerCount !== 0) {
        return res.status(400).json({
          error: `Seat count (${selected_seats.length}) must be a multiple of passenger count (${passengerCount}) for multi-leg flights`
        });
      }

      try {
        // Calculate seat price modifier
        seatPrice = await seatService.calculateSeatPrice(flight_id, selected_seats);
        baseAmount += seatPrice;

        // Reserve seats
        await seatService.reserveSeats(flight_id, selected_seats);

        seatInfo = {
          seats: selected_seats,
          seatPrice: seatPrice
        };
      } catch (seatError) {
        return res.status(400).json({
          error: seatError.message || 'Seat reservation failed'
        });
      }
    }

    // Calculate total with 10% tax (matching frontend)
    const taxAmount = baseAmount * 0.1;
    const totalAmount = baseAmount + taxAmount;

    console.log('💳 Processing Payment:', {
      userId,
      flight_id,
      baseAmount,
      taxAmount,
      totalAmount,
      passengerCount,
      seatPrice
    });

    // Process Payment
    let paymentResult;
    try {
      if (payment_details) {
        const { processPayment } = require('../services/paymentService');
        paymentResult = await processPayment(payment_details, totalAmount);
      } else {
        console.warn('Processing booking without payment details (Legacy Mode)');
      }
    } catch (paymentError) {
      return res.status(402).json({
        error: paymentError.message || 'Payment failed',
        details: paymentError
      });
    }

    // Create booking
    const bookingReference = `FL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const status = paymentResult ? 'confirmed' : 'pending';

    const bookingResult = await pool.query(
      `INSERT INTO bookings (user_id, booking_type, booking_reference, total_amount, booking_details, status)
       VALUES (?, ?, ?, ?, ?, ?)` ,
      [
        userId,
        'flight',
        bookingReference,
        totalAmount,
        JSON.stringify({
          flight_id,
          passengers: passengerData, // Store as 'passengers' regardless of input format
          passenger_count: passengerCount,
          flight_details: flightData,
          payment_info: paymentResult,
          seat_info: seatInfo,
          pricing: {
            base_amount: baseAmount,
            seat_price: seatPrice,
            tax_amount: taxAmount,
            total_amount: totalAmount
          }
        }),
        status
      ]
    );

    // Our pool.query returns rows [{ id: insertId }] for INSERTs
    const bookingId = bookingResult?.rows?.[0]?.id || null;
    const bookingRowResult = bookingId ? await pool.query(
      'SELECT * FROM bookings WHERE id = ?',
      [bookingId]
    ) : { rows: [] };
    const bookingRow = bookingRowResult.rows?.[0] || null;

    // Update available seats (reduce by passenger count)
    await pool.query(
      'UPDATE flights SET available_seats = available_seats - ? WHERE id = ?',
      [passengerCount, flight_id]
    );

    console.log('✅ Booking created:', {
      bookingId,
      bookingReference,
      passengerCount,
      totalAmount,
      seatsReserved: selected_seats?.length || 0
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking: bookingRow || { id: bookingId, booking_reference: bookingReference }
    });
  } catch (error) {
    console.error('❌ Booking Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// Get available seats for a flight
const getFlightSeats = async (req, res) => {
  try {
    const { id } = req.params;
    const seatService = require('../services/seatService');

    // Try to get seats
    let seats = await seatService.getAvailableSeats(id);

    // If no seats exist, generate them
    if (seats.length === 0) {
      await seatService.generateSeatsForFlight(id);
      seats = await seatService.getAvailableSeats(id);
    }

    res.json({ seats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Search airports (dynamic autocomplete)
const searchAirports = async (req, res) => {
  try {
    const { query } = req.query;

    // If no query, return empty array
    if (!query || query.trim() === '') {
      return res.json([]);
    }

    const searchTerm = query.trim();

    // Case-insensitive search across code, city, and name
    // Using LOWER() for case-insensitive matching in MySQL
    const searchQuery = `
      SELECT code, name, city, state, country
      FROM airports
      WHERE LOWER(code) LIKE LOWER(?) 
         OR LOWER(city) LIKE LOWER(?)
         OR LOWER(name) LIKE LOWER(?)
      ORDER BY 
        CASE 
          WHEN LOWER(code) = LOWER(?) THEN 1
          WHEN LOWER(city) = LOWER(?) THEN 2
          WHEN LOWER(code) LIKE LOWER(?) THEN 3
          WHEN LOWER(city) LIKE LOWER(?) THEN 4
          ELSE 5
        END,
        city ASC
      LIMIT 10
    `;

    // Parameters for LIKE search (with wildcards) and exact match priority
    const searchPattern = `%${searchTerm}%`;
    const params = [
      searchPattern,  // code LIKE
      searchPattern,  // city LIKE
      searchPattern,  // name LIKE
      searchTerm,     // exact code match (priority 1)
      searchTerm,     // exact city match (priority 2)
      `${searchTerm}%`, // code starts with (priority 3)
      `${searchTerm}%`  // city starts with (priority 4)
    ];

    const result = await pool.query(searchQuery, params);

    // Format response: code, label (formatted string), city
    const airports = result.rows.map(airport => ({
      code: airport.code,
      label: `${airport.city} - ${airport.name} (${airport.code})`,
      city: airport.city,
      state: airport.state,
      country: airport.country
    }));

    console.log('🔍 Airport search:', {
      query: searchTerm,
      found: airports.length
    });

    res.json(airports);
  } catch (error) {
    console.error('Airport search error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = {
  searchFlights,
  getFlightDetails,
  bookFlight,
  getFlightSeats,
  searchAirports
};


