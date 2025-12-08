require('dotenv').config();
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');
const { faker } = require('@faker-js/faker');
const fs = require('fs');

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
};

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'kayak_db';

const TARGET_COUNT = 50000;
const BATCH_SIZE = 1000;

const REVIEW_TEMPLATES = {
  positive: [
    'Excellent experience! Highly recommend.',
    'Great service and very comfortable.',
    'Exceeded my expectations. Will book again!',
    'Perfect for my needs. Very satisfied.',
    'Outstanding quality and value.',
    'Clean, comfortable, and convenient.',
    'Fantastic experience from start to finish!',
    'Absolutely loved it. Five stars!',
    'Best experience I\'ve had. Highly recommend!',
    'Professional service and great amenities.'
  ],
  neutral: [
    'Good overall, a few minor issues.',
    'Decent experience, nothing special.',
    'Average, met basic expectations.',
    'OK for the price.',
    'Acceptable but could be better.',
    'Standard experience, no complaints.',
    'Fair value for money.',
    'Adequate but not exceptional.'
  ],
  negative: [
    'Disappointing experience. Not worth it.',
    'Had some issues that were not resolved.',
    'Below expectations unfortunately.',
    'Would not recommend based on my experience.',
    'Several problems during my stay/rental.',
    'Not satisfied with the service.',
    'Expected better for the price.',
    'Had issues that made the experience unpleasant.'
  ]
};

function generateReview(booking, user) {
  const bookingDetails = typeof booking.booking_details === 'string' 
    ? JSON.parse(booking.booking_details) 
    : booking.booking_details;
  
  // Only create reviews for completed bookings
  if (booking.status !== 'completed') return null;
  
  const rating = faker.helpers.weightedArrayElement([
    { weight: 50, value: 5 },
    { weight: 30, value: 4 },
    { weight: 12, value: 3 },
    { weight: 5, value: 2 },
    { weight: 3, value: 1 }
  ]);
  
  // Select review template based on rating
  let template;
  if (rating >= 4) {
    template = faker.helpers.arrayElement(REVIEW_TEMPLATES.positive);
  } else if (rating === 3) {
    template = faker.helpers.arrayElement(REVIEW_TEMPLATES.neutral);
  } else {
    template = faker.helpers.arrayElement(REVIEW_TEMPLATES.negative);
  }
  
  // Determine entityId and entityType based on booking type
  let entityId, entityType;
  
  if (booking.booking_type === 'hotel') {
    entityId = bookingDetails.hotel_id;
    entityType = 'hotel';
  } else if (booking.booking_type === 'flight') {
    entityId = bookingDetails.flight_id;
    entityType = 'flight';
  } else if (booking.booking_type === 'car') {
    entityId = bookingDetails.car_id;
    entityType = 'car';
  }
  
  // Match the codebase schema from mongodb-schemas.js
  const review = {
    entityType: entityType,                   // 'hotel', 'flight', 'car'
    entityId: parseInt(entityId),             // MySQL ID reference
    userId: parseInt(booking.user_id),        // MySQL User ID
    userName: `${user.first_name} ${user.last_name}`,
    userEmail: user.email,
    rating: parseFloat(rating),               // 1-5
    title: faker.lorem.sentence(3),           // Short title
    reviewText: template + ' ' + faker.lorem.sentence(),  // Review content
    helpfulCount: faker.number.int({ min: 0, max: 50 }),
    verified: true,                           // Verified booking
    createdAt: new Date(booking.booking_date),
    updatedAt: new Date(booking.booking_date)
  };
  
  // Add optional booking metadata
  review.bookingId = booking.id;
  review.bookingReference = booking.booking_reference;
  
  // Add type-specific enrichment fields
  if (booking.booking_type === 'hotel') {
    review.hotelName = bookingDetails.hotel_name;
    review.city = bookingDetails.city;
    review.state = bookingDetails.state;
  } else if (booking.booking_type === 'flight') {
    review.flightNumber = bookingDetails.flight_number;
    review.airline = bookingDetails.airline;
    review.route = `${bookingDetails.departure_airport} → ${bookingDetails.arrival_airport}`;
  } else if (booking.booking_type === 'car') {
    review.carType = bookingDetails.car_type;
    review.company = bookingDetails.company;
    review.model = bookingDetails.model;
    review.location = bookingDetails.location_city;
  }
  
  // Add helpful votes
  review.helpful_votes = faker.number.int({ min: 0, max: 50 });
  review.verified_booking = true;
  
  return review;
}

