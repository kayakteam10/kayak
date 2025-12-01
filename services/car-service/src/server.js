/**
 * Car Service - Main Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');

const dbPool = require('./config/database');
const redisClient = require('./config/redis');

const CarRepository = require('./repositories/CarRepository');
const CacheRepository = require('./repositories/CacheRepository');
const CarService = require('./services/CarService');
const CarController = require('./controllers/CarController');
const createCarRoutes = require('./routes/carRoutes');
const validationMiddleware = require('./middleware/validationMiddleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

let kafkaProducer = null;

async function initializeKafka() {
    const { Kafka } = require('kafkajs');

    const kafka = new Kafka({
        clientId: 'car-service',
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

async function initializeApp() {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use((req, res, next) => {
        logger.info(`${req.method} ${req.path}`);
        next();
    });

    const kafka = await initializeKafka();

    const carRepo = new CarRepository(dbPool);
    const cacheRepo = new CacheRepository(redisClient);
    const carService = new CarService(carRepo, cacheRepo, kafka);
    const carController = new CarController(carService);

    app.use('/cars', createCarRoutes(carController, validationMiddleware));

    app.get('/health', async (req, res) => {
        try {
            const [dbResult] = await dbPool.execute('SELECT 1');
            const dbHealthy = dbResult.length > 0;
            const redisHealthy = redisClient.isReady;
            const kafkaHealthy = kafka !== null;

            const health = {
                status: dbHealthy ? 'healthy' : 'unhealthy',
                service: 'car-service',
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

    app.use(notFoundHandler);
    app.use(errorHandler);

    return { app, kafka };
}

async function startServer() {
    try {
        const { app, kafka } = await initializeApp();

        const PORT = process.env.PORT || 8003;
        const server = app.listen(PORT, () => {
            logger.info('');
            logger.info('═══════════════════════════════════════');
            logger.info('  🚗 Car Service');
            logger.info('═══════════════════════════════════════');
            logger.info(`  Port: ${PORT}`);
            logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`    database: ${process.env.DB_NAME || 'kayak_db'},
    port: ${process.env.DB_PORT || 3306},
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
`);
            logger.info('');
            logger.info('  Endpoints:');
            logger.info(`  GET    /cars/search`);
            logger.info(`  GET    /cars/:id`);
            logger.info(`  POST   /cars/:id/reserve`);
            logger.info(`  GET    /cars/search-locations`);
            logger.info(`  GET    /health`);
            logger.info('═══════════════════════════════════════');
            logger.info('');
        });

        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully...');
            server.close(async () => {
                await dbPool.end();
                await redisClient.quit();
                if (kafka) await kafka.disconnect();
                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            logger.info('\nSIGINT received, shutting down gracefully...');
            server.close(async () => {
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
