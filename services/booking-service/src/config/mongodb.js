const mongodb = require('mongodb');
require('dotenv').config();

let mongoClient = null;
let db = null;

/**
 * Connect to MongoDB
 */
async function connectMongoDB() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
        mongoClient = new mongodb.MongoClient(uri);

        await mongoClient.connect();
        db = mongoClient.db(process.env.MONGO_DB_NAME || 'kayak_db');

        console.log('✅ MongoDB connected:', process.env.MONGO_DB_NAME || 'kayak_db');
        return db;
    } catch (error) {
        console.warn('⚠️  MongoDB not available:', error.message);
        console.log('📝 Service will run without image storage');
        return null;
    }
}

/**
 * Get MongoDB database instance
 */
function getMongoDb() {
    return db;
}

/**
 * Close MongoDB connection
 */
async function closeMongoDB() {
    if (mongoClient) {
        await mongoClient.close();
        console.log('MongoDB connection closed');
    }
}

// Connect on startup
connectMongoDB().catch(err => {
    console.error('MongoDB connection failed:', err.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await closeMongoDB();
});

module.exports = {
    connectMongoDB,
    getMongoDb,
    closeMongoDB
};
