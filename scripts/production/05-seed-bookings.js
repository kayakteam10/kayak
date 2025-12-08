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

const TARGET_COUNT = 100000;
const BATCH_SIZE = 1000;

// Booking type distribution: 40% hotels, 30% flights, 30% cars
const BOOKING_TYPE_WEIGHTS = [
  { weight: 40, value: 'hotel' },
  { weight: 30, value: 'flight' },
  { weight: 30, value: 'car' }
];

// Status distribution
const STATUS_WEIGHTS = [
  { weight: 70, value: 'confirmed' },
  { weight: 20, value: 'completed' },
  { weight: 8, value: 'cancelled' },
  { weight: 2, value: 'pending' }
];

const usedBookingReferences = new Set();

function generateBookingReference() {
  let ref;
  let attempts = 0;
  do {
    const letters = faker.string.alpha({ length: 3, casing: 'upper' });
    const numbers = faker.string.numeric(6);
    ref = `${letters}${numbers}`;
    attempts++;
    if (attempts > 100) {
      // Fallback with timestamp to ensure uniqueness
      ref = `${letters}${Date.now().toString().slice(-6)}`;
      break;
    }
  } while (usedBookingReferences.has(ref));
  
  usedBookingReferences.add(ref);
  return ref;
}

function generateHotelBooking(userId, hotelId, hotels) {
  const hotel = hotels.find(h => h.id === hotelId);
  if (!hotel) return null;
  
  const checkIn = faker.date.between({ 
    from: new Date(2024, 10, 1),  // Nov 1, 2024
    to: new Date(2025, 3, 30)      // Apr 30, 2025
  });
  
  const nights = faker.number.int({ min: 1, max: 7 });
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);
  
  const rooms = faker.number.int({ min: 1, max: 3 });
  const guests = faker.number.int({ min: 1, max: 4 });
  
  const totalAmount = hotel.price_per_night * nights * rooms;
  
  const bookingDetails = {
    hotel_id: hotel.id,
    hotel_name: hotel.hotel_name,
    city: hotel.city,
    state: hotel.state,
    check_in: checkIn.toISOString().split('T')[0],
    check_out: checkOut.toISOString().split('T')[0],
    nights: nights,
    rooms: rooms,
    guests: guests,
    price_per_night: hotel.price_per_night,
    amenities: Array.isArray(hotel.amenities) ? hotel.amenities : (hotel.amenities ? JSON.parse(hotel.amenities) : []),
    free_cancellation: hotel.free_cancellation
  };
  
  return {
    user_id: userId,
    booking_reference: generateBookingReference(),
    booking_type: 'hotel',
    booking_details: JSON.stringify(bookingDetails),
    total_amount: totalAmount,
    status: faker.helpers.weightedArrayElement(STATUS_WEIGHTS)
  };
}

function generateFlightBooking(userId, flightId, flights) {
  const flight = flights.find(f => f.id === flightId);
  if (!flight) return null;
  
  const passengers = faker.number.int({ min: 1, max: 4 });
  const seatClass = faker.helpers.weightedArrayElement([
    { weight: 70, value: 'economy' },
    { weight: 20, value: 'business' },
    { weight: 10, value: 'first' }
  ]);
  
  const classMultiplier = seatClass === 'first' ? 3.5 : seatClass === 'business' ? 2.0 : 1.0;
  const checkedBags = faker.number.int({ min: 0, max: 2 });
  
  const totalAmount = (flight.price * classMultiplier * passengers) + (checkedBags * flight.checked_bag_fee);
  
  const bookingDetails = {
    flight_id: flight.id,
    flight_number: flight.flight_number,
    airline: flight.airline,
    departure_airport: flight.departure_airport,
    arrival_airport: flight.arrival_airport,
    departure_time: flight.departure_time,
    arrival_time: flight.arrival_time,
    passengers: passengers,
    seat_class: seatClass,
    checked_bags: checkedBags,
    base_price: flight.price,
    baggage_fee: checkedBags * flight.checked_bag_fee
  };
  
  return {
    user_id: userId,
    booking_reference: generateBookingReference(),
    booking_type: 'flight',
    booking_details: JSON.stringify(bookingDetails),
    total_amount: totalAmount,
    status: faker.helpers.weightedArrayElement(STATUS_WEIGHTS)
  };
}

