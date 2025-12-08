const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

const uri = process.env.MONGO_URL || 'mongodb://kayak-mongodb:27017';
const client = new MongoClient(uri);
let db = null;

async function connectToMongo() {
    try {
        if (!db) {
            await client.connect();
            db = client.db(process.env.MONGO_DB_NAME || 'kayak_db');
            logger.info('✅ Platform Service Connected to MongoDB');
        }
        return db;
    } catch (error) {
        logger.error(`❌ MongoDB connection error: ${error.message}`);
        throw error;
    }
}

function getDb() {
    return db;
}

module.exports = { connectToMongo, getDb };
