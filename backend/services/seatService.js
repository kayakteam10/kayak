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
            throw new Error('Seat numbers must be a non-empty array');
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
        console.error('Error reserving seats:', error);
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

        const placeholders = seatNumbers.map(() => '?').join(', ');
        const result = await pool.query(
            `SELECT SUM(price_modifier) as total 
       FROM flight_seats 
       WHERE flight_id = ? AND seat_number IN (${placeholders})`,
            [flightId, ...seatNumbers]
        );

        return parseFloat(result.rows[0].total || 0);
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
