/**
 * CarRepository
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles database operations for cars
 * - Dependency Inversion: Accepts database pool as dependency
 * 
 * Batching Strategies:
 * - Single queries with multiple conditions
 * - Transactions for atomic operations
 */

class CarRepository {
    constructor(dbPool) {
        this.db = dbPool;
    }

    /**
     * Search cars with filters
     * Batching: Single query with multiple conditions
     * 
     * @param {Object} filters - Search criteria
     * @returns {Promise<Array>} - List of cars
     */
    async searchCars(filters) {
        const { location, pickupDate, returnDate, carType } = filters;

        let query = `
      SELECT 
        c.*,
        DATEDIFF(?, ?) as rental_days
      FROM cars c
      WHERE c.location_city LIKE ?
        AND c.status = 'available'
    `;

        const params = [returnDate, pickupDate, `%${location}%`];

        // Optional car type filter
        if (carType && carType !== 'any') {
            query += ` AND c.car_type = ?`;
            params.push(carType);
        }

        query += ` ORDER BY c.daily_rental_price ASC LIMIT 50`;

        const [rows] = await this.db.execute(query, params);
        return rows;
    }

    /**
     * Find car by ID
     * 
     * @param {number} carId
     * @returns {Promise<Object|null>}
     */
    async findById(carId) {
        const query = `SELECT * FROM cars WHERE id = ?`;
        const [rows] = await this.db.execute(query, [carId]);
        return rows[0] || null;
    }

    /**
     * Reserve car (Transaction)
     * 
     * @param {number} carId
     * @param {string} pickupDate
     * @param {string} returnDate
     * @returns {Promise<Object>}
     */
    async reserveCar(carId, pickupDate, returnDate) {
        const connection = await this.db.getConnection();

        try {
            await connection.beginTransaction();

            // Check if car is available
            const [carRows] = await connection.execute(
                `SELECT * FROM cars WHERE id = ? AND status = 'available' FOR UPDATE`,
                [carId]
            );

            if (!carRows[0]) {
                throw new Error('Car not available');
            }

            // Mark car as unavailable
            await connection.execute(
                `UPDATE cars SET status = 'rented' WHERE id = ?`,
                [carId]
            );

            await connection.commit();

            return {
                success: true,
                carId: carId,
                pickupDate,
                returnDate
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Release car (for cancellations)
     * 
     * @param {number} carId
     * @returns {Promise<Object>}
     */
    async releaseCar(carId) {
        const query = `UPDATE cars SET status = 'available' WHERE id = ?`;
        await this.db.execute(query, [carId]);

        return {
            success: true,
            carId: carId
        };
    }

    /**
     * Search locations (autocomplete)
     * 
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async searchLocations(query) {
        const searchPattern = `%${query}%`;

        const sqlQuery = `
      SELECT DISTINCT location_city, airport_code
      FROM cars
      WHERE LOWER(location_city) LIKE LOWER(?) OR LOWER(airport_code) LIKE LOWER(?)
      ORDER BY location_city ASC
      LIMIT 10
    `;

        const [rows] = await this.db.execute(sqlQuery, [searchPattern, searchPattern]);

        return rows.map(row => ({
            label: `${row.location_city} (${row.airport_code})`,
            value: row.location_city,
            name: row.location_city,
            code: row.airport_code,
            type: 'city'
        }));
    }

    /**
     * Get available car types at location
     * 
     * @param {string} location
     * @returns {Promise<Array>}
     */
    async getCarTypes(location) {
        const query = `
      SELECT DISTINCT car_type, COUNT(*) as count
      FROM cars
      WHERE location_city LIKE ? AND status = 'available'
      GROUP BY car_type
    `;

        const [rows] = await this.db.execute(query, [`%${location}%`]);
        return rows;
    }

    /**
     * Update availability
     * 
     * @param {number} carId
     * @param {boolean} isAvailable
     * @returns {Promise<Object>}
     */
    async updateAvailability(carId, status) {
        const query = `UPDATE cars SET status = ? WHERE id = ?`;
        const [result] = await this.db.execute(query, [status, carId]);

        if (result.affectedRows === 0) {
            throw new Error('Car not found');
        }

        return { success: true };
    }

    /**
     * Get multiple cars by IDs (batching)
     * 
     * @param {Array<number>} carIds
     * @returns {Promise<Array>}
     */
    async findByIds(carIds) {
        if (!carIds || carIds.length === 0) {
            return [];
        }

        const placeholders = carIds.map(() => '?').join(',');
        const query = `SELECT * FROM cars WHERE id IN (${placeholders})`;

        const [rows] = await this.db.execute(query, carIds);
        return rows;
    }
}

module.exports = CarRepository;
