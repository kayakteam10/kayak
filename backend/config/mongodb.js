const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB Connection Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'kayak_db';

let client = null;
let db = null;

// Initialize MongoDB connection
async function connectMongoDB() {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(DB_NAME);
      console.log('✅ MongoDB connected:', DB_NAME);
      
      // Initialize indexes if they don't exist
      await initializeIndexes();
    }
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Make sure MongoDB is running.');
    throw error;
  }
}

// Initialize MongoDB indexes
async function initializeIndexes() {
  try {
    // Reviews indexes
    await db.collection('reviews').createIndexes([
      { key: { entityType: 1, entityId: 1 } },
      { key: { userId: 1 } },
      { key: { rating: 1 } },
      { key: { createdAt: -1 } },
      { key: { verified: 1 } },
      { key: { entityType: 1, entityId: 1, rating: 1 } }
    ]);
    
    // Images indexes
    await db.collection('images').createIndexes([
      { key: { entityType: 1, entityId: 1 } },
      { key: { userId: 1 } },
      { key: { uploadDate: -1 } },
      { key: { tags: 1 } },
      { key: { 'metadata.location': '2dsphere' } }
    ]);
    
    // Logs indexes with TTL (auto-delete after 90 days)
    await db.collection('logs').createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 7776000 } // 90 days
    );
    await db.collection('logs').createIndexes([
      { key: { level: 1, timestamp: -1 } },
      { key: { userId: 1, timestamp: -1 } },
      { key: { action: 1, timestamp: -1 } },
      { key: { ipAddress: 1 } },
      { key: { 'metadata.sessionId': 1 } }
    ]);
    
    // User preferences index
    await db.collection('user_preferences').createIndex(
      { userId: 1 },
      { unique: true }
    );
    
    console.log('✅ MongoDB indexes initialized');
  } catch (error) {
    // Indexes might already exist, that's okay
    if (!error.message.includes('already exists')) {
      console.error('Error initializing MongoDB indexes:', error.message);
    }
  }
}

// Get database instance
async function getDB() {
  if (!db) {
    await connectMongoDB();
  }
  return db;
}

// Close connection
async function closeMongoDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connectMongoDB,
  getDB,
  closeMongoDB,
  DB_NAME
};

