/**
 * Payment & Billing Service - Event-Driven
 * 
 * FULLY DECOUPLED - Listens ONLY to Kafka events
 * Processes payments and generates billing records
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

// Database connection
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

// Kafka Consumer
let kafkaConsumer = null;

async function initKafkaConsumer() {
    try {
        const { Kafka } = require('kafkajs');
        const kafka = new Kafka({
            clientId: 'payment-billing-service',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
        });

        const producer = kafka.producer();
        await producer.connect();

        kafkaConsumer = kafka.consumer({ groupId: 'payment-service-group' });
        await kafkaConsumer.connect();
        await kafkaConsumer.subscribe({ topic: 'booking.created' });

        logger.info('✅ Kafka consumer listening to booking.created');

        // Process booking events
        await kafkaConsumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const event = JSON.parse(message.value.toString());
                logger.info(`📨 Received booking event: ${event.bookingId}`);

                try {
                    // 1. Process Payment
                    const paymentId = await processPayment(event);

                    // 2. Generate Billing
                    await generateBilling(event, paymentId);

                    // 3. Publish success event
                    await producer.send({
                        topic: 'payment.processed',
                        messages: [{
                            value: JSON.stringify({
                                bookingId: event.bookingId,
                                paymentId,
                                status: 'success',
                                timestamp: new Date().toISOString()
                            })
                        }]
                    });

                    logger.info(`✅ Payment processed for booking: ${event.bookingId}`);

                } catch (error) {
                    logger.error(`❌ Payment failed: ${error.message}`);

                    await producer.send({
                        topic: 'payment.failed',
                        messages: [{
                            value: JSON.stringify({
                                bookingId: event.bookingId,
                                error: error.message,
                                timestamp: new Date().toISOString()
                            })
                        }]
                    });
                }
            }
        });

    } catch (error) {
        logger.warn(`⚠️  Kafka unavailable: ${error.message}`);
    }
}

// Process Payment (Mock)
async function processPayment(bookingEvent) {
    const { bookingId, user_id, total_amount, payment_method } = bookingEvent;

    const transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    // Insert payment record
    const [result] = await dbPool.execute(
        `INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_status, payment_date, transaction_id)
     VALUES (?, ?, ?, ?, 'completed', NOW(), ?)`,
        [bookingId, user_id, total_amount, payment_method, transaction_id]
    );

    return result.insertId;
}

// Generate Billing
async function generateBilling(bookingEvent, paymentId) {
    const { bookingId, user_id, total_amount } = bookingEvent;

    // Calculate taxes (15%)
    const taxAmount = total_amount * 0.15;
    const totalAmount = parseFloat(total_amount) + taxAmount;

    const billing_id = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const invoice_details = {
        base_amount: total_amount,
        tax_rate: '15%'
    };

    // Insert billing record
    await dbPool.execute(
        `INSERT INTO billing (booking_id, user_id, payment_id, billing_id, tax_amount, total_amount, billing_date, invoice_details)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [bookingId, user_id, paymentId, billing_id, taxAmount, totalAmount, JSON.stringify(invoice_details)]
    );
}

// Initialize Kafka
initKafkaConsumer();

// GET User Billing History
app.get('/billing/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await dbPool.execute(
            `SELECT * FROM billing WHERE user_id = ? ORDER BY billing_date DESC LIMIT 50`,
            [userId]
        );

        res.status(200).json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET Payment Details
app.get('/payments/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const [rows] = await dbPool.execute(
            `SELECT * FROM payments WHERE booking_id = ?`,
            [bookingId]
        );

        res.status(200).json({
            success: true,
            data: rows[0] || null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health Check
app.get('/health', async (req, res) => {
    try {
        await dbPool.execute('SELECT 1');
        res.status(200).json({
            status: 'healthy',
            service: 'payment-billing-service',
            timestamp: new Date().toISOString(),
            dependencies: {
                database: 'connected',
                kafka: kafkaConsumer ? 'connected' : 'disconnected'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

async function initializeApp() {
    await initKafkaConsumer();
    return app;
}

// Start the server if run directly
if (require.main === module) {
    const PORT = process.env.PORT || 8005;
    initializeApp().then(() => {
        app.listen(PORT, () => {
            logger.info('');
            logger.info('═══════════════════════════════════════');
            logger.info('  💳 Payment & Billing Service');
            logger.info('═══════════════════════════════════════');
            logger.info(`  Port: ${PORT}`);
            logger.info(`  Database: MySQL`);
            logger.info(`  Mode: Event-Driven (Kafka)`);
            logger.info('');
            logger.info('  Endpoints:');
            logger.info(`  GET    /billing/user/:userId`);
            logger.info(`  GET    /payments/:bookingId`);
            logger.info(`  GET    /health`);
            logger.info('');
            logger.info('  Kafka Topics:');
            logger.info(`  📥 Subscribes: booking.created`);
            logger.info(`  📤 Publishes:  payment.processed, payment.failed`);
            logger.info('═══════════════════════════════════════');
            logger.info('');
        });
    });
}

module.exports = { app, initializeApp, dbPool };
