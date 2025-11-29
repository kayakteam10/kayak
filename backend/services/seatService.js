const pool = require('../config/database');

/**
 * Generate seats for a flight based on configuration
 */
const generateSeatsForFlight = async (flightId) => {
    try {
        // Get flight configuration
        const flightResult = await pool.query(
            'SELECT seat_configuration FROM flights WHERE id = ?',
            [flightId]
        );

        if (flightResult.rows.length === 0) {
            throw new Error('Flight not found');
        }

        const config = flightResult.rows[0].seat_configuration || {};
        const rows = config.rows || 30;
        const columns = config.columns || ['A', 'B', 'C', 'D', 'E', 'F'];

        // Check if seats already exist
        const existingSeats = await pool.query(
            'SELECT COUNT(*) as count FROM flight_seats WHERE flight_id = ?',
            [flightId]
        );

        if (existingSeats.rows[0].count > 0) {
            return { message: 'Seats already generated for this flight' };
        }

        // Generate seats
        const seats = [];
        for (let row = 1; row <= rows; row++) {
            for (const col of columns) {
                const seatNumber = `${row}${col}`;
                let seatType = 'economy';
                let priceModifier = 0;

                // Premium seats (exit rows)
                if (row === 12 || row === 13) {
                    seatType = 'premium';
                    priceModifier = 20;
                }
                // Preferred seats (front rows)
                else if (row <= 5) {
                    seatType = 'premium';
                    priceModifier = 10;
                }

                seats.push([flightId, seatNumber, seatType, true, priceModifier]);
            }
        }

        // Batch insert
        const values = seats.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const flatValues = seats.flat();

        await pool.query(
            `INSERT INTO flight_seats (flight_id, seat_number, seat_type, is_available, price_modifier) 
       VALUES ${values}`,
            flatValues
        );

        return { message: `Generated ${seats.length} seats for flight ${flightId}` };
    } catch (error) {
        console.error('Error generating seats:', error);
        throw error;
    }
};

/**
 * Get available seats for a flight
 */
const getAvailableSeats = async (flightId) => {
    try {
        const result = await pool.query(
            `SELECT seat_number, seat_type, is_available, price_modifier 
       FROM flight_seats 
       WHERE flight_id = ? 
       ORDER BY seat_number`,
            [flightId]
        );

        return result.rows;
    } catch (error) {
        console.error('Error getting seats:', error);
        throw error;
    }
};

/**
 * Reserve seats for a booking
 */
const reserveSeats = async (flightId, seatNumbers) => {
    try {
        if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
            return { message: 'No seats to reserve', seats: [] };
        }

        // Check if seatNumbers contains objects with flightId (multi-leg) or just strings (single flight)
        const isMultiLeg = seatNumbers.some(seat => typeof seat === 'object' && seat.flightId);

        if (isMultiLeg) {
            // Group seats by flight ID
            const seatsByFlight = {};
            seatNumbers.forEach(seat => {
                const fId = seat.flightId || flightId;
                if (!seatsByFlight[fId]) {
                    seatsByFlight[fId] = [];
                }
                seatsByFlight[fId].push(typeof seat === 'object' ? seat.seatNumber : seat);
            });

            // Reserve seats for each flight
            const results = [];
            for (const [fId, seats] of Object.entries(seatsByFlight)) {
                const result = await reserveSeatsForFlight(fId, seats);
                results.push(result);
            }

            return {
                message: 'Seats reserved successfully for all flights',
                seats: results.flatMap(r => r.seats)
            };
        } else {
            // Single flight - use existing logic
            const seats = seatNumbers.map(s => typeof s === 'object' ? s.seatNumber : s);
            return await reserveSeatsForFlight(flightId, seats);
        }
    } catch (error) {
        console.error('Error reserving seats:', error);
        throw error;
    }
};

/**
 * Reserve seats for a single flight
 */
const reserveSeatsForFlight = async (flightId, seatNumbers) => {
    try {
        if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
            return { message: 'No seats to reserve for this flight', seats: [] };
        }

        // Check if all seats are available
        const placeholders = seatNumbers.map(() => '?').join(', ');
        const checkResult = await pool.query(
            `SELECT seat_number, is_available 
       FROM flight_seats 
       WHERE flight_id = ? AND seat_number IN (${placeholders})`,
            [flightId, ...seatNumbers]
        );

        if (checkResult.rows.length !== seatNumbers.length) {
            throw new Error('Some seats do not exist');
        }

        const unavailableSeats = checkResult.rows.filter(s => !s.is_available);
        if (unavailableSeats.length > 0) {
            throw new Error(`Seats already taken: ${unavailableSeats.map(s => s.seat_number).join(', ')}`);
        }

        // Reserve the seats
        await pool.query(
            `UPDATE flight_seats 
       SET is_available = FALSE 
       WHERE flight_id = ? AND seat_number IN (${placeholders})`,
            [flightId, ...seatNumbers]
        );

        return { message: 'Seats reserved successfully', seats: seatNumbers };
    } catch (error) {
        console.error('Error reserving seats for flight:', error);
        throw error;
    }
};

/**
 * Calculate total seat price modifier
 */
const calculateSeatPrice = async (flightId, seatNumbers) => {
    try {
        if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
            return 0;
        }

        // Check if seatNumbers contains objects with flightId (multi-leg) or just strings (single flight)
        const isMultiLeg = seatNumbers.some(seat => typeof seat === 'object' && seat.flightId);

        if (isMultiLeg) {
            // Group seats by flight ID
            const seatsByFlight = {};
            seatNumbers.forEach(seat => {
                const fId = seat.flightId || flightId;
                if (!seatsByFlight[fId]) {
                    seatsByFlight[fId] = [];
                }
                seatsByFlight[fId].push(typeof seat === 'object' ? seat.seatNumber : seat);
            });

            // Calculate price for each flight
            let totalPrice = 0;
            for (const [fId, seats] of Object.entries(seatsByFlight)) {
                const placeholders = seats.map(() => '?').join(', ');
                const result = await pool.query(
                    `SELECT SUM(price_modifier) as total 
           FROM flight_seats 
           WHERE flight_id = ? AND seat_number IN (${placeholders})`,
                    [fId, ...seats]
                );
                totalPrice += parseFloat(result.rows[0].total || 0);
            }

            return totalPrice;
        } else {
            // Single flight - use existing logic
            const seats = seatNumbers.map(s => typeof s === 'object' ? s.seatNumber : s);
            const placeholders = seats.map(() => '?').join(', ');
            const result = await pool.query(
                `SELECT SUM(price_modifier) as total 
       FROM flight_seats 
       WHERE flight_id = ? AND seat_number IN (${placeholders})`,
                [flightId, ...seats]
            );

            return parseFloat(result.rows[0].total || 0);
        }
    } catch (error) {
        console.error('Error calculating seat price:', error);
        return 0;
    }
};

module.exports = {
    generateSeatsForFlight,
    getAvailableSeats,
    reserveSeats,
    calculateSeatPrice
};
