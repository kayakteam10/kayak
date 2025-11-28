/**
 * MongoDB Collections Initialization Script
 * 
 * This script creates all MongoDB collections with proper schemas, 
 * validation rules, and indexes for the Kayak application.
 * 
 * Usage:
 *   node database/init-mongodb-collections.js
 * 
 * Make sure MONGODB_URI is set in your .env file
 */

const { MongoClient } = require('../backend/node_modules/mongodb');
require('../backend/node_modules/dotenv/lib/main').config({ path: '../backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'kayak_db';

async function initializeCollections() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db(DB_NAME);

        // ========================================================================
        // 1. REVIEWS COLLECTION
        // ========================================================================
        console.log('\n📝 Creating Reviews collection...');

        try {
            await db.createCollection('reviews', {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['review_id', 'user_id', 'entity_type', 'entity_id', 'rating', 'review_text', 'created_at'],
                        properties: {
                            review_id: { bsonType: 'string' },
                            user_id: { bsonType: 'int' },
                            user_name: { bsonType: 'string' },
                            entity_type: { enum: ['flight', 'hotel', 'car'] },
                            entity_id: { bsonType: 'int' },
                            entity_name: { bsonType: 'string' },
                            rating: { bsonType: 'double', minimum: 1, maximum: 5 },
                            ratings_breakdown: {
                                bsonType: 'object',
                                properties: {
                                    cleanliness: { bsonType: 'int', minimum: 1, maximum: 5 },
                                    service: { bsonType: 'int', minimum: 1, maximum: 5 },
                                    value: { bsonType: 'int', minimum: 1, maximum: 5 },
                                    comfort: { bsonType: 'int', minimum: 1, maximum: 5 }
                                }
                            },
                            title: { bsonType: 'string' },
                            review_text: { bsonType: 'string' },
                            pros: { bsonType: 'array', items: { bsonType: 'string' } },
                            cons: { bsonType: 'array', items: { bsonType: 'string' } },
                            travel_date: { bsonType: 'date' },
                            review_date: { bsonType: 'date' },
                            verified_booking: { bsonType: 'bool' },
                            helpful_count: { bsonType: 'int', minimum: 0 },
                            images: { bsonType: 'array', items: { bsonType: 'string' } },
                            response: {
                                bsonType: 'object',
                                properties: {
                                    text: { bsonType: 'string' },
                                    response_date: { bsonType: 'date' },
                                    responder_name: { bsonType: 'string' }
                                }
                            },
                            status: { enum: ['published', 'pending', 'hidden'] },
                            created_at: { bsonType: 'date' },
                            updated_at: { bsonType: 'date' }
                        }
                    }
                }
            });

            // Create indexes for reviews
            await db.collection('reviews').createIndexes([
                { key: { entity_type: 1, entity_id: 1 } },
                { key: { user_id: 1 } },
                { key: { rating: -1 } },
                { key: { created_at: -1 } },
                { key: { status: 1 } }
            ]);

            console.log('✅ Reviews collection created with indexes');
        } catch (err) {
            if (err.code === 48) {
                console.log('ℹ️  Reviews collection already exists');
            } else {
                throw err;
            }
        }

        // ========================================================================
        // 2. IMAGES COLLECTION
        // ========================================================================
        console.log('\n🖼️  Creating Images collection...');

        try {
            await db.createCollection('images', {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['image_id', 'entity_type', 'uploaded_at'],
                        properties: {
                            image_id: { bsonType: 'string' },
                            entity_type: { enum: ['hotel', 'car', 'user_profile', 'review'] },
                            entity_id: { bsonType: 'int' },
                            user_id: { bsonType: 'int' },

                            // Base64 data storage (primary method)
                            file_data: {
                                bsonType: 'string',
                                description: 'Base64 encoded image data with data URI scheme (e.g., data:image/jpeg;base64,...)'
                            },
                            thumbnail_data: {
                                bsonType: 'string',
                                description: 'Base64 encoded thumbnail image (optional, for faster loading)'
                            },

                            // File URLs (optional, for future CDN migration)
                            file_url: { bsonType: ['string', 'null'] },
                            thumbnail_url: { bsonType: ['string', 'null'] },

                            // Metadata
                            file_name: { bsonType: 'string' },
                            file_size: {
                                bsonType: 'int',
                                description: 'Size in bytes (recommend max 5MB for profiles, 2MB for others)'
                            },
                            file_format: {
                                enum: ['JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'],
                                description: 'Image format'
                            },
                            dimensions: {
                                bsonType: 'object',
                                properties: {
                                    width: { bsonType: 'int' },
                                    height: { bsonType: 'int' }
                                }
                            },
                            metadata: { bsonType: 'object' },
                            alt_text: { bsonType: 'string' },
                            tags: { bsonType: 'array', items: { bsonType: 'string' } },
                            is_primary: { bsonType: 'bool' },
                            display_order: { bsonType: 'int' },
                            status: { enum: ['active', 'pending', 'deleted'] },
                            uploaded_at: { bsonType: 'date' },
                            updated_at: { bsonType: 'date' }
                        }
                    }
                }
            });

            // Create indexes for images
            await db.collection('images').createIndexes([
                { key: { entity_type: 1, entity_id: 1 } },
                { key: { user_id: 1 } },
                { key: { status: 1 } },
                { key: { uploaded_at: -1 } },
                { key: { image_id: 1 }, unique: true }
            ]);

            console.log('✅ Images collection created with indexes');
        } catch (err) {
            if (err.code === 48) {
                console.log('ℹ️  Images collection already exists');
            } else {
                throw err;
            }
        }

        // ========================================================================
        // 3. USER PREFERENCES COLLECTION
        // ========================================================================
        console.log('\n⚙️  Creating User Preferences collection...');

        try {
            await db.createCollection('user_preferences', {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['user_id'],
                        properties: {
                            user_id: { bsonType: 'int' },
                            travel_preferences: {
                                bsonType: 'object',
                                properties: {
                                    seat_preference: { enum: ['window', 'aisle', 'middle', 'no_preference'] },
                                    meal_preference: { bsonType: 'string' },
                                    class_preference: { enum: ['economy', 'business', 'first'] },
                                    airline_blacklist: { bsonType: 'array', items: { bsonType: 'string' } },
                                    airline_favorites: { bsonType: 'array', items: { bsonType: 'string' } },
                                    max_layovers: { bsonType: 'int' }
                                }
                            },
                            notification_settings: {
                                bsonType: 'object',
                                properties: {
                                    email_notifications: { bsonType: 'bool' },
                                    sms_notifications: { bsonType: 'bool' },
                                    push_notifications: { bsonType: 'bool' },
                                    deal_alerts: { bsonType: 'bool' },
                                    booking_reminders: { bsonType: 'bool' }
                                }
                            },
                            saved_searches: { bsonType: 'array' },
                            favorite_destinations: { bsonType: 'array', items: { bsonType: 'string' } },
                            loyalty_programs: { bsonType: 'array' },
                            accessibility_needs: { bsonType: 'object' },
                            created_at: { bsonType: 'date' },
                            updated_at: { bsonType: 'date' }
                        }
                    }
                }
            });

            // Create indexes for user_preferences
            await db.collection('user_preferences').createIndexes([
                { key: { user_id: 1 }, unique: true },
                { key: { updated_at: -1 } }
            ]);

            console.log('✅ User Preferences collection created with indexes');
        } catch (err) {
            if (err.code === 48) {
                console.log('ℹ️  User Preferences collection already exists');
            } else {
                throw err;
            }
        }

        // ========================================================================
        // 4. ACTIVITY LOGS COLLECTION
        // ========================================================================
        console.log('\n📊 Creating Activity Logs collection...');

        try {
            await db.createCollection('activity_logs', {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['log_id', 'event_type', 'timestamp'],
                        properties: {
                            log_id: { bsonType: 'string' },
                            user_id: { bsonType: 'int' },
                            session_id: { bsonType: 'string' },
                            event_type: { bsonType: 'string' },
                            event_category: { bsonType: 'string' },
                            event_data: { bsonType: 'object' },
                            ip_address: { bsonType: 'string' },
                            user_agent: { bsonType: 'string' },
                            device_type: { enum: ['desktop', 'mobile', 'tablet'] },
                            browser: { bsonType: 'string' },
                            location: { bsonType: 'object' },
                            duration_ms: { bsonType: 'int' },
                            timestamp: { bsonType: 'date' },
                            created_at: { bsonType: 'date' }
                        }
                    }
                }
            });

            // Create indexes for activity_logs (time-series optimized)
            await db.collection('activity_logs').createIndexes([
                { key: { timestamp: -1 } },
                { key: { user_id: 1, timestamp: -1 } },
                { key: { event_type: 1, timestamp: -1 } },
                { key: { created_at: 1 }, expireAfterSeconds: 7776000 } // 90 days TTL
            ]);

            console.log('✅ Activity Logs collection created with indexes (90 days TTL)');
        } catch (err) {
            if (err.code === 48) {
                console.log('ℹ️  Activity Logs collection already exists');
            } else {
                throw err;
            }
        }

        // ========================================================================
        // 5. SEARCH HISTORY COLLECTION
        // ========================================================================
        console.log('\n🔍 Creating Search History collection...');

        try {
            await db.createCollection('search_history', {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['user_id', 'search_type', 'search_params', 'search_timestamp'],
                        properties: {
                            user_id: { bsonType: 'int' },
                            search_type: { enum: ['flight', 'hotel', 'car'] },
                            search_params: { bsonType: 'object' },
                            results_count: { bsonType: 'int' },
                            filters_applied: { bsonType: 'object' },
                            selected_result: { bsonType: 'object' },
                            converted_to_booking: { bsonType: 'bool' },
                            booking_id: { bsonType: 'string' },
                            search_timestamp: { bsonType: 'date' },
                            created_at: { bsonType: 'date' }
                        }
                    }
                }
            });

            // Create indexes for search_history
            await db.collection('search_history').createIndexes([
                { key: { user_id: 1, search_timestamp: -1 } },
                { key: { search_type: 1, search_timestamp: -1 } },
                { key: { converted_to_booking: 1 } }
            ]);

            console.log('✅ Search History collection created with indexes');
        } catch (err) {
            if (err.code === 48) {
                console.log('ℹ️  Search History collection already exists');
            } else {
                throw err;
            }
        }

        // ========================================================================
        // 6. NOTIFICATIONS COLLECTION
        // ========================================================================
        console.log('\n🔔 Creating Notifications collection...');

        try {
            await db.createCollection('notifications', {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['notification_id', 'user_id', 'notification_type', 'title', 'message'],
                        properties: {
                            notification_id: { bsonType: 'string' },
                            user_id: { bsonType: 'int' },
                            notification_type: { bsonType: 'string' },
                            title: { bsonType: 'string' },
                            message: { bsonType: 'string' },
                            data: { bsonType: 'object' },
                            priority: { enum: ['high', 'medium', 'low'] },
                            channels: { bsonType: 'array', items: { bsonType: 'string' } },
                            status: { enum: ['pending', 'sent', 'read', 'failed'] },
                            read_at: { bsonType: 'date' },
                            sent_at: { bsonType: 'date' },
                            expires_at: { bsonType: 'date' },
                            created_at: { bsonType: 'date' }
                        }
                    }
                }
            });

            // Create indexes for notifications
            await db.collection('notifications').createIndexes([
                { key: { user_id: 1, created_at: -1 } },
                { key: { status: 1 } },
                { key: { expires_at: 1 }, expireAfterSeconds: 0 } // TTL index
            ]);

            console.log('✅ Notifications collection created with indexes (TTL enabled)');
        } catch (err) {
            if (err.code === 48) {
                console.log('ℹ️  Notifications collection already exists');
            } else {
                throw err;
            }
        }

        // ========================================================================
        // SUMMARY
        // ========================================================================
        console.log('\n' + '='.repeat(70));
        console.log('🎉 MongoDB Collections Initialization Complete!');
        console.log('='.repeat(70));

        const collections = await db.listCollections().toArray();
        console.log('\n📚 Available Collections:');
        collections.forEach(col => {
            console.log(`   - ${col.name}`);
        });

        console.log('\n✅ All collections are ready with:');
        console.log('   - Schema validation');
        console.log('   - Optimized indexes');
        console.log('   - TTL indexes where applicable');

    } catch (error) {
        console.error('❌ Error initializing MongoDB collections:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('\n👋 MongoDB connection closed');
    }
}

// Run the initialization
if (require.main === module) {
    initializeCollections()
        .then(() => {
            console.log('\n✨ Script completed successfully!');
            process.exit(0);
        })
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { initializeCollections };
