require('dotenv').config();
const mysql = require('mysql2/promise');
const { faker } = require('@faker-js/faker');
const fs = require('fs');

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const TARGET_COUNT = 10000;
const BATCH_SIZE = 1000;

// City distribution: 80% SF + NYC, 20% others
const CITY_DISTRIBUTION = [
  { city: 'San Francisco', state: 'CA', weight: 40 },
  { city: 'New York', state: 'NY', weight: 40 },
  { city: 'Los Angeles', state: 'CA', weight: 5 },
  { city: 'Chicago', state: 'IL', weight: 5 },
  { city: 'Houston', state: 'TX', weight: 3 },
  { city: 'Phoenix', state: 'AZ', weight: 2 },
  { city: 'Philadelphia', state: 'PA', weight: 2 },
  { city: 'Miami', state: 'FL', weight: 2 },
  { city: 'Seattle', state: 'WA', weight: 1 }
];

const HOTEL_CHAINS = [
  'Marriott', 'Hilton', 'Hyatt', 'InterContinental', 'Sheraton', 
  'Holiday Inn', 'Best Western', 'Radisson', 'Westin', 'Crowne Plaza',
  'Doubletree', 'Embassy Suites', 'Hampton Inn', 'Courtyard', 'Residence Inn'
];

const HOTEL_TYPES = [
  'Hotel', 'Inn', 'Suites', 'Resort', 'Lodge', 'Plaza', 'Grand Hotel'
];

const AMENITIES_POOL = [
  'Free WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 
  'Room Service', 'Concierge', 'Valet Parking', 'Business Center',
  'Airport Shuttle', 'Pet Friendly', 'Laundry Service', 'Meeting Rooms'
];