function generateCarBooking(userId, carId, cars) {
  const car = cars.find(c => c.id === carId);
  if (!car) return null;
  
  const pickupDate = faker.date.between({ 
    from: new Date(2024, 10, 1),
    to: new Date(2025, 3, 30)
  });
  
  const days = faker.number.int({ min: 1, max: 14 });
  const dropoffDate = new Date(pickupDate);
  dropoffDate.setDate(dropoffDate.getDate() + days);
  
  const insurance = faker.datatype.boolean(0.4);
  const insuranceFee = insurance ? 15.00 * days : 0;
  const gps = faker.datatype.boolean(0.3);
  const gpsFee = gps ? 10.00 * days : 0;
  
  const totalAmount = (car.daily_rental_price * days) + insuranceFee + gpsFee;
  
  const bookingDetails = {
    car_id: car.id,
    car_type: car.car_type,
    company: car.company,
    model: car.model,
    year: car.year,
    location_city: car.location_city,
    airport_code: car.airport_code,
    pickup_date: pickupDate.toISOString().split('T')[0],
    dropoff_date: dropoffDate.toISOString().split('T')[0],
    days: days,
    daily_rate: car.daily_rental_price,
    insurance: insurance,
    insurance_fee: insuranceFee,
    gps: gps,
    gps_fee: gpsFee
  };
  
  return {
    user_id: userId,
    booking_reference: generateBookingReference(),
    booking_type: 'car',
    booking_details: JSON.stringify(bookingDetails),
    total_amount: totalAmount,
    status: faker.helpers.weightedArrayElement(STATUS_WEIGHTS)
  };
}

