/**
 * Kayak MongoDB Initialization Script
 * Based on Finalized Schemas (Images, Reviews, Logs, Notifications)
 * 
 * Usage:
 *   node database-new/init-mongodb-final.js
 */

const { MongoClient } = require('../backend/node_modules/mongodb');
require('../backend/node_modules/dotenv/lib/main').config({ path: '../backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'kayak_db';

// Dummy 1x1 transparent PNG in Base64 (for testing)
const DUMMY_BASE64_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function initializeMongoDB() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db(DB_NAME);

        // ========================================================================
        // Clean up existing collections
        // ========================================================================
        console.log('\n🧹 Cleaning up old collections...');

        try {
            await db.collection('images').drop();
            console.log('   Dropped: images');
        } catch (err) {
            console.log('   images collection does not exist (OK)');
        }

        try {
            await db.collection('reviews').drop();
            console.log('   Dropped: reviews');
        } catch (err) {
            console.log('   reviews collection does not exist (OK)');
        }

        try {
            await db.collection('logs').drop();
            console.log('   Dropped: logs');
        } catch (err) {
            console.log('   logs collection does not exist (OK)');
        }

        try {
            await db.collection('notifications').drop();
            console.log('   Dropped: notifications');
        } catch (err) {
            console.log('   notifications collection does not exist (OK)');
        }

        // ========================================================================
        // 1. IMAGES COLLECTION
        // ========================================================================
        console.log('\n🖼️  Creating Images collection...');

        await db.createCollection('images', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['entity_type', 'entity_id', 'image_type', 'mime_type', 'base64_data', 'created_at'],
                    properties: {
                        entity_type: {
                            enum: ['user', 'hotel'],
                            description: 'Type of entity the image belongs to'
                        },
                        entity_id: {
                            bsonType: 'int',
                            description: 'MySQL ID (User ID or Hotel ID)'
                        },
                        image_type: {
                            enum: ['profile', 'room', 'property_exterior'],
                            description: 'Type/purpose of the image'
                        },
                        mime_type: {
                            enum: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                            description: 'Image MIME type'
                        },
                        base64_data: {
                            bsonType: 'string',
                            description: 'Complete Base64 string'
                        },
                        created_at: {
                            bsonType: 'date'
                        }
                    }
                }
            }
        });

        // Create indexes
        await db.collection('images').createIndexes([
            { key: { entity_type: 1, entity_id: 1 } },
            { key: { created_at: -1 } }
        ]);

        // Insert dummy data based on SQL users and hotels
        await db.collection('images').insertMany([
            {
                entity_type: 'user',
                entity_id: 1,
                image_type: 'profile',
                mime_type: 'image/png',
                base64_data: DUMMY_BASE64_IMAGE,
                created_at: new Date()
            },
            {
                entity_type: 'user',
                entity_id: 2,
                image_type: 'profile',
                mime_type: 'image/png',
                base64_data: DUMMY_BASE64_IMAGE,
                created_at: new Date()
            },
            {
                entity_type: 'hotel',
                entity_id: 1,  // Hilton SF
                image_type: 'room',
                mime_type: 'image/jpeg',
                base64_data: DUMMY_BASE64_IMAGE,
                created_at: new Date()
            },
            {
                entity_type: 'hotel',
                entity_id: 1,  // Hilton SF
                image_type: 'property_exterior',
                mime_type: 'image/jpeg',
                base64_data: DUMMY_BASE64_IMAGE,
                created_at: new Date()
            },
            {
                entity_type: 'hotel',
                entity_id: 2,  // Marriott NY
                image_type: 'room',
                mime_type: 'image/jpeg',
                base64_data: DUMMY_BASE64_IMAGE,
                created_at: new Date()
            }
        ]);

        console.log('✅ Images collection created with 5 dummy images');

        // ========================================================================
        // 2. REVIEWS COLLECTION
        // ========================================================================
        console.log('\n📝 Creating Reviews collection...');

        await db.createCollection('reviews', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['user_id', 'target_type', 'target_id', 'rating', 'comment', 'created_at'],
                    properties: {
                        user_id: {
                            bsonType: 'int',
                            description: 'MySQL User ID'
                        },
                        target_type: {
                            enum: ['flight', 'hotel', 'car'],
                            description: 'Type of service being reviewed'
                        },
                        target_id: {
                            bsonType: 'int',
                            description: 'MySQL ID of Flight/Hotel/Car'
                        },
                        rating: {
                            bsonType: 'int',
                            minimum: 1,
                            maximum: 5,
                            description: '1-5 star rating'
                        },
                        comment: {
                            bsonType: 'string',
                            description: 'Review text content'
                        },
                        created_at: {
                            bsonType: 'date'
                        }
                    }
                }
            }
        });

        // Create indexes
        await db.collection('reviews').createIndexes([
            { key: { target_type: 1, target_id: 1 } },
            { key: { user_id: 1 } },
            { key: { rating: -1 } },
            { key: { created_at: -1 } }
        ]);

        // Insert dummy reviews based on SQL data
        await db.collection('reviews').insertMany([
            {
                user_id: 2,  // Jane Smith
                target_type: 'hotel',
                target_id: 1,  // Hilton SF
                rating: 5,
                comment: 'Excellent location and amenities! The rooms were spotless and staff was very friendly.',
                created_at: new Date('2025-11-20')
            },
            {
                user_id: 3,  // Mike Brown
                target_type: 'hotel',
                target_id: 1,  // Hilton SF
                rating: 4,
                comment: 'Great stay overall. Only minor issue was the wifi speed.',
                created_at: new Date('2025-11-22')
            },
            {
                user_id: 2,  // Jane Smith
                target_type: 'flight',
                target_id: 1,
                rating: 4,
                comment: 'Flight was on time and comfortable, but limited entertainment options.',
                created_at: new Date('2025-11-15')
            },
            {
                user_id: 4,  // Sarah Davis
                target_type: 'car',
                target_id: 1,  // Hertz - Toyota Camry
                rating: 5,
                comment: 'Clean car, smooth pickup process. Highly recommend!',
                created_at: new Date('2025-11-18')
            },
            {
                user_id: 1,  // John Doe
                target_type: 'hotel',
                target_id: 2,  // Marriott NY
                rating: 5,
                comment: 'Perfect location in Manhattan. Would definitely stay again.',
                created_at: new Date('2025-11-25')
            }
        ]);

        console.log('✅ Reviews collection created with 5 dummy reviews');

        // ========================================================================
        // 3. LOGS (Analytics) COLLECTION
        // ========================================================================
        console.log('\n📊 Creating Logs collection...');

        await db.createCollection('logs', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['event_type', 'timestamp'],
                    properties: {
                        user_id: {
                            bsonType: ['int', 'null'],
                            description: 'MySQL User ID (nullable for guest visitors)'
                        },
                        event_type: {
                            enum: ['page_view', 'click', 'search', 'booking_attempt'],
                            description: 'Type of analytics event'
                        },
                        page_url: {
                            bsonType: 'string',
                            description: 'Page URL for page view tracking'
                        },
                        target_entity: {
                            enum: ['hotel', 'flight', 'car', null],
                            description: 'Entity type for click tracking'
                        },
                        target_id: {
                            bsonType: ['int', 'null'],
                            description: 'Entity ID for click tracking'
                        },
                        session_id: {
                            bsonType: 'string',
                            description: 'Session ID for user trace tracking'
                        },
                        meta: {
                            bsonType: 'object',
                            description: 'Additional metadata (browser, search params, etc.)'
                        },
                        timestamp: {
                            bsonType: 'date'
                        }
                    }
                }
            }
        });

        // Create indexes for analytics queries
        await db.collection('logs').createIndexes([
            { key: { user_id: 1, timestamp: -1 } },
            { key: { session_id: 1, timestamp: 1 } },
            { key: { event_type: 1, timestamp: -1 } },
            { key: { page_url: 1 } },
            { key: { target_entity: 1, target_id: 1 } }
        ]);

        // Insert dummy analytics logs
        const sessionId = 'sess_' + Date.now();
        await db.collection('logs').insertMany([
            {
                user_id: 2,  // Jane Smith
                event_type: 'page_view',
                page_url: '/hotels/search',
                session_id: sessionId,
                meta: { browser: 'Chrome', device: 'desktop' },
                timestamp: new Date('2025-11-27T10:00:00')
            },
            {
                user_id: 2,
                event_type: 'search',
                page_url: '/hotels/search',
                session_id: sessionId,
                meta: {
                    search_params: { city: 'San Francisco', dates: '2025-12-20 to 2025-12-25' }
                },
                timestamp: new Date('2025-11-27T10:01:00')
            },
            {
                user_id: 2,
                event_type: 'click',
                page_url: '/hotels/1',
                target_entity: 'hotel',
                target_id: 1,
                session_id: sessionId,
                meta: {},
                timestamp: new Date('2025-11-27T10:02:00')
            },
            {
                user_id: 2,
                event_type: 'booking_attempt',
                page_url: '/hotels/1/book',
                target_entity: 'hotel',
                target_id: 1,
                session_id: sessionId,
                meta: { total_price: 450.00 },
                timestamp: new Date('2025-11-27T10:05:00')
            },
            {
                user_id: null,  // Guest visitor
                event_type: 'page_view',
                page_url: '/flights/search',
                session_id: 'sess_guest_123',
                meta: { browser: 'Safari', device: 'mobile' },
                timestamp: new Date('2025-11-27T09:30:00')
            }
        ]);

        console.log('✅ Logs collection created with 5 analytics events');

        // ========================================================================
        // 4. NOTIFICATIONS COLLECTION
        // ========================================================================
        console.log('\n🔔 Creating Notifications collection...');

        await db.createCollection('notifications', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['user_id', 'type', 'title', 'message', 'is_read', 'created_at'],
                    properties: {
                        user_id: {
                            bsonType: 'int',
                            description: 'MySQL User ID'
                        },
                        type: {
                            enum: ['price_alert', 'booking_status', 'ai_recommendation'],
                            description: 'Notification type'
                        },
                        title: {
                            bsonType: 'string'
                        },
                        message: {
                            bsonType: 'string'
                        },
                        is_read: {
                            bsonType: 'bool'
                        },
                        created_at: {
                            bsonType: 'date'
                        }
                    }
                }
            }
        });

        // Create indexes
        await db.collection('notifications').createIndexes([
            { key: { user_id: 1, created_at: -1 } },
            { key: { is_read: 1 } }
        ]);

        // Insert dummy notifications
        await db.collection('notifications').insertMany([
            {
                user_id: 1,  // John Doe
                type: 'price_alert',
                title: 'Price Drop Alert',
                message: 'The flight to NYC you watched has dropped by $50. Book now!',
                is_read: false,
                created_at: new Date('2025-11-27T08:00:00')
            },
            {
                user_id: 2,  // Jane Smith
                type: 'booking_status',
                title: 'Booking Confirmed',
                message: 'Your hotel reservation at Hilton SF has been confirmed for Dec 20-25.',
                is_read: true,
                created_at: new Date('2025-11-26T15:00:00')
            },
            {
                user_id: 1,
                type: 'ai_recommendation',
                title: 'AI Travel Suggestion',
                message: 'Based on your search history, we found great deals on flights to Miami.',
                is_read: false,
                created_at: new Date('2025-11-27T09:00:00')
            }
        ]);

        console.log('✅ Notifications collection created with 3 dummy notifications');

        // ========================================================================
        // SUMMARY
        // ========================================================================
        console.log('\n' + '='.repeat(70));
        console.log('🎉 MongoDB Initialization Complete!');
        console.log('='.repeat(70));

        const collections = await db.listCollections().toArray();
        console.log('\n📚 Collections Created:');
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`   ✅ ${col.name} (${count} documents)`);
        }

        console.log('\n✅ All collections ready with:');
        console.log('   - Schema validation');
        console.log('   - Optimized indexes');
        console.log('   - Dummy data based on SQL database');

    } catch (error) {
        console.error('❌ Error initializing MongoDB:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('\n👋 MongoDB connection closed');
    }
}

// Run the initialization
if (require.main === module) {
    initializeMongoDB()
        .then(() => {
            console.log('\n✨ Script completed successfully!');
            process.exit(0);
        })
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { initializeMongoDB };
