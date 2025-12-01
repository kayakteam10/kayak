const express = require('express');
const router = express.Router();
const dbPool = require('../config/database');

// GET /analytics
router.get('/analytics', async (req, res) => {
    try {
        // Total Bookings
        const [bookingCountRows] = await dbPool.execute('SELECT COUNT(*) as count FROM bookings');
        const totalBookings = bookingCountRows[0].count;

        // Total Revenue (confirmed bookings only)
        const [revenueRows] = await dbPool.execute("SELECT SUM(total_amount) as total FROM bookings WHERE status = 'confirmed'");
        const totalRevenue = revenueRows[0].total || 0;

        // Total Users
        const [userCountRows] = await dbPool.execute('SELECT COUNT(*) as count FROM users');
        const totalUsers = userCountRows[0].count;

        // Total Flights
        const [flightCountRows] = await dbPool.execute('SELECT COUNT(*) as count FROM flights');
        const totalFlights = flightCountRows[0].count;

        // Recent Activity (last 5 bookings)
        const [recentActivityRows] = await dbPool.execute(`
            SELECT b.id, b.booking_type, b.total_amount, b.status, u.first_name, u.last_name, b.booking_date
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            ORDER BY b.booking_date DESC
            LIMIT 5
        `);

        const recentActivity = recentActivityRows.map(row => ({
            id: row.id,
            user: `${row.first_name} ${row.last_name}`,
            action: `Booked a ${row.booking_type}`,
            amount: row.total_amount,
            status: row.status,
            time: row.booking_date
        }));

        res.json({
            success: true,
            data: {
                totalBookings,
                totalRevenue,
                totalUsers,
                totalFlights,
                recentActivity
            }
        });
    } catch (error) {
        console.error('Admin analytics error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
});

// GET /bookings
router.get('/bookings', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        // Use interpolation for LIMIT/OFFSET to avoid prepared statement issues
        const [rows] = await dbPool.execute(`
            SELECT b.*, u.first_name, u.last_name, u.email
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            ORDER BY b.booking_date DESC
            LIMIT ${limit} OFFSET ${offset}
        `);

        // Parse booking_details if it's a string
        const bookings = rows.map(booking => ({
            ...booking,
            booking_details: typeof booking.booking_details === 'string'
                ? JSON.parse(booking.booking_details)
                : booking.booking_details
        }));

        // Get total count for pagination
        const [countRows] = await dbPool.execute('SELECT COUNT(*) as count FROM bookings');
        const total = countRows[0].count;

        res.json({
            success: true,
            data: bookings,
            pagination: {
                total,
                limit,
                offset,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Admin bookings error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }
});

// GET /bookings/:id
router.get('/bookings/:id', async (req, res) => {
    try {
        const [rows] = await dbPool.execute(`
            SELECT b.*, u.first_name, u.last_name, u.email, u.phone_number
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            WHERE b.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        const booking = rows[0];
        booking.booking_details = typeof booking.booking_details === 'string'
            ? JSON.parse(booking.booking_details)
            : booking.booking_details;

        res.json({ success: true, data: booking });
    } catch (error) {
        console.error('Admin booking details error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch booking details' });
    }
});

// GET /flights
router.get('/flights', async (req, res) => {
    try {
        const [rows] = await dbPool.execute(`
            SELECT f.*, a1.city as departure_city, a2.city as arrival_city 
            FROM flights f
            JOIN airports a1 ON f.departure_airport = a1.code
            JOIN airports a2 ON f.arrival_airport = a2.code
            ORDER BY f.departure_time DESC
            LIMIT 50
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Admin flights error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch flights' });
    }
});

// GET /users
router.get('/users', async (req, res) => {
    try {
        const [rows] = await dbPool.execute(`
            SELECT id, first_name, last_name, email, role, phone_number, created_at 
            FROM users 
            ORDER BY created_at DESC
            LIMIT 50
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

module.exports = router;
