/**
 * FlightRepository
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles database operations for flights
 * - Dependency Inversion: Accepts database pool as dependency
 * 
 * Batching Strategies:
 * - Single queries with multiple conditions
 * - Transactions for atomic operations
 * - LIMIT clauses for autocomplete
 */

class FlightRepository {
    constructor(dbPool) {
        this.db = dbPool;
    }

    /**
     * Search flights with filters
     * Batching: Single query with multiple conditions
     * 
     * @param {Object} filters - Search criteria
     * @returns {Promise<Array>} - List of flights
     */
    async searchFlights(filters) {
        const { origin, destination, date, passengers = 1, tripType = 'oneway' } = filters;

        const query = `
      SELECT 
        f.*,
        dep.name as departure_airport_name,
        dep.city as departure_city,
        dep.state as departure_state,
        arr.name as arrival_airport_name,
        arr.city as arrival_city,
        arr.state as arrival_state
      FROM flights f
      INNER JOIN airports dep ON f.departure_airport = dep.code
      INNER JOIN airports arr ON f.arrival_airport = arr.code
      WHERE f.departure_airport = ?
        AND f.arrival_airport = ?
        AND DATE(f.departure_time) = ?
        AND f.available_seats >= ?
        AND f.status = 'scheduled'
      ORDER BY f.departure_time ASC
    `;

        const [rows] = await this.db.execute(query, [origin, destination, date, passengers]);
        return rows;
    }

    /**
     * Find flight by ID with airport details
     * 
     * @param {number} flightId
     * @returns {Promise<Object|null>}
     */
    async findById(flightId) {
        const query = `
      SELECT 
        f.*,
        dep.name as departure_airport_name,
        dep.city as departure_city,
        dep.state as departure_state,
        arr.name as arrival_airport_name,
        arr.city as arrival_city,
        arr.state as arrival_state
      FROM flights f
      INNER JOIN airports dep ON f.departure_airport = dep.code
      INNER JOIN airports arr ON f.arrival_airport = arr.code
      WHERE f.id = ?
    `;

        const [rows] = await this.db.execute(query, [flightId]);
        return rows[0] || null;
    }

    /**
     * Get available seats for a flight
     * 
     * @param {number} flightId
     * @returns {Promise<Array>}
     */
    async getSeats(flightId) {
        const query = `
      SELECT 
        id,
        flight_id,
        seat_number,
        seat_type,
        is_available,
        price_modifier
      FROM flight_seats
      WHERE flight_id = ?
      ORDER BY seat_number ASC
    `;

        const [rows] = await this.db.execute(query, [flightId]);
        return rows;
    }

