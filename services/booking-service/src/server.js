/**
 * Booking Service - Minimal Schema Match
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const logger = require('./utils/logger');

const app = express();
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kayak_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

let kafkaProducer = null;
async function initKafka() {
    try {
        const { Kafka } = require('kafkajs');
        const kafka = new Kafka({
            clientId: 'booking-service',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
        });
        kafkaProducer = kafka.producer();
        await kafkaProducer.connect();
        logger.info('✅ Kafka connected');
    } catch (error) {
        logger.warn('⚠️  Kafka unavailable');
    }
}

async function initKafkaConsumer() {
    try {
        const { Kafka } = require('kafkajs');
        const kafka = new Kafka({
            clientId: 'booking-service-consumer',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
        });

        const consumer = kafka.consumer({ groupId: 'booking-service-group' });
        await consumer.connect();
        await consumer.subscribe({ topic: 'payment.processed' });
        await consumer.subscribe({ topic: 'payment.failed' });

        await consumer.run({
            eachMessage: async ({ topic, message }) => {
                const event = JSON.parse(message.value.toString());
                logger.info(`📨 Received ${topic}: ${event.bookingId}`);

                if (topic === 'payment.processed') {
                    await dbPool.execute(
                        `UPDATE bookings SET status = 'confirmed' WHERE id = ?`,
                        [event.bookingId]
                    );
                    logger.info(`✅ Booking ${event.bookingId} confirmed`);
                } else if (topic === 'payment.failed') {
                    // 1. Fetch booking details BEFORE cancelling to get rollback info
                    const [rows] = await dbPool.execute(`SELECT * FROM bookings WHERE id = ?`, [event.bookingId]);

                    await dbPool.execute(
                        `UPDATE bookings SET status = 'cancelled' WHERE id = ?`,
                        [event.bookingId]
                    );
                    logger.info(`❌ Booking ${event.bookingId} cancelled due to payment failure`);

                    // 2. Publish cancelled event for rollback
                    if (rows.length > 0 && kafkaProducer) {
                        const booking = rows[0];
                        await kafkaProducer.send({
                            topic: 'booking.cancelled',
                            messages: [{
                                value: JSON.stringify({
                                    bookingId: booking.id,
                                    user_id: booking.user_id,
                                    booking_type: booking.booking_type,
                                    booking_details: typeof booking.booking_details === 'string'
                                        ? JSON.parse(booking.booking_details)
                                        : booking.booking_details,
                                    reason: 'payment_failed',
                                    timestamp: new Date().toISOString()
                                })
                            }]
                        });
                        logger.info(`📢 Published booking.cancelled for ${event.bookingId}`);
                    }
                }
            }
        });
        logger.info('✅ Kafka consumer listening');
    } catch (error) {
        logger.warn('⚠️  Kafka consumer unavailable');
    }
}

initKafka();
initKafkaConsumer();

// CREATE Booking
app.post('/bookings', async (req, res) => {
    try {
        const { user_id, booking_type, booking_details, total_amount, payment_method = 'credit_card' } = req.body;

        if (!user_id || !booking_type || !booking_details || !total_amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing: user_id, booking_type, booking_details, total_amount'
            });
        }

        const booking_reference = `BKG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Match actual schema: user_id, booking_reference, booking_type, booking_details, total_amount, status
        const [result] = await dbPool.execute(
            `INSERT INTO bookings (user_id, booking_reference, booking_type, booking_details, total_amount, status)
       VALUES (?, ?, ?, ?, ?, 'confirmed')`,
            [user_id, booking_reference, booking_type, JSON.stringify(booking_details), total_amount]
        );

        const bookingId = result.insertId;

        // Send response immediately (don't wait for Kafka)
        res.status(201).json({
            success: true,
            data: { bookingId, booking_reference, status: 'confirmed' }
        });

        // Send Kafka message asynchronously (fire-and-forget)
        if (kafkaProducer) {
            kafkaProducer.send({
                topic: 'booking.created',
                messages: [{
                    value: JSON.stringify({
                        bookingId,
                        user_id,
                        booking_type,
                        booking_reference,
                        total_amount,
                        payment_method,
                        timestamp: new Date().toISOString()
                    })
                }]
            }).catch(err => logger.error(`Kafka send error: ${err.message}`));
        }
    } catch (error) {
        logger.error(`Error creating booking: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// HOLD Booking (temporary reservation)
app.post('/bookings/hold', async (req, res) => {
    try {
        const { flight_id, return_flight_id, passengers, trip_type = 'oneway' } = req.body;

        if (!flight_id || !passengers) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: flight_id, passengers'
            });
        }

        const booking_reference = `HOLD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

        const booking_details = {
            flight_id,
            return_flight_id,
            passengers,
            trip_type,
            hold_created_at: new Date().toISOString()
        };

        res.status(201).json({
            success: true,
            data: {
                booking_reference,
                expires_at: expires_at.toISOString(),
                flight_id,
                return_flight_id,
                passengers,
                trip_type
            }
        });
    } catch (error) {
        logger.error(`Error creating hold: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET User Bookings
app.get('/bookings/user/:userId', async (req, res) => {
    try {
        const [rows] = await dbPool.execute(
            `SELECT * FROM bookings WHERE user_id = ? ORDER BY booking_date DESC LIMIT 50`,
            [req.params.userId]
        );

        // Enrich bookings with additional details
        const enrichedBookings = await Promise.all(rows.map(async (b) => {
            const booking = {
                ...b,
                booking_details: typeof b.booking_details === 'string' ? JSON.parse(b.booking_details) : b.booking_details
            };

            // Enrich hotel bookings with hotel details
            if (booking.booking_type === 'hotel' && booking.booking_details.hotel_id) {
                try {
                    logger.info(`Enriching hotel booking ${booking.id} with hotel_id ${booking.booking_details.hotel_id}`);
                    const [hotelRows] = await dbPool.execute(
                        `SELECT hotel_name, location, city, address, price_per_night 
                         FROM hotels WHERE id = ?`,
                        [booking.booking_details.hotel_id]
                    );

                    logger.info(`Hotel query returned ${hotelRows.length} rows`);
                    if (hotelRows.length > 0) {
                        const hotel = hotelRows[0];
                        booking.booking_details.hotel_name = hotel.hotel_name;
                        booking.booking_details.location = hotel.location;
                        booking.booking_details.city = hotel.city;
                        booking.booking_details.address = hotel.address;
                        booking.booking_details.price_per_night = hotel.price_per_night;
                        logger.info(`✅ Enriched booking ${booking.id} with hotel: ${hotel.hotel_name}`);
                    } else {
                        logger.warn(`⚠️ Hotel ${booking.booking_details.hotel_id} not found in database`);
                    }
                } catch (hotelError) {
                    logger.error(`Error fetching hotel details: ${hotelError.message}`);
                }
            }

            return booking;
        }));

        res.status(200).json({
            success: true,
            data: enrichedBookings,
            count: enrichedBookings.length
        });
    } catch (error) {
        logger.error(`Error fetching user bookings: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET Booking
app.get('/bookings/:id', async (req, res) => {
    try {
        const [rows] = await dbPool.execute(`SELECT * FROM bookings WHERE id = ?`, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        const booking = rows[0];
        booking.booking_details = typeof booking.booking_details === 'string' ? JSON.parse(booking.booking_details) : booking.booking_details;

        // Enrich hotel bookings with hotel details
        if (booking.booking_type === 'hotel' && booking.booking_details.hotel_id) {
            try {
                const [hotelRows] = await dbPool.execute(
                    `SELECT hotel_name, location, city, address, room_type, price_per_night 
                     FROM hotels WHERE id = ?`,
                    [booking.booking_details.hotel_id]
                );

                if (hotelRows.length > 0) {
                    const hotel = hotelRows[0];
                    booking.booking_details.hotel_name = hotel.hotel_name;
                    booking.booking_details.location = hotel.location;
                    booking.booking_details.city = hotel.city;
                    booking.booking_details.address = hotel.address;
                    booking.booking_details.room_type = hotel.room_type;
                    booking.booking_details.price_per_night = hotel.price_per_night;
                }
            } catch (hotelError) {
                logger.error(`Error fetching hotel details: ${hotelError.message}`);
                // Continue without hotel details
            }
        }

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        logger.error(`Error fetching booking: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// CANCEL Booking
app.delete('/bookings/:id', async (req, res) => {
    try {
        const [result] = await dbPool.execute(
            `UPDATE bookings SET status = 'cancelled' WHERE id = ?`,
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        if (kafkaProducer) {
            // Fetch the cancelled booking to send details
            const [rows] = await dbPool.execute(`SELECT * FROM bookings WHERE id = ?`, [req.params.id]);
            if (rows.length > 0) {
                const booking = rows[0];
                await kafkaProducer.send({
                    topic: 'booking.cancelled',
                    messages: [{
                        value: JSON.stringify({
                            bookingId: req.params.id,
                            user_id: booking.user_id,
                            booking_type: booking.booking_type,
                            booking_details: typeof booking.booking_details === 'string'
                                ? JSON.parse(booking.booking_details)
                                : booking.booking_details,
                            reason: 'user_cancelled',
                            timestamp: new Date().toISOString()
                        })
                    }]
                });
            }
        }

        res.status(200).json({ success: true, message: 'Booking cancelled' });
    } catch (error) {
        logger.error(`Error cancelling booking: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health
app.get('/health', async (req, res) => {
    try {
        await dbPool.execute('SELECT 1');
        res.status(200).json({
            status: 'healthy',
            service: 'booking-service',
            timestamp: new Date().toISOString(),
            dependencies: {
                database: 'connected',
                kafka: kafkaProducer ? 'connected' : 'disconnected'
            }
        });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

async function initializeApp() {
    // Kafka initialization
    await initKafka();
    await initKafkaConsumer();
    return app;
}

// Start the server if run directly
if (require.main === module) {
    const PORT = process.env.PORT || 8004;
    initializeApp().then(() => {
        app.listen(PORT, () => {
            logger.info('');
            logger.info('═══════════════════════════════════════');
            logger.info('  📋 Booking Service');
            logger.info('═══════════════════════════════════════');
            logger.info(`  Port: ${PORT}`);
            logger.info('  Endpoints: POST/GET/DELETE /bookings');
            logger.info('  Kafka: booking.created, booking.cancelled');
            logger.info('═══════════════════════════════════════');
            logger.info('');
        });
    });
}

module.exports = { app, initializeApp, dbPool };
