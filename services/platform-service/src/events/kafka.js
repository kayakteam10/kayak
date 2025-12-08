const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');
const { MongoClient } = require('mongodb');

// Constants
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongodb:27017';
const MONGO_DB = 'kayak_db';

let kafka;
let producer;
let consumer;
let mongoClient;
let db;

async function initKafka() {
    try {
        logger.info('Initializing Kafka Analytics System...');

        kafka = new Kafka({
            clientId: 'platform-service',
            brokers: [KAFKA_BROKER]
        });

        // Producer
        producer = kafka.producer();
        await producer.connect();
        logger.info('Kafka Producer Connected');

        // Consumer
        consumer = kafka.consumer({ groupId: 'analytics-group' });
        await consumer.connect();
        logger.info('Kafka Consumer Connected');

        await consumer.subscribe({ topic: 'analytics.events', fromBeginning: false });
        logger.info('Subscribed to analytics.events topic');

        // MongoDB for Consumer (to save analytics)
        if (!process.env.TEST_MODE) {
            mongoClient = new MongoClient(MONGO_URL);
            await mongoClient.connect();
            db = mongoClient.db(MONGO_DB);
            logger.info(`✅ MongoDB Consumer DB Connected (URL: ${MONGO_URL}, DB: ${MONGO_DB})`);
        }

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const event = JSON.parse(message.value.toString());
                    logger.info(`Processing Kafka Event: ${event.type}`);
                    await processAnalyticsEvent(event, db);
                    logger.info(`Event processed successfully`);
                } catch (e) {
                    logger.error(`Error processing analytics message: ${e.message}`);
                    logger.error(e.stack);
                }
            },
        });
        logger.info('Kafka Consumer Running (analytics.events)');

    } catch (error) {
        logger.error(`Kafka Init Error: ${error.message}`);
        logger.error(error.stack);
    }
}

// Send Message
async function sendAnalyticsEvent(event) {
    if (!producer) {
        await initKafka();
    }
    try {
        await producer.send({
            topic: 'analytics.events',
            messages: [{ value: JSON.stringify(event) }],
        });
        logger.info(`Sent Kafka Event: ${event.type}`);
    } catch (error) {
        logger.error(`Failed to send Kafka event: ${error.message}`);
    }
}

// Process Event (Consumer Logic)
async function processAnalyticsEvent(event, database) {
    if (!database) return;

    logger.info(`📥 Processing Kafka Event: ${event.type}`);

    if (event.type === 'page_click') {
        const { page, section } = event;
        await database.collection('page_clicks').updateOne(
            { page, section: section || 'general' },
            { $inc: { clicks: 1, unique_users: 1 }, $set: { timestamp: new Date() } },
            { upsert: true }
        );
    }
    else if (event.type === 'property_click') {
        const { property_id, property_name, property_type } = event;
        await database.collection('property_clicks').updateOne(
            { property_id: parseInt(property_id), property_type },
            {
                $inc: { clicks: 1 },
                $set: { property_name, timestamp: new Date() },
            },
            { upsert: true }
        );
    }
    else if (event.type === 'section_view') {
        const { page, section, visibility_score } = event;
        await database.collection('section_visibility').updateOne(
            { page, section },
            {
                $inc: { views: 1 },
                $set: { visibility_score: visibility_score || 50, timestamp: new Date() },
            },
            { upsert: true }
        );
    }
    else if (event.type === 'user_activity') {
        // Track user activities (login, booking, etc.)
        const { user_id, activity_type, details } = event;
        await database.collection('activity_logs').insertOne({
            user_id: parseInt(user_id),
            activity_type,
            details: details || {},
            timestamp: new Date()
        });
    }
    else if (event.type === 'search') {
        // Track user searches
        const { user_id, search_type, search_params } = event;
        await database.collection('search_history').insertOne({
            user_id: parseInt(user_id),
            search_type,
            search_params: search_params || {},
            timestamp: new Date()
        });
    }
    // Add more handlers as needed
}

module.exports = { initKafka, sendAnalyticsEvent };