async function seedReviews() {
  console.log('='.repeat(80));
  console.log('SEEDING REVIEWS TO MONGODB');
  console.log('='.repeat(80));
  console.log();

  let mysqlConnection;
  let mongoClient;
  
  try {
    // Connect to MySQL
    console.log('📊 Connecting to MySQL...');
    mysqlConnection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('   ✅ MySQL connected');
    
    // Connect to MongoDB
    console.log('🍃 Connecting to MongoDB...');
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(MONGODB_DATABASE);
    const reviewsCollection = db.collection('reviews');
    console.log('   ✅ MongoDB connected');
    console.log();

    // Get current review count
    const currentCount = await reviewsCollection.countDocuments();
    console.log(`📊 Current review count: ${currentCount.toLocaleString()}`);
    console.log(`🎯 Target: Add ${TARGET_COUNT.toLocaleString()} new reviews`);
    console.log();

    // ========================================
    // Get completed bookings with user info
    // ========================================
    console.log('📂 Loading completed bookings with user information...');
    
    const [completedBookings] = await mysqlConnection.query(`
      SELECT 
        b.id, b.user_id, b.booking_reference, b.booking_type, 
        b.booking_details, b.status, b.booking_date,
        u.first_name, u.last_name, u.email
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.status = 'completed'
      ORDER BY RAND()
      LIMIT ?
    `, [TARGET_COUNT]);
    
    console.log(`   ✅ Found ${completedBookings.length.toLocaleString()} completed bookings`);
    
    if (completedBookings.length === 0) {
      throw new Error('No completed bookings found! Reviews can only be created for completed bookings.');
    }
    
    if (completedBookings.length < TARGET_COUNT) {
      console.log(`   ⚠️  WARNING: Only ${completedBookings.length} completed bookings available.`);
      console.log(`   Will create ${completedBookings.length} reviews instead of ${TARGET_COUNT}.`);
    }
    console.log();

    // ========================================
    // Generate and insert reviews
    // ========================================
    const actualTarget = Math.min(TARGET_COUNT, completedBookings.length);
    const batches = Math.ceil(actualTarget / BATCH_SIZE);
    let totalInserted = 0;
    const insertedIds = [];
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = Date.now();
      const reviews = [];
      const remainingCount = actualTarget - totalInserted;
      const currentBatchSize = Math.min(BATCH_SIZE, remainingCount);
      
      // Generate reviews for this batch
      for (let i = 0; i < currentBatchSize; i++) {
        const bookingIndex = totalInserted + i;
        if (bookingIndex >= completedBookings.length) break;
        
        const booking = completedBookings[bookingIndex];
        const user = {
          first_name: booking.first_name,
          last_name: booking.last_name,
          email: booking.email
        };
        
        const review = generateReview(booking, user);
        if (review) {
          reviews.push(review);
        }
      }
      
      if (reviews.length === 0) continue;
      
      // Batch insert to MongoDB
      const result = await reviewsCollection.insertMany(reviews);
      insertedIds.push(...Object.values(result.insertedIds).map(id => id.toString()));
      
      totalInserted += reviews.length;
      const batchTime = Date.now() - batchStart;
      const progress = ((batch + 1) / batches * 100).toFixed(1);
      
      console.log(`✅ Batch ${batch + 1}/${batches} (${progress}%) - ${reviews.length} reviews inserted in ${batchTime}ms`);
    }
    
    console.log();
    console.log(`✅ Successfully inserted ${totalInserted.toLocaleString()} reviews`);
    console.log();

    // ========================================
    // Verification
    // ========================================
    console.log('🔍 Verification:');
    const newCount = await reviewsCollection.countDocuments();
    console.log(`   Total reviews in MongoDB: ${newCount.toLocaleString()}`);
    
    // Booking type distribution
    const typeDist = await reviewsCollection.aggregate([
      { $group: { _id: '$booking_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('\n   Review type distribution:');
    typeDist.forEach(row => {
      const percentage = (row.count / newCount * 100).toFixed(1);
      console.log(`      ${row._id.padEnd(15)}: ${row.count.toLocaleString().padStart(8)} (${percentage}%)`);
    });
    
    // Rating distribution
    const ratingDist = await reviewsCollection.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]).toArray();
    
    console.log('\n   Rating distribution:');
    ratingDist.forEach(row => {
      const percentage = (row.count / newCount * 100).toFixed(1);
      console.log(`      ${row._id} stars: ${row.count.toLocaleString().padStart(8)} (${percentage}%)`);
    });
    
    // Average ratings by type
    const avgRatings = await reviewsCollection.aggregate([
      { 
        $group: { 
          _id: '$booking_type', 
          avg_rating: { $avg: '$rating' },
          count: { $sum: 1 }
        } 
      }
    ]).toArray();
    
    console.log('\n   Average ratings by type:');
    avgRatings.forEach(row => {
      console.log(`      ${row._id.padEnd(15)}: ${row.avg_rating.toFixed(2)} (${row.count} reviews)`);
    });
    
    // Sample reviews
    const samples = await reviewsCollection.find()
      .sort({ created_at: -1 })
      .limit(5)
      .toArray();
    
    console.log('\n   Sample reviews (most recent):');
    samples.forEach(review => {
      const type = review.booking_type;
      const entity = type === 'hotel' ? review.hotel_name : 
                     type === 'flight' ? review.flight_number :
                     `${review.company} ${review.model}`;
      console.log(`      ${review.rating}★ - ${review.user_name}: "${review.review_text.substring(0, 60)}..." (${type}: ${entity})`);
    });
    
    // Save review stats
    const statsData = {
      total_inserted: totalInserted,
      total_in_db: newCount,
      type_distribution: typeDist,
      rating_distribution: ratingDist,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('review-stats.json', JSON.stringify(statsData, null, 2));
    console.log('\n💾 Review statistics saved to review-stats.json');
    
    console.log();
    console.log('='.repeat(80));
    console.log('✅ REVIEW SEEDING COMPLETE');
    console.log('='.repeat(80));
    console.log();
    
  } catch (error) {
    console.error('❌ Error seeding reviews:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (mysqlConnection) await mysqlConnection.end();
    if (mongoClient) await mongoClient.close();
  }
}

seedReviews();
