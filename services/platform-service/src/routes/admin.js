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
        const limit = parseInt(req.query.limit) || 50;
        
        const [rows] = await dbPool.execute(`
            SELECT f.*, a1.city as departure_city, a2.city as arrival_city 
            FROM flights f
            JOIN airports a1 ON f.departure_airport = a1.code
            JOIN airports a2 ON f.arrival_airport = a2.code
            ORDER BY f.departure_time DESC
            LIMIT ${limit}
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
        const limit = parseInt(req.query.limit) || 50;
        
        const [rows] = await dbPool.execute(`
            SELECT id, first_name, last_name, email, role, phone_number, created_at 
            FROM users 
            ORDER BY created_at DESC
            LIMIT ${limit}
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

// GET /hotels
router.get('/hotels', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        
        const [rows] = await dbPool.execute(`
            SELECT id, hotel_name, city, star_rating, price_per_night, 
                   available_rooms, total_rooms, user_rating, review_count
            FROM hotels
            ORDER BY id DESC
            LIMIT ${limit}
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Admin hotels error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch hotels' });
    }
});

// GET /cars
router.get('/cars', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        
        const [rows] = await dbPool.execute(`
            SELECT id, company, model, car_type, location_city as city, 
                   num_seats, daily_rental_price, status, average_rating
            FROM cars
            ORDER BY id DESC
            LIMIT ${limit}
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Admin cars error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch cars' });
    }
});

// GET /analytics/revenue-by-property - Top 10 hotels with revenue
router.get('/analytics/revenue-by-property', async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        const period = req.query.period;
        
        let whereClause = 'WHERE b.status = \'confirmed\'';
        let params = [];
        
        if (period) {
            // Use period-based filtering
            let days = 30;
            if (period === '7days') days = 7;
            if (period === '90days') days = 90;
            if (period === '1year') days = 365;
            whereClause += ' AND b.booking_date >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            params.push(days);
        } else {
            // Use year-based filtering
            whereClause += ' AND YEAR(b.booking_date) = ?';
            params.push(year);
        }
        
        // Get hotel revenue only
        const [hotelRevenue] = await dbPool.execute(`
            SELECT 
                h.id,
                h.hotel_name as name,
                'Hotel' as type,
                SUM(b.total_amount) as revenue,
                COUNT(b.id) as bookings
            FROM hotels h
            JOIN bookings b ON b.booking_type = 'hotel' 
                AND JSON_UNQUOTE(JSON_EXTRACT(b.booking_details, '$.hotel_id')) = h.id
            ${whereClause}
            GROUP BY h.id, h.hotel_name
            ORDER BY revenue DESC
            LIMIT 10
        `, params);

        res.json({ success: true, data: hotelRevenue });
    } catch (error) {
        console.error('Revenue by property error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch revenue data' });
    }
});

// GET /analytics/summary - Overall analytics summary for a year or period
router.get('/analytics/summary', async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        const period = req.query.period;
        
        let whereClause = 'WHERE b.status = \'confirmed\'';
        let params = [];
        
        if (period) {
            // Use period-based filtering
            let days = 30;
            if (period === '7days') days = 7;
            if (period === '90days') days = 90;
            if (period === '1year') days = 365;
            whereClause += ' AND b.booking_date >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            params.push(days);
        } else {
            // Use year-based filtering
            whereClause += ' AND YEAR(b.booking_date) = ?';
            params.push(year);
        }
        
        // Get total revenue and bookings
        const [summary] = await dbPool.execute(`
            SELECT 
                COUNT(DISTINCT b.id) as totalBookings,
                COALESCE(SUM(b.total_amount), 0) as totalRevenue,
                COUNT(DISTINCT CASE 
                    WHEN b.booking_type = 'hotel' THEN JSON_UNQUOTE(JSON_EXTRACT(b.booking_details, '$.hotel_id'))
                    WHEN b.booking_type = 'flight' THEN JSON_UNQUOTE(JSON_EXTRACT(b.booking_details, '$.flight_id'))
                    WHEN b.booking_type = 'car' THEN JSON_UNQUOTE(JSON_EXTRACT(b.booking_details, '$.car_id'))
                END) as activeProperties
            FROM bookings b
            ${whereClause}
        `, params);

        const data = summary[0] || { totalBookings: 0, totalRevenue: 0, activeProperties: 0 };
        res.json({ success: true, data });
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch analytics summary' });
    }
});

