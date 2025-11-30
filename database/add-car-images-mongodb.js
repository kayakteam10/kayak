/**
 * Kayak MongoDB Car Images Insertion Script
 * Purpose: Add car image data to the 'images' collection
 * 
 * Usage:
 * node database/add-car-images-mongodb.js
 */

// --- 1. Imports and Configuration ---
const { MongoClient } = require('../backend/node_modules/mongodb');
require('../backend/node_modules/dotenv/lib/main').config({ path: '../backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'kayak_db';

// --- 2. Car Image Data ---
const carImages = [
    {
        entity_type: "car",
        entity_id: 1, // Toyota Camry
        image_type: "primary",
        mime_type: "image/jpeg",
        base64_data: "dUMMY_BASE64_STRING_REPLACE_WITH_ACTUAL_IMAGE_DATA",
        created_at: new Date()
    },
    {
        entity_type: "car",
        entity_id: 2, // Ford Explorer
        image_type: "primary",
        mime_type: "image/jpeg",
        base64_data: "DUMMY_BASE64_STRING_REPLACE_WITH_ACTUAL_IMAGE_DATA",
        created_at: new Date()
    },
    {
        entity_type: "car",
        entity_id: 3, // Honda Civic
        image_type: "primary",
        mime_type: "image/jpeg",
        base64_data: "DUMMY_BASE64_STRING_REPLACE_WITH_ACTUAL_IMAGE_DATA",
        created_at: new Date()
    },
    {
        entity_type: "car",
        entity_id: 4, // BMW 3 Series
        image_type: "primary",
        mime_type: "image/jpeg",
        base64_data: "DUMMY_BASE64_STRING_REPLACE_WITH_ACTUAL_IMAGE_DATA",
        created_at: new Date()
    },
    {
        entity_type: "car",
        entity_id: 5, // Ford Mustang
        image_type: "primary",
        mime_type: "image/jpeg",
        base64_data: "DUMMY_BASE64_STRING_REPLACE_WITH_ACTUAL_IMAGE_DATA",
        created_at: new Date()
    },
    {
        entity_type: "car",
        entity_id: 6, // Chrysler Pacifica
        image_type: "primary",
        mime_type: "image/jpeg",
        base64_data: "DUMMY_BASE64_STRING_REPLACE_WITH_ACTUAL_IMAGE_DATA",
        created_at: new Date()
    },
    {
        entity_type: "car",
        entity_id: 7, // Ford F-150
        image_type: "primary",
        mime_type: "image/jpeg",
        base64_data: "DUMMY_BASE64_STRING_REPLACE_WITH_ACTUAL_IMAGE_DATA",
        created_at: new Date()
    }
];

// --- 3. Main Execution Function ---
async function addCarImages() {
    console.log("------------------------------------------------");
    console.log("🚗 Starting Car Images Insertion...");
    console.log(`📡 Connecting to DB: ${DB_NAME}`);
    
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log("✅ Connected to MongoDB");
        
        const db = client.db(DB_NAME);
        const imagesCollection = db.collection('images');

        // --- 4. Delete existing car images (optional, for clean slate) ---
        console.log("🗑️  Removing existing car images...");
        const deleteResult = await imagesCollection.deleteMany({ entity_type: "car" });
        console.log(`   Deleted ${deleteResult.deletedCount} existing car image(s)`);

        // --- 5. Insert new car images ---
        console.log("📸 Inserting new car images...");
        const insertResult = await imagesCollection.insertMany(carImages);
        console.log(`✅ Successfully inserted ${insertResult.insertedCount} car images`);
        
        // --- 6. Verify insertion ---
        const count = await imagesCollection.countDocuments({ entity_type: "car" });
        console.log(`📊 Total car images in collection: ${count}`);

    } catch (error) {
        console.error("❌ ERROR: Failed to add car images.");
        console.error("Details:", error);
    } finally {
        // --- 7. Cleanup ---
        await client.close();
        console.log("👋 Connection closed.");
        console.log("------------------------------------------------");
    }
}

// Run the script
addCarImages();
