const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'root123',
    database: 'kayak_db'
};

// Review templates
const flightReviews = [
    "Great flight! Very comfortable and on time.",
    "Excellent service, friendly crew.",
    "Smooth flight, would book again.",
    "Good experience overall, seats were comfortable.",
    "Amazing journey, highly recommend!",
    "Professional staff, clean aircraft.",
    "Perfect flight, no complaints.",
    "Very satisfied with the service.",
    "Comfortable seats and good food.",
    "Wonderful experience from start to finish.",
    "Flight was delayed but service was great.",
    "Average experience, nothing special.",
    "Could be better, seats were cramped.",
    "Okay flight, expected more for the price.",
    "Not the best experience, but acceptable."
];

const hotelReviews = [
    "Beautiful hotel with amazing amenities!",
    "Great location, friendly staff, clean rooms.",
    "Excellent stay, would definitely come back!",
    "Very comfortable beds and good breakfast.",
    "Outstanding service and beautiful property.",
    "Perfect location for sightseeing.",
    "Clean, modern, and well-maintained.",
    "Lovely hotel, great value for money.",
    "Staff went above and beyond!",
    "Fantastic experience, highly recommend!",
    "Room was smaller than expected.",
    "Good hotel but a bit pricey.",
    "Average stay, nothing exceptional.",
    "Could use some updates but overall decent.",
    "Location was good but service was slow."
];

const carReviews = [
    "Great car, clean and fuel efficient!",
    "Perfect rental experience, no issues.",
    "Car was in excellent condition.",
    "Smooth pickup and return process.",
    "Very happy with the vehicle quality.",
    "Comfortable car for long drives.",
    "Easy rental process, great car!",
    "Well-maintained vehicle, would rent again.",
    "Excellent service and clean car.",
    "Perfect for our road trip!",
    "Car had some minor scratches.",
    "Acceptable condition, nothing special.",
    "Average car, met basic needs.",
    "Could have been cleaner.",
    "Okay rental, expected better condition."
];

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomRating(avgRating = 4.2) {
    // Generate ratings weighted towards higher scores
    const rand = Math.random();
    if (rand < 0.50) return 5; // 50% are 5 stars
    if (rand < 0.75) return 4; // 25% are 4 stars
    if (rand < 0.90) return 3; // 15% are 3 stars
    if (rand < 0.97) return 2; // 7% are 2 stars
    return 1; // 3% are 1 star
}

function getRandomDate(daysBack = 25) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function main() {
    let connection;
    
    try {
        console.log('🔌 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database\n');

        // Get all confirmed bookings
        const [bookings] = await connection.execute(
            `SELECT id, user_id, booking_type, booking_details, booking_date 
             FROM bookings 
             WHERE status = 'confirmed'
             ORDER BY id DESC`
        );

        console.log(`📊 Found ${bookings.length} confirmed bookings\n`);

        let flightReviewCount = 0;
        let hotelReviewCount = 0;
        let carReviewCount = 0;

        console.log('⭐ Creating reviews for bookings...');

        for (let i = 0; i < bookings.length; i++) {
            const booking = bookings[i];
            
            // 70% of bookings get reviews (realistic conversion rate)
            if (Math.random() > 0.70) continue;

            const bookingDetails = typeof booking.booking_details === 'string' 
                ? JSON.parse(booking.booking_details) 
                : booking.booking_details;
            const rating = getRandomRating();
            let comment;
            let entityId;
            let entityType;

            if (booking.booking_type === 'flight') {
                entityId = bookingDetails.flight_id;
                entityType = 'flight';
                comment = getRandomElement(flightReviews);
                flightReviewCount++;
            } else if (booking.booking_type === 'hotel') {
                entityId = bookingDetails.hotel_id;
                entityType = 'hotel';
                comment = getRandomElement(hotelReviews);
                hotelReviewCount++;
            } else if (booking.booking_type === 'car') {
                entityId = bookingDetails.car_id;
                entityType = 'car';
                comment = getRandomElement(carReviews);
                carReviewCount++;
            }

            const reviewDate = getRandomDate(20);

            // Insert review
            await connection.execute(
                `INSERT INTO reviews (user_id, entity_type, entity_id, rating, comment, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [booking.user_id, entityType, entityId, rating, comment, reviewDate]
            );

            if ((i + 1) % 20 === 0) {
                console.log(`   Created reviews for ${i + 1} bookings...`);
            }
        }

        console.log(`\n✅ Review generation complete!\n`);
        console.log('📊 Summary:');
        console.log(`   ✈️  Flight Reviews: ${flightReviewCount}`);
        console.log(`   🏨 Hotel Reviews: ${hotelReviewCount}`);
        console.log(`   🚗 Car Reviews: ${carReviewCount}`);
        console.log(`   📝 Total Reviews: ${flightReviewCount + hotelReviewCount + carReviewCount}\n`);

        // Get average rating
        const [avgResult] = await connection.execute(
            `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews`
        );
        
        const avgRating = avgResult[0].avg_rating || 0;
        const totalReviews = avgResult[0].total_reviews || 0;
        
        console.log(`   ⭐ Average Rating: ${parseFloat(avgRating).toFixed(2)}/5.0`);
        console.log(`   📊 Total Reviews in Database: ${totalReviews}\n`);
        
        console.log('🎉 Review generation complete!');
        console.log('📊 Refresh your admin dashboard to see the updated reviews!');
        console.log('🌐 http://localhost:8088/admin/analytics\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

main();