// GET /analytics/revenue-by-city - City-wise revenue
router.get('/analytics/revenue-by-city', async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        const period = req.query.period;
        
        let whereClause = 'WHERE b.status = \'confirmed\'';
        let params = [];
        
        if (period) {
            // Use period-based filtering
            let days = 30;
            if (period === '7days') days = 7;
            if (period === '90days') days = 90;
            if (period === '1year') days = 365;
            whereClause += ' AND b.booking_date >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            params = [days, days, days];
        } else {
            // Use year-based filtering
            whereClause += ' AND YEAR(b.booking_date) = ?';
            params = [year, year, year];
        }
        
        // Get all bookings with location data - use subquery to avoid GROUP BY issues
        const [cityRevenue] = await dbPool.execute(`
            SELECT 
                city,
                SUM(revenue) as revenue,
                SUM(bookings) as bookings
            FROM (
                SELECT 
                    h.city as city,
                    b.total_amount as revenue,
                    1 as bookings
                FROM bookings b
                JOIN hotels h ON b.booking_type = 'hotel' 
                    AND JSON_UNQUOTE(JSON_EXTRACT(b.booking_details, '$.hotel_id')) = h.id
                ${whereClause}
                
                UNION ALL
                
                SELECT 
                    CASE f.arrival_airport
                        WHEN 'JFK' THEN 'New York'
                        WHEN 'LAX' THEN 'Los Angeles'
                        WHEN 'SFO' THEN 'San Francisco'
                        WHEN 'ORD' THEN 'Chicago'
                        WHEN 'SEA' THEN 'Seattle'
                        WHEN 'LAS' THEN 'Las Vegas'
                        WHEN 'LHR' THEN 'London'
                        ELSE f.arrival_airport
                    END as city,
                    b.total_amount as revenue,
                    1 as bookings
                FROM bookings b
                JOIN flights f ON b.booking_type = 'flight' 
                    AND JSON_UNQUOTE(JSON_EXTRACT(b.booking_details, '$.flight_id')) = f.id
                ${whereClause}
                
                UNION ALL
                
                SELECT 
                    c.location_city as city,
                    b.total_amount as revenue,
                    1 as bookings
                FROM bookings b
                JOIN cars c ON b.booking_type = 'car' 
                    AND JSON_UNQUOTE(JSON_EXTRACT(b.booking_details, '$.car_id')) = c.id
                ${whereClause}
            ) AS combined
            WHERE city IS NOT NULL
            GROUP BY city
            ORDER BY revenue DESC
        `, params);

        res.json({ success: true, data: cityRevenue });
    } catch (error) {
        console.error('Revenue by city error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch city revenue data' });
    }
});

// GET /analytics/top-providers - Top 10 providers/hosts
router.get('/analytics/top-providers', async (req, res) => {
    try {
        // Get top hotels by bookings last month
        const [topHotels] = await dbPool.execute(`
            SELECT 
                h.hotel_name as provider_name,
                'Hotel' as type,
                COUNT(b.id) as properties_sold,
                SUM(b.total_amount) as revenue
            FROM hotels h
            JOIN bookings b ON b.booking_type = 'hotel' 
                AND JSON_UNQUOTE(JSON_EXTRACT(b.booking_details, '$.hotel_id')) = h.id
            WHERE b.status = 'confirmed'
                AND b.booking_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            GROUP BY h.id, h.hotel_name
            ORDER BY properties_sold DESC
            LIMIT 10
        `);

        res.json({ success: true, data: topHotels });
    } catch (error) {
        console.error('Top providers error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch top providers' });
    }
});

// GET /analytics/reviews-stats - Reviews statistics
router.get('/analytics/reviews-stats', async (req, res) => {
    try {
        // Get total reviews and average rating
        const [overallStats] = await dbPool.execute(`
            SELECT COUNT(*) as total, AVG(rating) as avg_rating 
            FROM reviews
        `);
        
        const totalReviews = overallStats[0].total || 0;
        const averageRating = parseFloat(overallStats[0].avg_rating) || 0;

        // Get rating distribution
        const [ratingDist] = await dbPool.execute(`
            SELECT rating, COUNT(*) as count 
            FROM reviews 
            GROUP BY rating
        `);
        
        const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratingDist.forEach(row => {
            ratingDistribution[row.rating] = row.count;
        });

        // Get reviews by type
        const [typeStats] = await dbPool.execute(`
            SELECT entity_type, COUNT(*) as count 
            FROM reviews 
            GROUP BY entity_type
        `);
        
        const reviewsByType = { hotel: 0, flight: 0, car: 0 };
        typeStats.forEach(row => {
            reviewsByType[row.entity_type] = row.count;
        });

        const stats = {
            totalReviews,
            averageRating: parseFloat(averageRating.toFixed(2)),
            ratingDistribution,
            reviewsByType
        };

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Reviews stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch reviews stats' });
    }
});

// GET /analytics/booking-trends - Booking trends over time
router.get('/analytics/booking-trends', async (req, res) => {
    try {
        const period = req.query.period || '30days';
        
        let days = 30;
        if (period === '7days') days = 7;
        if (period === '90days') days = 90;
        if (period === '1year') days = 365;
        
        const [trends] = await dbPool.execute(`
            SELECT 
                DATE(booking_date) as date,
                booking_type,
                COUNT(*) as count,
                SUM(total_amount) as revenue
            FROM bookings
            WHERE booking_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND status = 'confirmed'
            GROUP BY DATE(booking_date), booking_type
            ORDER BY date ASC
        `, [days]);

        res.json({ success: true, data: trends });
    } catch (error) {
        console.error('Booking trends error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch booking trends' });
    }
});

module.exports = router;