async function seedBookings() {
  console.log('='.repeat(80));
  console.log('SEEDING BOOKINGS (WITH PROPER RELATIONSHIPS)');
  console.log('='.repeat(80));
  console.log();

  const connection = await mysql.createConnection(MYSQL_CONFIG);
  const insertedIds = [];
  
  try {
    // ========================================
    // Load actual IDs from previous phases
    // ========================================
    console.log('📂 Loading entity IDs from previous seeding phases...\n');
    
    let userIds, hotelIds, carIds, flightIds;
    
    // Try to load from JSON files first
    try {
      if (fs.existsSync('user-ids.json')) {
        userIds = JSON.parse(fs.readFileSync('user-ids.json')).ids;
        console.log(`   ✅ Loaded ${userIds.length.toLocaleString()} user IDs from file`);
      }
    } catch (e) {
      console.log('   ⚠️  user-ids.json not found, querying database...');
    }
    
    try {
      if (fs.existsSync('hotel-ids.json')) {
        hotelIds = JSON.parse(fs.readFileSync('hotel-ids.json')).ids;
        console.log(`   ✅ Loaded ${hotelIds.length.toLocaleString()} hotel IDs from file`);
      }
    } catch (e) {
      console.log('   ⚠️  hotel-ids.json not found, querying database...');
    }
    
    try {
      if (fs.existsSync('car-ids.json')) {
        carIds = JSON.parse(fs.readFileSync('car-ids.json')).ids;
        console.log(`   ✅ Loaded ${carIds.length.toLocaleString()} car IDs from file`);
      }
    } catch (e) {
      console.log('   ⚠️  car-ids.json not found, querying database...');
    }
    
    try {
      if (fs.existsSync('flight-ids.json')) {
        flightIds = JSON.parse(fs.readFileSync('flight-ids.json')).ids;
        console.log(`   ✅ Loaded ${flightIds.length.toLocaleString()} flight IDs from file`);
      }
    } catch (e) {
      console.log('   ⚠️  flight-ids.json not found, querying database...');
    }
    
    // Fallback: Query database if files not found
    if (!userIds) {
      const [users] = await connection.query('SELECT id FROM users');
      userIds = users.map(u => u.id);
      console.log(`   ✅ Queried ${userIds.length.toLocaleString()} user IDs from database`);
    }
    
    if (!hotelIds) {
      const [hotels] = await connection.query('SELECT id FROM hotels');
      hotelIds = hotels.map(h => h.id);
      console.log(`   ✅ Queried ${hotelIds.length.toLocaleString()} hotel IDs from database`);
    }
    
    if (!carIds) {
      const [cars] = await connection.query('SELECT id FROM cars');
      carIds = cars.map(c => c.id);
      console.log(`   ✅ Queried ${carIds.length.toLocaleString()} car IDs from database`);
    }
    
    if (!flightIds) {
      const [flights] = await connection.query('SELECT id FROM flights');
      flightIds = flights.map(f => f.id);
      console.log(`   ✅ Queried ${flightIds.length.toLocaleString()} flight IDs from database`);
    }
    
    console.log();
    
    // Validate we have data
    if (userIds.length === 0) throw new Error('No users found! Run user seeding first.');
    if (hotelIds.length === 0) throw new Error('No hotels found! Run hotel seeding first.');
    if (carIds.length === 0) throw new Error('No cars found! Run car seeding first.');
    if (flightIds.length === 0) throw new Error('No flights found! Run flight seeding first.');
    
    // ========================================
    // Load full entity details for bookings
    // ========================================
    console.log('📊 Loading entity details...\n');
    
    const [hotels] = await connection.query('SELECT id, hotel_name, city, state, price_per_night, amenities, free_cancellation FROM hotels');
    const [flights] = await connection.query('SELECT id, flight_number, airline, departure_airport, arrival_airport, departure_time, arrival_time, price, checked_bag_fee FROM flights');
    const [cars] = await connection.query('SELECT id, car_type, company, model, year, location_city, airport_code, daily_rental_price FROM cars');
    
    console.log(`   Hotels: ${hotels.length.toLocaleString()}`);
    console.log(`   Flights: ${flights.length.toLocaleString()}`);
    console.log(`   Cars: ${cars.length.toLocaleString()}`);
    console.log();

    // Get current count
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM bookings');
    const currentCount = countResult[0].count;
    console.log(`📊 Current booking count: ${currentCount.toLocaleString()}`);
    console.log(`🎯 Target: Add ${TARGET_COUNT.toLocaleString()} new bookings`);
    console.log();

    const batches = Math.ceil(TARGET_COUNT / BATCH_SIZE);
    let totalInserted = 0;
    let typeCount = { hotel: 0, flight: 0, car: 0 };
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = Date.now();
      const bookings = [];
      const remainingCount = TARGET_COUNT - totalInserted;
      const currentBatchSize = Math.min(BATCH_SIZE, remainingCount);
      
      // Generate bookings for this batch
      for (let i = 0; i < currentBatchSize; i++) {
        const userId = faker.helpers.arrayElement(userIds);
        const bookingType = faker.helpers.weightedArrayElement(BOOKING_TYPE_WEIGHTS);
        
        let booking = null;
        
        if (bookingType === 'hotel') {
          const hotelId = faker.helpers.arrayElement(hotelIds);
          booking = generateHotelBooking(userId, hotelId, hotels);
          if (booking) typeCount.hotel++;
        } else if (bookingType === 'flight') {
          const flightId = faker.helpers.arrayElement(flightIds);
          booking = generateFlightBooking(userId, flightId, flights);
          if (booking) typeCount.flight++;
        } else if (bookingType === 'car') {
          const carId = faker.helpers.arrayElement(carIds);
          booking = generateCarBooking(userId, carId, cars);
          if (booking) typeCount.car++;
        }
        
        if (booking) {
          bookings.push(booking);
        }
      }
      
      if (bookings.length === 0) continue;
      
      // Batch insert
      const values = bookings.map(booking => [
        booking.user_id,
        booking.booking_reference,
        booking.booking_type,
        booking.booking_details,
        booking.total_amount,
        booking.status
      ]);
      
      const sql = `
        INSERT INTO bookings (
          user_id, booking_reference, booking_type, booking_details, 
          total_amount, status
        ) VALUES ?
      `;
      
      const [result] = await connection.query(sql, [values]);
      
      // Store inserted IDs
      const firstId = result.insertId;
      for (let i = 0; i < bookings.length; i++) {
        insertedIds.push(firstId + i);
      }
      
      totalInserted += bookings.length;
      const batchTime = Date.now() - batchStart;
      const progress = ((batch + 1) / batches * 100).toFixed(1);
      
      console.log(`✅ Batch ${batch + 1}/${batches} (${progress}%) - ${bookings.length} bookings inserted in ${batchTime}ms`);
    }
    
    console.log();
    console.log(`✅ Successfully inserted ${totalInserted.toLocaleString()} bookings`);
    console.log();

    // Verify insertion
    console.log('🔍 Verification:');
    const [newCount] = await connection.query('SELECT COUNT(*) as count FROM bookings');
    console.log(`   Total bookings in database: ${newCount[0].count.toLocaleString()}`);
    
    // Booking type distribution
    const [typeDist] = await connection.query(`
      SELECT booking_type, COUNT(*) as count 
      FROM bookings 
      GROUP BY booking_type 
      ORDER BY count DESC
    `);
    console.log('\n   Booking type distribution:');
    typeDist.forEach(row => {
      const percentage = (row.count / newCount[0].count * 100).toFixed(1);
      console.log(`      ${row.booking_type.padEnd(15)}: ${row.count.toLocaleString().padStart(8)} (${percentage}%)`);
    });
    
    // Status distribution
    const [statusDist] = await connection.query(`
      SELECT status, COUNT(*) as count 
      FROM bookings 
      GROUP BY status 
      ORDER BY count DESC
    `);
    console.log('\n   Status distribution:');
    statusDist.forEach(row => {
      const percentage = (row.count / newCount[0].count * 100).toFixed(1);
      console.log(`      ${row.status.padEnd(15)}: ${row.count.toLocaleString().padStart(8)} (${percentage}%)`);
    });
    
    // Average amounts by type
    const [avgAmounts] = await connection.query(`
      SELECT booking_type, 
             AVG(total_amount) as avg_amount,
             MIN(total_amount) as min_amount,
             MAX(total_amount) as max_amount
      FROM bookings 
      GROUP BY booking_type
    `);
    console.log('\n   Average booking amounts:');
    avgAmounts.forEach(row => {
      console.log(`      ${row.booking_type.padEnd(15)}: $${row.avg_amount.toFixed(2)} (min: $${row.min_amount.toFixed(2)}, max: $${row.max_amount.toFixed(2)})`);
    });
    
    // Verify foreign keys
    console.log('\n   Foreign Key Verification:');
    const [invalidUsers] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM bookings b 
      LEFT JOIN users u ON b.user_id = u.id 
      WHERE u.id IS NULL
    `);
    console.log(`      Invalid user_id references: ${invalidUsers[0].count}`);
    
    // Sample bookings
    const [samples] = await connection.query(`
      SELECT b.id, b.booking_reference, b.booking_type, b.total_amount, b.status, u.email
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      ORDER BY b.id DESC 
      LIMIT 5
    `);
    console.log('\n   Sample bookings (most recent):');
    samples.forEach(booking => {
      console.log(`      ID ${booking.id}: ${booking.booking_reference} - ${booking.booking_type} for ${booking.email} - $${booking.total_amount} (${booking.status})`);
    });
    
    // Save IDs to file
    const idsData = {
      count: insertedIds.length,
      ids: insertedIds,
      minId: Math.min(...insertedIds),
      maxId: Math.max(...insertedIds),
      typeDistribution: typeCount,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('booking-ids.json', JSON.stringify(idsData, null, 2));
    console.log('\n💾 Booking IDs saved to booking-ids.json');
    
    console.log();
    console.log('='.repeat(80));
    console.log('✅ BOOKING SEEDING COMPLETE');
    console.log('='.repeat(80));
    console.log();
    
  } catch (error) {
    console.error('❌ Error seeding bookings:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedBookings();
