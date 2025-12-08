const { MongoClient } = require('mongodb');

async function debugMongo() {
    // Connect to MongoDB (using service name 'localhost' translated from host port)
    // Running from host machine? Then localhost:27017 (mapped port).
    const uri = 'mongodb://localhost:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();

        // 1. Inspect Reviews
        console.log('--- Reviews in kayak_db ---');
        const db = client.db('kayak_db');
        const reviews = await db.collection('reviews').find({}).limit(5).toArray();
        if (reviews.length === 0) {
            console.log('No reviews found in kayak_db. Checking kayak_reviews...');
            const db2 = client.db('kayak_reviews');
            const reviews2 = await db2.collection('reviews').find({}).limit(5).toArray();
            console.log(`Found ${reviews2.length} reviews in kayak_reviews.`);
            reviews2.forEach((r, i) => console.log(`Review ${i}:`, JSON.stringify(r, null, 2)));
        } else {
            console.log(`Found ${reviews.length} reviews in kayak_db.`);
            reviews.forEach((r, i) => console.log(`Review ${i}:`, JSON.stringify(r, null, 2)));
        }

        // 2. Inspect Images
        console.log('\n--- Images in kayak_db ---');
        const images = await db.collection('images').find({}).limit(5).sort({ _id: -1 }).toArray();
        console.log(`Found ${images.length} images.`);
        images.forEach((img, i) => {
            // Truncate data for log
            const displayImg = { ...img };
            if (displayImg.data && displayImg.data.length > 50) {
                displayImg.data = displayImg.data.substring(0, 50) + '...';
            }
            console.log(`Image ${i}:`, displayImg);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

debugMongo();
