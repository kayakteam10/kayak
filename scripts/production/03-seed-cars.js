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

const TARGET_COUNT = 5000;
const BATCH_SIZE = 1000;

const CITY_AIRPORTS = [
  { city: 'San Francisco', state: 'CA', airports: ['SFO', 'SJC'] },
  { city: 'New York', state: 'NY', airports: ['JFK', 'EWR'] },
  { city: 'Los Angeles', state: 'CA', airports: ['LAX'] },
  { city: 'Chicago', state: 'IL', airports: ['ORD'] },
  { city: 'Houston', state: 'TX', airports: [] },
  { city: 'Phoenix', state: 'AZ', airports: ['PHX'] },
  { city: 'Philadelphia', state: 'PA', airports: ['PHL'] },
  { city: 'Miami', state: 'FL', airports: ['MIA', 'FLL'] },
  { city: 'Seattle', state: 'WA', airports: ['SEA'] },
  { city: 'Denver', state: 'CO', airports: ['DEN'] },
  { city: 'Boston', state: 'MA', airports: ['BOS'] },
  { city: 'Las Vegas', state: 'NV', airports: ['LAS'] },
  { city: 'Atlanta', state: 'GA', airports: ['ATL'] }
];

const CAR_COMPANIES = [
  'Enterprise', 'Hertz', 'Avis', 'Budget', 'National', 
  'Alamo', 'Dollar', 'Thrifty', 'Sixt', 'Payless'
];

const CAR_MODELS = {
  suv: ['Honda CR-V', 'Toyota RAV4', 'Ford Explorer', 'Jeep Grand Cherokee', 'Chevrolet Tahoe'],
  sedan: ['Toyota Camry', 'Honda Accord', 'Nissan Altima', 'Ford Fusion', 'Chevrolet Malibu'],
  compact: ['Toyota Corolla', 'Honda Civic', 'Nissan Sentra', 'Ford Focus', 'Chevrolet Cruze'],
  luxury: ['BMW 5 Series', 'Mercedes E-Class', 'Audi A6', 'Lexus ES', 'Cadillac CT5'],
  van: ['Honda Odyssey', 'Toyota Sienna', 'Chrysler Pacifica', 'Dodge Grand Caravan'],
  convertible: ['Ford Mustang Convertible', 'Chevrolet Camaro Convertible', 'BMW 4 Series Convertible'],
  truck: ['Ford F-150', 'Chevrolet Silverado', 'Ram 1500', 'Toyota Tacoma']
};

function getRandomCityAirport() {
  const location = faker.helpers.arrayElement(CITY_AIRPORTS);
  // Only assign airport if location has airports and random check passes
  const airport = (location.airports.length > 0 && faker.datatype.boolean(0.8))
    ? faker.helpers.arrayElement(location.airports)
    : null; // 20% city center or no airport available
  
  return {
    city: location.city,
    state: location.state,
    airport
  };
}

function generateCar() {
  const carType = faker.helpers.arrayElement(['suv', 'sedan', 'compact', 'luxury', 'van', 'convertible', 'truck']);
  const model = faker.helpers.arrayElement(CAR_MODELS[carType]);
  const location = getRandomCityAirport();
  
  const year = faker.number.int({ min: 2019, max: 2024 });
  
  // Pricing based on car type
  const priceRanges = {
    compact: { min: 35, max: 55 },
    sedan: { min: 45, max: 75 },
    suv: { min: 65, max: 110 },
    luxury: { min: 120, max: 250 },
    van: { min: 80, max: 130 },
    convertible: { min: 90, max: 180 },
    truck: { min: 70, max: 120 }
  };
  
  const priceRange = priceRanges[carType];
  const dailyPrice = faker.number.float({ 
    min: priceRange.min, 
    max: priceRange.max, 
    precision: 0.01 
  });
  
  const numSeats = carType === 'van' ? faker.helpers.arrayElement([7, 8]) :
                   carType === 'truck' ? faker.helpers.arrayElement([2, 5]) :
                   carType === 'convertible' ? faker.helpers.arrayElement([2, 4]) :
                   5;
  
  return {
    car_type: carType,
    company: faker.helpers.arrayElement(CAR_COMPANIES),
    model: model,
    year: year,
    transmission: faker.helpers.weightedArrayElement([
      { weight: 85, value: 'automatic' },
      { weight: 15, value: 'manual' }
    ]),
    num_seats: numSeats,
    daily_rental_price: dailyPrice,
    location_city: location.city,
    airport_code: location.airport,
    status: faker.helpers.weightedArrayElement([
      { weight: 70, value: 'available' },
      { weight: 25, value: 'rented' },
      { weight: 5, value: 'maintenance' }
    ]),
    average_rating: faker.number.float({ min: 3.8, max: 5.0, precision: 0.01 })
  };
}

