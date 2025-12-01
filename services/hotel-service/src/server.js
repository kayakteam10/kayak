/**
 * Hotel Service - Main Server
 * 
 * SOLID Principles Applied:
 * - Dependency Injection: All dependencies injected bottom-up
 * - Single Responsibility: Server only handles app initialization
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');

// Configurations
const dbPool = require('./config/database');
const redisClient = require('./config/redis');
const { connectMongoDB, getMongoDb } = require('./config/mongodb');

// Repositories
const HotelRepository = require('./repositories/HotelRepository');
const CacheRepository = require('./repositories/CacheRepository');

// Services
const HotelService = require('./services/HotelService');

// Controllers
const HotelController = require('./controllers/HotelController');

// Routes
const createHotelRoutes = require('./routes/hotelRoutes');

// Middleware
const validationMiddleware = require('./middleware/validationMiddleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

// Kafka (optional)
let kafkaProducer = null;

/**
 * Initialize Kafka Producer
 */
async function initializeKafka() {
    const { Kafka } = require('kafkajs');

    const kafka = new Kafka({
        clientId: 'hotel-service',
        brokers: [(process.env.KAFKA_BROKER || 'localhost:9094')],
        retry: {
            initialRetryTime: 100,
            retries: 8
        }
    });

    kafkaProducer = kafka.producer();
    await kafkaProducer.connect();
    logger.info('✅ Kafka producer connected');

    return kafkaProducer;
}

/**
 * Initialize Application
 */
async function initializeApp() {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use((req, res, next) => {
        logger.info(`${req.method} ${req.path}`);
        next();
    });

    // Initialize Kafka (optional)
    const kafka = await initializeKafka();

    // Initialize MongoDB (optional)
    const mongoDb = getMongoDb();

    // Build dependency tree (Dependency Injection)
    const hotelRepo = new HotelRepository(dbPool);
    const cacheRepo = new CacheRepository(redisClient);
    const hotelService = new HotelService(hotelRepo, cacheRepo, kafka, mongoDb);
    const hotelController = new HotelController(hotelService);

    // Register routes
    app.use('/hotels', createHotelRoutes(hotelController, validationMiddleware));

    // Health check endpoint
    app.get('/health', async (req, res) => {
        try {
            const [dbResult] = await dbPool.execute('SELECT 1');
            const dbHealthy = dbResult.length > 0;
            const redisHealthy = redisClient.isReady;
            const kafkaHealthy = kafka !== null;
            const mongoHealthy = mongoDb !== null;

            const health = {
                status: dbHealthy ? 'healthy' : 'unhealthy',
                service: 'hotel-service',
                timestamp: new Date().toISOString(),
                dependencies: {
                    database: dbHealthy ? 'connected' : 'disconnected',
                    redis: redisHealthy ? 'connected' : 'disconnected',
                    kafka: kafkaHealthy ? 'connected' : 'disconnected',
                    mongodb: mongoHealthy ? 'connected' : 'disconnected'
                }
            };

            res.status(dbHealthy ? 200 : 503).json(health);
        } catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                error: error.message
            });
        }
    });

    // 404 handler
    app.use(notFoundHandler);

    // Error handler (must be LAST)
    app.use(errorHandler);

    return { app, kafka };
}

/**
 * Start Server
 */
async function startServer() {
    try {
        const { app, kafka } = await initializeApp();

        const PORT = process.env.PORT || 8002;
        const server = app.listen(PORT, () => {
            logger.info('');
            logger.info('═══════════════════════════════════════');
            logger.info('  🏨 Hotel Service');
            logger.info('═══════════════════════════════════════');
            logger.info(`  Port: ${PORT}`);
            logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`  Database: ${process.env.DB_NAME}`);
            logger.info(`  Database Port: ${process.env.DB_PORT || 3306}`);
            logger.info('');
            logger.info('  Endpoints:');
            logger.info(`  GET    /hotels/search`);
            logger.info(`  GET    /hotels/:id`);
            logger.info(`  GET    /hotels/:id/rooms`);
            logger.info(`  POST   /hotels/:id/rooms/reserve`);
            logger.info(`  GET    /hotels/search-cities`);
            logger.info(`  GET    /health`);
            logger.info('═══════════════════════════════════════');
            logger.info('');
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully...');

            server.close(async () => {
                logger.info('HTTP server closed');
                await dbPool.end();
                await redisClient.quit();
                if (kafka) await kafka.disconnect();
                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            logger.info('\nSIGINT received, shutting down gracefully...');

            server.close(async () => {
                logger.info('HTTP server closed');
                await dbPool.end();
                await redisClient.quit();
                if (kafka) await kafka.disconnect();
                process.exit(0);
            });
        });

    } catch (error) {
        logger.error(`❌ Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

// Start the server if run directly
if (require.main === module) {
    startServer();
}

module.exports = { initializeApp };