function getWeightedCity() {
  const totalWeight = CITY_DISTRIBUTION.reduce((sum, item) => sum + item.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  
  for (const item of CITY_DISTRIBUTION) {
    cumulative += item.weight;
    if (random <= cumulative) {
      return item;
    }
  }
  
  return CITY_DISTRIBUTION[0];
}

function generateHotel() {
  const cityInfo = getWeightedCity();
  const chain = faker.helpers.arrayElement(HOTEL_CHAINS);
  const type = faker.helpers.arrayElement(HOTEL_TYPES);
  const hotelName = faker.datatype.boolean() 
    ? `${chain} ${cityInfo.city} ${type}`
    : `The ${faker.location.streetName()} ${type}`;
  
  const starRating = faker.helpers.weightedArrayElement([
    { weight: 10, value: 5.0 },
    { weight: 25, value: 4.5 },
    { weight: 30, value: 4.0 },
    { weight: 20, value: 3.5 },
    { weight: 10, value: 3.0 },
    { weight: 5, value: 2.5 }
  ]);
  
  const totalRooms = faker.number.int({ min: 20, max: 500 });
  const occupancyRate = faker.number.float({ min: 0.5, max: 0.9, precision: 0.01 });
  const availableRooms = Math.floor(totalRooms * (1 - occupancyRate));
  
  // Select random amenities
  const numAmenities = faker.number.int({ min: 4, max: 10 });
  const amenities = faker.helpers.arrayElements(AMENITIES_POOL, numAmenities);
  
  const pricePerNight = faker.number.float({ 
    min: starRating >= 4.0 ? 150 : 80, 
    max: starRating >= 4.5 ? 450 : 250, 
    precision: 0.01 
  });
  
  return {
    hotel_name: hotelName,
    address: faker.location.streetAddress(),
    city: cityInfo.city,
    state: cityInfo.state,
    zip_code: faker.location.zipCode('#####'),
    star_rating: starRating,
    user_rating: faker.number.float({ min: 3.5, max: 5.0, precision: 0.01 }),
    amenities: JSON.stringify(amenities),
    description: faker.lorem.paragraph(),
    price_per_night: pricePerNight,
    available_rooms: availableRooms,
    total_rooms: totalRooms,
    free_cancellation: faker.datatype.boolean(0.7),
    free_breakfast: faker.datatype.boolean(0.4),
    discount_percentage: faker.helpers.weightedArrayElement([
      { weight: 60, value: 0 },
      { weight: 20, value: 10 },
      { weight: 10, value: 15 },
      { weight: 7, value: 20 },
      { weight: 3, value: 25 }
    ]),
    image_url: faker.image.urlLoremFlickr({ category: 'hotel' }),
    location: `${cityInfo.city}, ${cityInfo.state}`,
    review_count: faker.number.int({ min: 10, max: 500 })
  };
}

async function seedHotels() {
  console.log('='.repeat(80));
  console.log('SEEDING HOTELS');
  console.log('='.repeat(80));
  console.log();

  const connection = await mysql.createConnection(MYSQL_CONFIG);
  const insertedIds = [];
  
  try {
    // Get current count
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM hotels');
    const currentCount = countResult[0].count;
    console.log(`📊 Current hotel count: ${currentCount.toLocaleString()}`);
    console.log(`🎯 Target: Add ${TARGET_COUNT.toLocaleString()} new hotels`);
    console.log();

    const batches = Math.ceil(TARGET_COUNT / BATCH_SIZE);
    let totalInserted = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = Date.now();
      const hotels = [];
      const remainingCount = TARGET_COUNT - totalInserted;
      const currentBatchSize = Math.min(BATCH_SIZE, remainingCount);
      
      // Generate hotels for this batch
      for (let i = 0; i < currentBatchSize; i++) {
        hotels.push(generateHotel());
      }
      
      // Batch insert
      const values = hotels.map(hotel => [
        hotel.hotel_name,
        hotel.address,
        hotel.city,
        hotel.state,
        hotel.zip_code,
        hotel.star_rating,
        hotel.user_rating,
        hotel.amenities,
        hotel.description,
        hotel.price_per_night,
        hotel.available_rooms,
        hotel.total_rooms,
        hotel.free_cancellation,
        hotel.free_breakfast,
        hotel.discount_percentage,
        hotel.image_url,
        hotel.location,
        hotel.review_count
      ]);
      
      const sql = `
        INSERT INTO hotels (
          hotel_name, address, city, state, zip_code, star_rating, user_rating,
          amenities, description, price_per_night, available_rooms, total_rooms,
          free_cancellation, free_breakfast, discount_percentage, image_url, 
          location, review_count
        ) VALUES ?
      `;
      
      const [result] = await connection.query(sql, [values]);
      
      // Store inserted IDs
      const firstId = result.insertId;
      for (let i = 0; i < currentBatchSize; i++) {
        insertedIds.push(firstId + i);
      }
      
      totalInserted += currentBatchSize;
      const batchTime = Date.now() - batchStart;
      const progress = ((batch + 1) / batches * 100).toFixed(1);
      
      console.log(`✅ Batch ${batch + 1}/${batches} (${progress}%) - ${currentBatchSize} hotels inserted in ${batchTime}ms`);
    }
    
    console.log();
    console.log(`✅ Successfully inserted ${totalInserted.toLocaleString()} hotels`);
    console.log();

    // Verify insertion
    console.log('🔍 Verification:');
    const [newCount] = await connection.query('SELECT COUNT(*) as count FROM hotels');
    console.log(`   Total hotels in database: ${newCount[0].count.toLocaleString()}`);
    
    // City distribution check
    const [cityDist] = await connection.query(`
      SELECT city, COUNT(*) as count 
      FROM hotels 
      GROUP BY city 
      ORDER BY count DESC 
      LIMIT 10
    `);
    console.log('\n   Top 10 cities:');
    cityDist.forEach(row => {
      const percentage = (row.count / newCount[0].count * 100).toFixed(1);
      console.log(`      ${row.city.padEnd(20)}: ${row.count.toLocaleString().padStart(8)} (${percentage}%)`);
    });
    
    // Star rating distribution
    const [starDist] = await connection.query(`
      SELECT star_rating, COUNT(*) as count 
      FROM hotels 
      GROUP BY star_rating 
      ORDER BY star_rating DESC
    `);
    console.log('\n   Star rating distribution:');
    starDist.forEach(row => {
      const percentage = (row.count / newCount[0].count * 100).toFixed(1);
      console.log(`      ${row.star_rating} stars: ${row.count.toLocaleString().padStart(8)} (${percentage}%)`);
    });
    
    // Sample hotels
    const [samples] = await connection.query('SELECT id, hotel_name, city, state, star_rating, price_per_night FROM hotels ORDER BY id DESC LIMIT 5');
    console.log('\n   Sample hotels (most recent):');
    samples.forEach(hotel => {
      console.log(`      ID ${hotel.id}: ${hotel.hotel_name} - ${hotel.city}, ${hotel.state} (${hotel.star_rating}★, $${hotel.price_per_night}/night)`);
    });
    
    // Save IDs to file
    const idsData = {
      count: insertedIds.length,
      ids: insertedIds,
      minId: Math.min(...insertedIds),
      maxId: Math.max(...insertedIds),
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('hotel-ids.json', JSON.stringify(idsData, null, 2));
    console.log('\n💾 Hotel IDs saved to hotel-ids.json');
    
    console.log();
    console.log('='.repeat(80));
    console.log('✅ HOTEL SEEDING COMPLETE');
    console.log('='.repeat(80));
    console.log();
    
  } catch (error) {
    console.error('❌ Error seeding hotels:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedHotels();
