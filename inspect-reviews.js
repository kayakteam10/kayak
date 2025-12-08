const { MongoClient } = require('mongodb');

async function checkReviews() {
    // Use the env var if available, otherwise try the service name
    const uri = process.env.MONGO_URL || 'mongodb://kayak-mongodb:27017';
    console.log(`Connecting to: ${uri}`);
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('kayak_db');
        const reviews = await db.collection('reviews').find({}).toArray();

        console.log(`Found ${reviews.length} reviews.`);
        reviews.forEach((r, i) => {
            console.log(`Review ${i}:`, JSON.stringify(r, null, 2));
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

checkReviews();
