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
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('./utils/logger');
const dbPool = require('./config/database'); // Initializes DB connection
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// ========== API GATEWAY - Route to Microservices ==========

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

// AI Service
app.use('/api/ai', createProxyMiddleware({
    target: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8008',
    changeOrigin: true,
    pathRewrite: { '^/api/ai': '' },
    onError: (err, req, res) => {
        logger.error(`AI service proxy error: ${err.message}`);
        res.status(503).json({ success: false, error: 'AI service unavailable' });
    }
}));

// ========== USER AUTH & ADMIN ENDPOINTS ==========
app.use(express.json()); // Applied here for Auth and Admin endpoints

app.use('/auth', authRoutes);
app.use('/api/admin', adminRoutes);

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