    /**
     * Reserve seats (Transaction with ACID properties)
     * Batching: Multiple seat updates in single transaction
     * 
     * @param {number} flightId
     * @param {Array<string>} seatNumbers - e.g., ['12A', '12B']
     * @returns {Promise<Object>}
     */
    async reserveSeats(flightId, seatNumbers) {
        const connection = await this.db.getConnection();

        try {
            await connection.beginTransaction();

            // Check if all seats are available first
            const checkQuery = `
        SELECT seat_number, is_available
        FROM flight_seats
        WHERE flight_id = ?
          AND seat_number IN (${seatNumbers.map(() => '?').join(',')})
        FOR UPDATE  -- Lock rows for update
      `;

            const [seatCheck] = await connection.execute(checkQuery, [flightId, ...seatNumbers]);

            // Verify all seats exist and are available
            if (seatCheck.length !== seatNumbers.length) {
                throw new Error('Some seats do not exist');
            }

            const unavailableSeats = seatCheck.filter(s => !s.is_available);
            if (unavailableSeats.length > 0) {
                throw new Error(`Seats ${unavailableSeats.map(s => s.seat_number).join(', ')} are no longer available`);
            }

            // Update seats to unavailable
            const placeholders = seatNumbers.map(() => '?').join(',');
            const updateSeatsQuery = `
        UPDATE flight_seats
        SET is_available = FALSE
        WHERE flight_id = ?
          AND seat_number IN (${placeholders})
      `;

            const [seatResult] = await connection.execute(
                updateSeatsQuery,
                [flightId, ...seatNumbers]
            );

            // Update flight available_seats count
            const updateFlightQuery = `
        UPDATE flights
        SET available_seats = available_seats - ?
        WHERE id = ? AND available_seats >= ?
      `;

            const [flightResult] = await connection.execute(
                updateFlightQuery,
                [seatNumbers.length, flightId, seatNumbers.length]
            );

            if (flightResult.affectedRows === 0) {
                throw new Error('Insufficient seats available on flight');
            }

            await connection.commit();

            return {
                success: true,
                seatsReserved: seatNumbers.length,
                seatNumbers: seatNumbers
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Release seats (for cancellations)
     * Transaction with rollback capability
     * 
     * @param {number} flightId
     * @param {Array<string>} seatNumbers
     * @returns {Promise<Object>}
     */
    async releaseSeats(flightId, seatNumbers) {
        const connection = await this.db.getConnection();

        try {
            await connection.beginTransaction();

            const placeholders = seatNumbers.map(() => '?').join(',');

            // Release seats
            const updateSeatsQuery = `
        UPDATE flight_seats
        SET is_available = TRUE
        WHERE flight_id = ?
          AND seat_number IN (${placeholders})
      `;

            await connection.execute(updateSeatsQuery, [flightId, ...seatNumbers]);

            // Update flight available_seats count
            const updateFlightQuery = `
        UPDATE flights
        SET available_seats = available_seats + ?
        WHERE id = ?
      `;

            await connection.execute(updateFlightQuery, [seatNumbers.length, flightId]);

            await connection.commit();

            return {
                success: true,
                seatsReleased: seatNumbers.length,
                seatNumbers: seatNumbers
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Search airports (autocomplete)
     * Batching: LIMIT to 10 results for performance
     * 
     * @param {string} query - Search term
     * @returns {Promise<Array>}
     */
    async searchAirports(query) {
        const searchPattern = `%${query}%`;

        const sqlQuery = `
      SELECT 
        code,
        name,
        city,
        state,
        country
      FROM airports
      WHERE LOWER(code) LIKE LOWER(?)
         OR LOWER(name) LIKE LOWER(?)
         OR LOWER(city) LIKE LOWER(?)
      ORDER BY 
        CASE 
          WHEN LOWER(code) = LOWER(?) THEN 1
          WHEN LOWER(code) LIKE LOWER(?) THEN 2
          ELSE 3
        END
      LIMIT 10
    `;

        const [rows] = await this.db.execute(sqlQuery, [
            searchPattern,
            searchPattern,
            searchPattern,
            query,  // Exact match priority
            `${query}%`  // Starts with priority
        ]);

        return rows;
    }

    /**
     * Update availability after booking confirmed
     * Called by Kafka consumer
     * 
     * @param {number} flightId
     * @param {number} seatsBooked
     * @returns {Promise<Object>}
     */
    async updateAvailability(flightId, seatsBooked) {
        const query = `
      UPDATE flights
      SET available_seats = available_seats - ?
      WHERE id = ? AND available_seats >= ?
    `;

        const [result] = await this.db.execute(query, [seatsBooked, flightId, seatsBooked]);

        if (result.affectedRows === 0) {
            throw new Error('Insufficient seats available or flight not found');
        }

        return { success: true, seatsBooked };
    }

    /**
     * Get multiple flights by IDs (batching)
     * Used for multi-city trips
     * 
     * @param {Array<number>} flightIds
     * @returns {Promise<Array>}
     */
    async findByIds(flightIds) {
        if (!flightIds || flightIds.length === 0) {
            return [];
        }

        const placeholders = flightIds.map(() => '?').join(',');

        const query = `
      SELECT 
        f.*,
        dep.name as departure_airport_name,
        arr.name as arrival_airport_name
      FROM flights f
      INNER JOIN airports dep ON f.departure_airport = dep.code
      INNER JOIN airports arr ON f.arrival_airport = arr.code
      WHERE f.id IN (${placeholders})
    `;

        const [rows] = await this.db.execute(query, flightIds);
        return rows;
    }

    /**
     * Check seat availability (non-locking read)
     * 
     * @param {number} flightId
     * @param {Array<string>} seatNumbers
     * @returns {Promise<boolean>}
     */
    async checkSeatAvailability(flightId, seatNumbers) {
        const placeholders = seatNumbers.map(() => '?').join(',');

        const query = `
      SELECT COUNT(*) as available_count
      FROM flight_seats
      WHERE flight_id = ?
        AND seat_number IN (${placeholders})
        AND is_available = TRUE
    `;

        const [rows] = await this.db.execute(query, [flightId, ...seatNumbers]);
        return rows[0].available_count === seatNumbers.length;
    }
}

module.exports = FlightRepository;
