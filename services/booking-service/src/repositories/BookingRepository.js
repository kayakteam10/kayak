/**
 * BookingRepository
 * 
 * Manages bookings in MySQL database
 * This is an orchestrator - it doesn't own domain logic
 */

class BookingRepository {
    constructor(dbPool) {
        this.db = dbPool;
    }

    async create(booking) {
        const query = `
      INSERT INTO bookings (
        user_id, booking_type, listing_id, booking_date,
        start_date, end_date, total_amount, status,
        payment_method, guest_count
      ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)
    `;

        const [result] = await this.db.execute(query, [
            booking.user_id,
            booking.booking_type,  // 'flight', 'hotel', 'car'
            booking.listing_id,
            booking.start_date,
            booking.end_date,
            booking.total_amount,
            booking.status || 'pending',
            booking.payment_method || 'credit_card',
            booking.guest_count || 1
        ]);

        return result.insertId;
    }

    async findById(bookingId) {
        const query = `SELECT * FROM bookings WHERE id = ?`;
        const [rows] = await this.db.execute(query, [bookingId]);
        return rows[0] || null;
    }

    async findByUser(userId, limit = 50) {
        const query = `
      SELECT * FROM bookings
      WHERE user_id = ?
      ORDER BY booking_date DESC
      LIMIT ?
    `;
        const [rows] = await this.db.execute(query, [userId, limit]);
        return rows;
    }

    async updateStatus(bookingId, status) {
        const query = `UPDATE bookings SET status = ? WHERE id = ?`;
        const [result] = await this.db.execute(query, [status, bookingId]);
        return result.affectedRows > 0;
    }

    async cancel(bookingId) {
        const connection = await this.db.getConnection();

        try {
            await connection.beginTransaction();

            // Update status to cancelled
            await connection.execute(
                `UPDATE bookings SET status = 'cancelled' WHERE id = ?`,
                [bookingId]
            );

            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = BookingRepository;
