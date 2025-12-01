/**
 * Flight Service - Main Server
 * 
 * SOLID Principles Applied:
 * - Dependency Injection: All dependencies injected bottom-up
 * - Single Responsibility: Server only handles app initialization
 * 
 * Architecture:
 * Server → Routes → Controller → Service → Repository → Database
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');

// Configurations
const dbPool = require('./config/database');
const redisClient = require('./config/redis');

// Repositories
const FlightRepository = require('./repositories/FlightRepository');
const CacheRepository = require('./repositories/CacheRepository');

// Services
const FlightService = require('./services/FlightService');

// Controllers
const FlightController = require('./controllers/FlightController');

// Routes
const createFlightRoutes = require('./routes/flightRoutes');

// Middleware
const validationMiddleware = require('./middleware/validationMiddleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

// Kafka (optional - will be null if not configured)
let kafkaProducer = null;

/**
 * Initialize Kafka Producer
 */
async function initializeKafka() {
    const { Kafka } = require('kafkajs');

    const kafka = new Kafka({
        clientId: 'flight-service',
        brokers: [(process.env.KAFKA_BROKER || 'localhost:9094')],
        retry: {
            initialRetryTime: 100,
            retries: 8
        }
    });

    const producer = kafka.producer();
    await producer.connect();
    logger.info('✅ Kafka Producer connected');
    return producer;
}

/**
 * Initialize Application
 * Dependency Injection Pattern
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

    // Build dependency tree (Dependency Injection)
    const flightRepo = new FlightRepository(dbPool);
    const cacheRepo = new CacheRepository(redisClient);
    const flightService = new FlightService(flightRepo, cacheRepo, kafka);
    const flightController = new FlightController(flightService);

    // Register routes
    app.use('/flights', createFlightRoutes(flightController, validationMiddleware));

    // Health check endpoint
    app.get('/health', async (req, res) => {
        try {
            // Check database
            const [dbResult] = await dbPool.execute('SELECT 1');
            const dbHealthy = dbResult.length > 0;

            // Check Redis
            const redisHealthy = redisClient.isReady;

            // Check Kafka
            const kafkaHealthy = kafka !== null;

            const health = {
                status: dbHealthy ? 'healthy' : 'unhealthy',
                service: 'flight-service',
                timestamp: new Date().toISOString(),
                dependencies: {
                    database: dbHealthy ? 'connected' : 'disconnected',
                    redis: redisHealthy ? 'connected' : 'disconnected',
                    kafka: kafkaHealthy ? 'connected' : 'disconnected'
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

    // 404 handler (must be after all routes)
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

        const PORT = process.env.PORT || 8001;
        const server = app.listen(PORT, () => {
            logger.info('');
            logger.info('═══════════════════════════════════════');
            logger.info('  🚀 Flight Service');
            logger.info('═══════════════════════════════════════');
            logger.info(`  Port: ${PORT}`);
            logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`  Database: ${process.env.DB_NAME}`);
            logger.info(`  Database Port: ${process.env.DB_PORT || 3306}`);
            logger.info('');
            logger.info('  Endpoints:');
            logger.info(`  GET    /flights/search`);
            logger.info(`  GET    /flights/:id`);
            logger.info(`  GET    /flights/:id/seats`);
            logger.info(`  POST   /flights/:id/seats/reserve`);
            logger.info(`  GET    /airports/search`);
            logger.info(`  GET    /health`);
            logger.info('═══════════════════════════════════════');
            logger.info('');
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully...');

            server.close(async () => {
                logger.info('HTTP server closed');

                // Close connections
                await dbPool.end();
                await redisClient.quit();

                if (kafka) {
                    await kafka.disconnect();
                }

                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            logger.info('\nSIGINT received, shutting down gracefully...');

            server.close(async () => {
                logger.info('HTTP server closed');

                await dbPool.end();
                await redisClient.quit();

                if (kafka) {
                    await kafka.disconnect();
                }

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
