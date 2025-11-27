// MongoDB Schemas for Kayak Travel Booking System
// Used for: Reviews, Images, Logs (flexible, document-based data)

// MongoDB Connection Setup
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'kayak_db';

// ============================================
// COLLECTION SCHEMAS
// ============================================

// 1. REVIEWS COLLECTION
// Why MongoDB: Variable structure, rich nested data, easy to query and aggregate
const reviewsSchema = {
  collection: 'reviews',
  indexes: [
    { entityType: 1, entityId: 1 },           // For finding reviews by hotel/flight/car
    { userId: 1 },                             // For finding user's reviews
    { rating: 1 },                             // For sorting by rating
    { createdAt: -1 },                         // For recent reviews
    { verified: 1 },                           // For verified reviews only
    { entityType: 1, entityId: 1, rating: 1 } // Compound index for filtering
  ],
  sampleDocument: {
    _id: ObjectId(),
    entityType: 'hotel', // 'hotel', 'flight', 'car'
    entityId: 123,       // Reference to hotel/flight/car ID in MySQL
    userId: 456,         // Reference to user ID in MySQL
    userName: 'John Doe',
    userEmail: 'john@example.com',
    rating: 4.5,         // 1-5
    title: 'Great stay!',
    reviewText: 'Wonderful experience, clean rooms...',
    photos: [            // Array of image references
      { imageId: ObjectId(), url: 'https://...', caption: 'Room view' }
    ],
    helpfulCount: 12,
    verified: true,      // Verified booking
    response: {          // Hotel owner response (optional)
      text: 'Thank you for your feedback!',
      respondedBy: 'Hotel Manager',
      respondedAt: ISODate()
    },
    createdAt: ISODate(),
    updatedAt: ISODate()
  }
};

// 2. IMAGES COLLECTION
// Why MongoDB: Flexible metadata, varying EXIF data, easy to store multiple formats
const imagesSchema = {
  collection: 'images',
  indexes: [
    { entityType: 1, entityId: 1 },     // For finding images by hotel/flight/car/user
    { userId: 1 },                       // For finding user uploads
    { uploadDate: -1 },                  // For recent uploads
    { tags: 1 },                         // For tag-based search
    { 'metadata.location': '2dsphere' }  // For geospatial queries (if GPS data exists)
  ],
  sampleDocument: {
    _id: ObjectId(),
    entityType: 'hotel',  // 'hotel', 'flight', 'car', 'user', 'review'
    entityId: 123,
    userId: 456,          // Who uploaded it
    url: 'https://cdn.kayak.com/images/hotel-123.jpg',
    thumbnailUrl: 'https://cdn.kayak.com/images/thumbs/hotel-123.jpg',
    filename: 'hotel-room-view.jpg',
    mimeType: 'image/jpeg',
    size: 2048576,        // bytes
    width: 1920,
    height: 1080,
    tags: ['room', 'view', 'ocean'],
    metadata: {
      location: {         // GPS coordinates (if available)
        type: 'Point',
        coordinates: [-122.4194, 37.7749]
      },
      exif: {
        camera: 'Canon EOS 5D',
        iso: 400,
        shutterSpeed: '1/125',
        aperture: 'f/2.8'
      }
    },
    uploadDate: ISODate(),
    isPublic: true,
    isVerified: false    // Verified as authentic
  }
};

// 3. LOGS COLLECTION
// Why MongoDB: High volume, time-series data, varying log structures
const logsSchema = {
  collection: 'logs',
  indexes: [
    { timestamp: -1 },                   // For time-based queries (TTL index)
    { level: 1, timestamp: -1 },       // For filtering by log level
    { userId: 1, timestamp: -1 },       // For user activity logs
    { action: 1, timestamp: -1 },       // For specific action tracking
    { ipAddress: 1 },                    // For security/analytics
    { 'metadata.sessionId': 1 }        // For session tracking
  ],
  sampleDocument: {
    _id: ObjectId(),
    timestamp: ISODate(),
    level: 'info',       // 'debug', 'info', 'warn', 'error'
    action: 'search_flights',  // User action
    userId: 456,         // Optional - null for anonymous
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    metadata: {
      sessionId: 'abc123xyz',
      requestId: 'req-789',
      searchParams: {
        origin: 'New York',
        destination: 'Los Angeles',
        date: '2024-12-20'
      },
      responseTime: 234,  // milliseconds
      statusCode: 200
    },
    message: 'Flight search completed',
    error: null,         // Error object if level is 'error'
    stackTrace: null
  }
};

// 4. USER_PREFERENCES COLLECTION (Bonus)
// Why MongoDB: Flexible, nested preferences that vary by user
const userPreferencesSchema = {
  collection: 'user_preferences',
  indexes: [
    { userId: 1 }  // Unique per user
  ],
  sampleDocument: {
    _id: ObjectId(),
    userId: 456,   // Reference to MySQL users table
    notifications: {
      email: true,
      sms: false,
      push: true,
      preferences: ['booking_confirmation', 'price_alerts']
    },
    searchPreferences: {
      defaultCurrency: 'USD',
      defaultLanguage: 'en',
      preferredAirlines: ['Delta', 'United'],
      seatPreference: 'window',
      classPreference: 'economy'
    },
    savedSearches: [
      {
        name: 'NYC to LA',
        origin: 'New York',
        destination: 'Los Angeles',
        savedAt: ISODate()
      }
    ],
    updatedAt: ISODate()
  }
};

// ============================================
// INITIALIZATION FUNCTION
// ============================================

async function initializeMongoDB() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Create indexes
    console.log('Creating MongoDB indexes...');
    
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
    
    console.log('MongoDB initialized successfully!');
    
  } catch (error) {
    console.error('Error initializing MongoDB:', error);
    throw error;
  } finally {
    await client.close();
  }
}

module.exports = {
  reviewsSchema,
  imagesSchema,
  logsSchema,
  userPreferencesSchema,
  initializeMongoDB,
  DB_NAME,
  MONGODB_URI
};

