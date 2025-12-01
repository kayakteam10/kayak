/**
 * HotelRepository
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles database operations for hotels
 * - Dependency Inversion: Accepts database pool as dependency
 * 
 * Batching Strategies:
 * - Single queries with multiple conditions
 * - Transactions for atomic operations
 * - LIMIT clauses for autocomplete
 */

class HotelRepository {
    constructor(dbPool) {
        this.db = dbPool;
    }

    /**
     * Search hotels with filters
     * Batching: Single query with multiple conditions
     * 
     * @param {Object} filters - Search criteria
     * @returns {Promise<Array>} - List of hotels
     */
    async searchHotels(filters) {
        const { location, checkIn, checkOut, guests = 2 } = filters;

        const query = `
      SELECT 
        h.*,
        COALESCE(h.user_rating, 0) as user_rating,
        COALESCE(h.review_count, 0) as review_count
      FROM hotels h
      WHERE (
        LOWER(h.city) LIKE LOWER(?)
        OR LOWER(h.hotel_name) LIKE LOWER(?)
        OR LOWER(h.state) LIKE LOWER(?)
        OR LOWER(h.address) LIKE LOWER(?)
      )
      AND h.available_rooms >= 1
      ORDER BY h.star_rating DESC, h.user_rating DESC
      LIMIT 50
    `;

        const searchPattern = `%${location}%`;
        const [rows] = await this.db.execute(query, [
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern
        ]);

        return rows;
    }

    /**
     * Find hotel by ID
     * 
     * @param {number} hotelId
     * @returns {Promise<Object|null>}
     */
    async findById(hotelId) {
        const query = `
      SELECT * FROM hotels
      WHERE id = ?
    `;

        const [rows] = await this.db.execute(query, [hotelId]);
        return rows[0] || null;
    }

    /**
     * Get room types for a hotel
     * 
     * @param {number} hotelId
     * @returns {Promise<Array>}
     */
    async getRoomTypes(hotelId) {
        const query = `
      SELECT * FROM room_types
      WHERE hotel_id = ?
      ORDER BY price_per_night ASC
    `;

        const [rows] = await this.db.execute(query, [hotelId]);
        return rows;
    }

    /**
     * Reserve rooms (Transaction)
     * 
     * @param {number} hotelId
     * @param {number} roomCount
     * @returns {Promise<Object>}
     */
    async reserveRooms(hotelId, roomCount) {
        const connection = await this.db.getConnection();

        try {
            await connection.beginTransaction();

            // Check if hotel has enough available rooms
            const [hotelRows] = await connection.execute(
                `SELECT available_rooms FROM hotels WHERE id = ? FOR UPDATE`,
                [hotelId]
            );

            if (!hotelRows[0]) {
                throw new Error('Hotel not found');
            }

            if (hotelRows[0].available_rooms < roomCount) {
                throw new Error(`Only ${hotelRows[0].available_rooms} rooms available`);
            }

            // Update hotel available_rooms count
            const [result] = await connection.execute(
                `UPDATE hotels SET available_rooms = available_rooms - ? WHERE id = ? AND available_rooms >= ?`,
                [roomCount, hotelId, roomCount]
            );

            if (result.affectedRows === 0) {
                throw new Error('Insufficient rooms available');
            }

            await connection.commit();

            return {
                success: true,
                roomsReserved: roomCount,
                hotelId: hotelId
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Release rooms (for cancellations)
     * 
     * @param {number} hotelId
     * @param {number} roomCount
     * @returns {Promise<Object>}
     */
    async releaseRooms(hotelId, roomCount) {
        const connection = await this.db.getConnection();

        try {
            await connection.beginTransaction();

            await connection.execute(
                `UPDATE hotels SET available_rooms = available_rooms + ? WHERE id = ?`,
                [roomCount, hotelId]
            );

            await connection.commit();

            return {
                success: true,
                roomsReleased: roomCount,
                hotelId: hotelId
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Search cities/hotels (autocomplete)
     * Batching: LIMIT to 15 results
     * 
     * @param {string} query - Search term
     * @returns {Promise<Array>}
     */
    async searchCities(query) {
        const searchPattern = `%${query}%`;
        const results = [];

        // 1. Search for cities
        const cityQuery = `
      SELECT DISTINCT city, state
      FROM hotels
      WHERE LOWER(city) LIKE LOWER(?) 
         OR LOWER(state) LIKE LOWER(?)
      LIMIT 5
    `;
        const [cityRows] = await this.db.execute(cityQuery, [searchPattern, searchPattern]);

        cityRows.forEach(row => {
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
        const [hotelRows] = await this.db.execute(hotelQuery, [searchPattern]);

        hotelRows.forEach(row => {
            results.push({
                label: `${row.hotel_name} - ${row.city}, ${row.state}`,
                value: row.hotel_name,
                type: 'hotel',
                icon: '🏨'
            });
        });

        // 3. Search for airports (nearby hotels)
        const airportQuery = `
      SELECT code, name, city
      FROM airports
      WHERE LOWER(code) LIKE LOWER(?)
         OR LOWER(name) LIKE LOWER(?)
         OR LOWER(city) LIKE LOWER(?)
      LIMIT 5
    `;
        const [airportRows] = await this.db.execute(airportQuery, [
            searchPattern,
            searchPattern,
            searchPattern
        ]);

        airportRows.forEach(row => {
            results.push({
                label: `${row.code} - ${row.name} (${row.city})`,
                value: row.code,
                type: 'airport',
                icon: '✈️'
            });
        });

        return results.slice(0, 15); // Max 15 results
    }

    /**
     * Update availability after booking confirmed
     * 
     * @param {number} hotelId
     * @param {number} roomsBooked
     * @returns {Promise<Object>}
     */
    async updateAvailability(hotelId, roomsBooked) {
        const query = `
      UPDATE hotels
      SET available_rooms = available_rooms - ?
      WHERE id = ? AND available_rooms >= ?
    `;

        const [result] = await this.db.execute(query, [roomsBooked, hotelId, roomsBooked]);

        if (result.affectedRows === 0) {
            throw new Error('Insufficient rooms available or hotel not found');
        }

        return { success: true, roomsBooked };
    }

    /**
     * Get multiple hotels by IDs (batching)
     * 
     * @param {Array<number>} hotelIds
     * @returns {Promise<Array>}
     */
    async findByIds(hotelIds) {
        if (!hotelIds || hotelIds.length === 0) {
            return [];
        }

        const placeholders = hotelIds.map(() => '?').join(',');

        const query = `
      SELECT * FROM hotels
      WHERE id IN (${placeholders})
    `;

        const [rows] = await this.db.execute(query, hotelIds);
        return rows;
    }

    /**
     * Check room availability (non-locking read)
     * 
     * @param {number} hotelId
     * @param {number} roomCount
     * @returns {Promise<boolean>}
     */
    async checkRoomAvailability(hotelId, roomCount) {
        const query = `
      SELECT available_rooms
      FROM hotels
      WHERE id = ?
    `;

        const [rows] = await this.db.execute(query, [hotelId]);
        return rows[0] && rows[0].available_rooms >= roomCount;
    }
}

module.exports = HotelRepository;
