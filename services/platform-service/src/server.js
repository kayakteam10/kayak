/**
 * Platform Service - API Gateway + Auth + Admin
 * 
 * Combines:
 * - API Gateway (routes to all microservices)
 * - User Authentication (login, register)
 * - Admin Operations (health checks, analytics)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('./utils/logger');
const dbPool = require('./config/database'); // Initializes DB connection
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Notification System (Kafka)
let kafkaProducer = null;
let kafkaConsumer = null;

async function initNotificationSystem() {
    try {
        const { Kafka } = require('kafkajs');
        const kafka = new Kafka({
            clientId: 'platform-service',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
        });

        // Initialize Consumer
        kafkaConsumer = kafka.consumer({ groupId: 'platform-notification-group' });
        await kafkaConsumer.connect();
        await kafkaConsumer.subscribe({ topic: 'booking.cancelled' });

        await kafkaConsumer.run({
            eachMessage: async ({ topic, message }) => {
                try {
                    const event = JSON.parse(message.value.toString());
                    if (topic === 'booking.cancelled') {
                        await sendCancellationNotification(event);
                    }
                } catch (e) {
                    logger.error(`Notification Error: ${e.message}`);
                }
            }
        });

        logger.info('🔔 Notification System: Online');
    } catch (error) {
        logger.warn('⚠️ Notification System: Offline (Kafka unavailable)');
    }
}

async function sendCancellationNotification(event) {
    try {
        const { user_id, bookingId, reason } = event;

        // Fetch User Email
        const [rows] = await dbPool.execute('SELECT email, first_name FROM users WHERE id = ?', [user_id]);

        if (rows.length > 0) {
            const user = rows[0];
            const emailContent = `
                Dear ${user.first_name},
                Your booking (ID: ${bookingId}) has been cancelled.
                Reason: ${reason || 'User initiated'}
                
                If this was a mistake, please contact support.
            `;

            // Simulate sending email
            logger.info('');
            logger.info('📧 =================================================');
            logger.info(`📧 SENDING NOTIFICATION TO: ${user.email}`);
            logger.info(`📧 SUBJECT: Booking Cancelled - ${bookingId}`);
            logger.info(`📧 STATUS: SENT`);
            logger.info('📧 =================================================');
            logger.info('');
        }
    } catch (error) {
        logger.error(`Failed to send notification: ${error.message}`);
    }
}

// CORS with increased body size limit
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware - if enabled
if (process.env.ENABLE_COMPRESSION !== 'false') {
    app.use(compression());
    logger.info('🗜️   Compression: ENABLED');
} else {
    logger.info('🗜️   Compression: DISABLED');
}

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// ========== BODY PARSER & LOCAL ROUTES ==========
// only apply body parsing to local routes to avoid consuming streams for proxies
const jsonParser = express.json({ limit: '50mb' });
const urlEncodedParser = express.urlencoded({ limit: '50mb', extended: true });
const localMiddleware = [jsonParser, urlEncodedParser];

app.use('/auth', localMiddleware, authRoutes);
app.use('/api/admin', localMiddleware, adminRoutes);
app.use('/api/analytics', localMiddleware, analyticsRoutes);

// ========== API GATEWAY - Route to Microservices ==========
// Proxy routes come AFTER specific routes like /api/admin/*
// so that specific routes take precedence

// Flight Service
app.use('/api/flights', createProxyMiddleware({
    target: process.env.FLIGHT_SERVICE_URL || 'http://127.0.0.1:8001',
    changeOrigin: true,
    pathRewrite: { '^/api/flights': '/flights' },
    onError: (err, req, res) => {
        logger.error(`Flight service proxy error: ${err.message}`);
        res.status(503).json({ success: false, error: 'Flight service unavailable' });
    }
}));

// Hotel Service
app.use('/api/hotels', createProxyMiddleware({
    target: process.env.HOTEL_SERVICE_URL || 'http://127.0.0.1:8002',
    changeOrigin: true,
    pathRewrite: { '^/api/hotels': '/hotels' },
    onError: (err, req, res) => {
        logger.error(`Hotel service proxy error: ${err.message}`);
        res.status(503).json({ success: false, error: 'Hotel service unavailable' });
    }
}));

// Car Service
app.use('/api/cars', createProxyMiddleware({
    target: process.env.CAR_SERVICE_URL || 'http://127.0.0.1:8003',
    changeOrigin: true,
    pathRewrite: { '^/api/cars': '/cars' },
    onError: (err, req, res) => {
        logger.error(`Car service proxy error: ${err.message}`);
        res.status(503).json({ success: false, error: 'Car service unavailable' });
    }
}));

// Booking Service
app.use('/api/bookings', createProxyMiddleware({
    target: process.env.BOOKING_SERVICE_URL || 'http://127.0.0.1:8004',
    changeOrigin: true,
    pathRewrite: { '^/api/bookings': '/bookings' },
    onError: (err, req, res) => {
        logger.error(`Booking service proxy error: ${err.message}`);
        res.status(503).json({ success: false, error: 'Booking service unavailable' });
    }
}));

// Payment Service
app.use('/api/payments', createProxyMiddleware({
    target: process.env.PAYMENT_SERVICE_URL || 'http://127.0.0.1:8005',
    changeOrigin: true,
    pathRewrite: { '^/api/payments': '/payments' },
    onError: (err, req, res) => {
        logger.error(`Payment service proxy error: ${err.message}`);
        res.status(503).json({ success: false, error: 'Payment service unavailable' });
    }
}));

// Review Service
app.use('/api/reviews', createProxyMiddleware({
    target: process.env.REVIEW_SERVICE_URL || 'http://127.0.0.1:8006',
    changeOrigin: true,
    pathRewrite: { '^/api/reviews': '/reviews' },
    onError: (err, req, res) => {
        logger.error(`Review service proxy error: ${err.message}`);
        res.status(503).json({ success: false, error: 'Review service unavailable' });
    }
}));

// AI Service (with WebSocket support)
app.use('/api/ai', createProxyMiddleware({
    target: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8007',
    changeOrigin: true,
    pathRewrite: { '^/api/ai': '' },
    ws: true, // Enable WebSocket proxying
    onError: (err, req, res) => {
        logger.error(`AI service proxy error: ${err.message}`);
        res.status(503).json({ success: false, error: 'AI service unavailable' });
    },
    onProxyReqWs: (proxyReq, req, socket) => {
        // Handle WebSocket upgrade
        socket.on('error', (err) => {
            logger.error(`WebSocket error: ${err.message}`);
        });
    }
}));

// ========== USER AUTH & ADMIN ENDPOINTS ==========
app.use(express.json()); // Applied here for Auth and Admin endpoints


// Aggregate Health Check
app.get('/admin/health', async (req, res) => {
    try {
        const services = [
            { name: 'flight', url: `${process.env.FLIGHT_SERVICE_URL}/health` },
            { name: 'hotel', url: `${process.env.HOTEL_SERVICE_URL}/health` },
            { name: 'car', url: `${process.env.CAR_SERVICE_URL}/health` },
            { name: 'booking', url: `${process.env.BOOKING_SERVICE_URL}/health` },
            { name: 'payment', url: `${process.env.PAYMENT_SERVICE_URL}/health` },
            { name: 'review', url: `${process.env.REVIEW_SERVICE_URL}/health` }
        ];

        const healthChecks = await Promise.allSettled(
            services.map(async (service) => {
                try {
                    const response = await fetch(service.url);
                    const data = await response.json();
                    return { name: service.name, status: data.status || 'unknown', healthy: data.status === 'healthy' };
                } catch (error) {
                    return { name: service.name, status: 'down', healthy: false };
                }
            })
        );

        const results = healthChecks.map(r => r.value || r.reason);
        const allHealthy = results.every(r => r.healthy);

        res.status(allHealthy ? 200 : 503).json({
            success: true,
            platform: 'healthy',
            services: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error(`Admin health check error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Platform Health
app.get('/health', async (req, res) => {
    try {
        await dbPool.execute('SELECT 1');
        res.status(200).json({
            status: 'healthy',
            service: 'platform-service',
            timestamp: new Date().toISOString(),
            dependencies: {
                database: 'connected'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Welcome message
app.get('/', (req, res) => {
    res.json({
        service: 'Kayak Platform Service',
        version: '1.0.0',
        endpoints: {
            auth: ['/auth/register', '/auth/login'],
            gateway: [
                '/api/flights/*',
                '/api/hotels/*',
                '/api/cars/*',
                '/api/bookings/*',
                '/api/payments/*',
                '/api/reviews/*'
            ],
            admin: ['/admin/health'],
            health: ['/health']
        }
    });
});

// Start the server if run directly
if (require.main === module) {
    const PORT = process.env.PORT || 8080;

    // Initialize Notification System
    initNotificationSystem();

    app.listen(PORT, () => {
        logger.info('');
        logger.info('═══════════════════════════════════════');
        logger.info('  🌐 Platform Service (API Gateway)');
        logger.info('═══════════════════════════════════════');
        logger.info(`  Port: ${PORT}`);
        logger.info('');
        logger.info('  Gateway Routes:');
        logger.info(`  /api/flights/*   → Flight Service (8001)`);
        logger.info(`  /api/hotels/*    → Hotel Service (8002)`);
        logger.info(`  /api/cars/*      → Car Service (8003)`);
        logger.info(`  /api/bookings/*  → Booking Service (8004)`);
        logger.info(`  /api/payments/*  → Payment Service (8005)`);
        logger.info(`  /api/reviews/*   → Review Service (8006)`);
        logger.info(`  /api/ai/*        → AI Service (8007)`);
        logger.info('');
        logger.info('  Auth:');
        logger.info(`  POST /auth/register`);
        logger.info(`  POST /auth/login`);
        logger.info('');
        logger.info('  Admin:');
        logger.info(`  GET /admin/health (all services)`);
        logger.info('═══════════════════════════════════════');
        logger.info('');
    });
}

module.exports = { app, dbPool };
