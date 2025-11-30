/**
 * Kayak MongoDB Initialization Script
 * Purpose: Updates the Validation Rules (Schema) for the 'images' collection
 * to support the 'cars' feature and correct data types.
 * * Usage:
 * node database-new/init-mongodb-final.js
 */

// --- 1. Imports and Configuration ---
// Using specific paths as per your project structure
const { MongoClient } = require('../backend/node_modules/mongodb');
require('../backend/node_modules/dotenv/lib/main').config({ path: '../backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'kayak_db';

// --- 2. Main Execution Function ---
async function updateImageSchema() {
    console.log("------------------------------------------------");
    console.log("🚀 Starting Schema Update...");
    console.log(`📡 Connecting to DB: ${DB_NAME}`);
    
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);

        // --- 3. The Update Command ---
        const command = {
            collMod: "images", // Target the 'images' collection
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    // UPDATED: 'base_64' is now required (was base64_data)
                    required: ["entity_type", "entity_id", "image_type", "mime_type", "base64_data", "created_at"],
                    properties: {
                        entity_type: {
                            enum: ["user", "hotel", "car"],
                                description: "Type of entity: user, hotel, or car"
                            },
                        entity_id: {
                            bsonType: ["int"],
                            description: "ID of the entity (User ID, Hotel ID, or Car ID)"
                        },
                        mime_type: {
                            enum: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                            description: 'Image MIME type'
                        },
                        base64_data: {
                            bsonType: "string",
                            description: "The base64 encoded image string"
                        },
                        created_at: {
                            bsonType: 'date'
                        }
                    }
                }
            },
        };

        // --- 4. Execute Command ---
        console.log("⚙️  Running collMod command to update 'images' validator...");
        const result = await db.command(command);

        console.log("DB Response:", result);

    } catch (error) {
        console.error("❌ ERROR: Failed to update schema.");
        console.error("Details:", error);
    } finally {
        // --- 5. Cleanup ---
        await client.close();
        console.log("👋 Connection closed.");
        console.log("------------------------------------------------");
    }
}

// Run the script
updateImageSchema();