async function seedCars() {
  console.log('='.repeat(80));
  console.log('SEEDING CARS');
  console.log('='.repeat(80));
  console.log();

  const connection = await mysql.createConnection(MYSQL_CONFIG);
  const insertedIds = [];
  
  try {
    // Verify airports exist
    const [airportCheck] = await connection.query('SELECT COUNT(*) as count FROM airports');
    if (airportCheck[0].count === 0) {
      throw new Error('No airports found in database. Please seed airports first.');
    }
    console.log(`✅ Found ${airportCheck[0].count} airports in database`);
    console.log();

    // Get current count
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM cars');
    const currentCount = countResult[0].count;
    console.log(`📊 Current car count: ${currentCount.toLocaleString()}`);
    console.log(`🎯 Target: Add ${TARGET_COUNT.toLocaleString()} new cars`);
    console.log();

    const batches = Math.ceil(TARGET_COUNT / BATCH_SIZE);
    let totalInserted = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = Date.now();
      const cars = [];
      const remainingCount = TARGET_COUNT - totalInserted;
      const currentBatchSize = Math.min(BATCH_SIZE, remainingCount);
      
      // Generate cars for this batch
      for (let i = 0; i < currentBatchSize; i++) {
        cars.push(generateCar());
      }
      
      // Batch insert
      const values = cars.map(car => [
        car.car_type,
        car.company,
        car.model,
        car.year,
        car.transmission,
        car.num_seats,
        car.daily_rental_price,
        car.location_city,
        car.airport_code,
        car.status,
        car.average_rating
      ]);
      
      const sql = `
        INSERT INTO cars (
          car_type, company, model, year, transmission, num_seats,
          daily_rental_price, location_city, airport_code, status, average_rating
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
      
      console.log(`✅ Batch ${batch + 1}/${batches} (${progress}%) - ${currentBatchSize} cars inserted in ${batchTime}ms`);
    }
    
    console.log();
    console.log(`✅ Successfully inserted ${totalInserted.toLocaleString()} cars`);
    console.log();

    // Verify insertion
    console.log('🔍 Verification:');
    const [newCount] = await connection.query('SELECT COUNT(*) as count FROM cars');
    console.log(`   Total cars in database: ${newCount[0].count.toLocaleString()}`);
    
    // City distribution check
    const [cityDist] = await connection.query(`
      SELECT location_city, COUNT(*) as count 
      FROM cars 
      GROUP BY location_city 
      ORDER BY count DESC 
      LIMIT 10
    `);
    console.log('\n   Top 10 cities:');
    cityDist.forEach(row => {
      const percentage = (row.count / newCount[0].count * 100).toFixed(1);
      console.log(`      ${row.location_city.padEnd(20)}: ${row.count.toLocaleString().padStart(8)} (${percentage}%)`);
    });
    
    // Car type distribution
    const [typeDist] = await connection.query(`
      SELECT car_type, COUNT(*) as count 
      FROM cars 
      GROUP BY car_type 
      ORDER BY count DESC
    `);
    console.log('\n   Car type distribution:');
    typeDist.forEach(row => {
      const percentage = (row.count / newCount[0].count * 100).toFixed(1);
      console.log(`      ${row.car_type.padEnd(15)}: ${row.count.toLocaleString().padStart(8)} (${percentage}%)`);
    });
    
    // Airport vs city center
    const [locationDist] = await connection.query(`
      SELECT 
        CASE 
          WHEN airport_code IS NULL THEN 'City Center'
          ELSE 'Airport'
        END as location_type,
        COUNT(*) as count
      FROM cars
      GROUP BY location_type
    `);
    console.log('\n   Location distribution:');
    locationDist.forEach(row => {
      const percentage = (row.count / newCount[0].count * 100).toFixed(1);
      console.log(`      ${row.location_type.padEnd(15)}: ${row.count.toLocaleString().padStart(8)} (${percentage}%)`);
    });
    
    // Sample cars
    const [samples] = await connection.query('SELECT id, car_type, company, model, location_city, airport_code, daily_rental_price FROM cars ORDER BY id DESC LIMIT 5');
    console.log('\n   Sample cars (most recent):');
    samples.forEach(car => {
      const location = car.airport_code ? `${car.airport_code} (${car.location_city})` : car.location_city;
      console.log(`      ID ${car.id}: ${car.year} ${car.model} (${car.car_type}) - ${car.company} at ${location} - $${car.daily_rental_price}/day`);
    });
    
    // Save IDs to file
    const idsData = {
      count: insertedIds.length,
      ids: insertedIds,
      minId: Math.min(...insertedIds),
      maxId: Math.max(...insertedIds),
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('car-ids.json', JSON.stringify(idsData, null, 2));
    console.log('\n💾 Car IDs saved to car-ids.json');
    
    console.log();
    console.log('='.repeat(80));
    console.log('✅ CAR SEEDING COMPLETE');
    console.log('='.repeat(80));
    console.log();
    
  } catch (error) {
    console.error('❌ Error seeding cars:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedCars();
