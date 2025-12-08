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

const TARGET_PAIRS = 10000; // 10,000 outbound + 10,000 return = 20,000 total
const BATCH_SIZE = 500; // Pairs per batch

const AIRLINES = [
  'United Airlines', 'American Airlines', 'Delta Air Lines', 'Southwest Airlines',
  'JetBlue Airways', 'Alaska Airlines', 'Spirit Airlines', 'Frontier Airlines',
  'Hawaiian Airlines', 'Allegiant Air'
];

// Common US airport codes (ensure these exist in airports table)
// Valid codes based on actual database: ATL, BOS, CLT, ORD, DEN, DTW, IAD, FLL, LAS, LHR, LAX, MIA, MSP, JFK, EWR, PHL, PHX, SFO, SJC, SEA
const AIRPORT_CODES = [
  'SFO', 'LAX', 'JFK', 'EWR', 'ORD', 'PHX', 
  'DEN', 'SEA', 'BOS', 'ATL', 'MIA', 'LAS',
  'MSP', 'DTW', 'PHL', 'FLL', 'IAD', 'SJC', 'CLT'
];

// Track used flight numbers to avoid duplicates
const usedFlightNumbers = new Set();
let flightCounter = 1000;

function generateFlightNumber(airline) {
  const airlineCode = airline.split(' ')[0].substring(0, 2).toUpperCase();
  let flightNumber;
  let attempts = 0;
  
  do {
    const number = 1000 + (flightCounter++ % 8999);
    flightNumber = `${airlineCode}${number}`;
    attempts++;
    // Fallback to timestamp if we can't find a unique number after 100 attempts
    if (attempts > 100) {
      flightNumber = `${airlineCode}${1000 + (Date.now() % 8999)}`;
      break;
    }
  } while (usedFlightNumbers.has(flightNumber));
  
  usedFlightNumbers.add(flightNumber);
  return flightNumber;
}

function calculateDuration(departureTime, arrivalTime) {
  return Math.floor((arrivalTime - departureTime) / (1000 * 60)); // minutes
}

function generateSeatConfiguration(totalSeats) {
  const rows = Math.ceil(totalSeats / 6);
  return {
    rows: rows,
    seatsPerRow: 6,
    classes: {
      first: Math.floor(rows * 0.1),
      business: Math.floor(rows * 0.2),
      economy: Math.floor(rows * 0.7)
    }
  };
}

function generateFlightPair() {
  // Select two different airports
  const departure = faker.helpers.arrayElement(AIRPORT_CODES);
  let arrival = faker.helpers.arrayElement(AIRPORT_CODES);
  while (arrival === departure) {
    arrival = faker.helpers.arrayElement(AIRPORT_CODES);
  }
  
  const airline = faker.helpers.arrayElement(AIRLINES);
  
  // Outbound flight
  const outboundDate = faker.date.between({ 
    from: new Date(2024, 11, 1), // Dec 1, 2024
    to: new Date(2025, 2, 31)    // Mar 31, 2025
  });
  
  const departureHour = faker.number.int({ min: 5, max: 22 });
  const departureMinute = faker.helpers.arrayElement([0, 15, 30, 45]);
  
  const outboundDeparture = new Date(outboundDate);
  outboundDeparture.setHours(departureHour, departureMinute, 0, 0);
  
  // Flight duration: 1-6 hours
  const flightDuration = faker.number.int({ min: 60, max: 360 });
  const outboundArrival = new Date(outboundDeparture.getTime() + flightDuration * 60 * 1000);
  
  const totalSeats = faker.helpers.arrayElement([150, 180, 200, 220, 250, 300]);
  const occupancyRate = faker.number.float({ min: 0.4, max: 0.95, precision: 0.01 });
  const availableSeats = Math.floor(totalSeats * (1 - occupancyRate));
  
  const basePrice = faker.number.float({ min: 150, max: 800, precision: 0.01 });
  
  const seatConfig = generateSeatConfiguration(totalSeats);
  
  // Return flight (3-14 days later)
  const daysLater = faker.number.int({ min: 3, max: 14 });
  const returnDate = new Date(outboundDate);
  returnDate.setDate(returnDate.getDate() + daysLater);
  
  const returnDepartureHour = faker.number.int({ min: 5, max: 22 });
  const returnDepartureMinute = faker.helpers.arrayElement([0, 15, 30, 45]);
  
  const returnDeparture = new Date(returnDate);
  returnDeparture.setHours(returnDepartureHour, returnDepartureMinute, 0, 0);
  
  const returnArrival = new Date(returnDeparture.getTime() + flightDuration * 60 * 1000);
  
  const returnAvailableSeats = Math.floor(totalSeats * (1 - occupancyRate));
  
  return {
    outbound: {
      flight_number: generateFlightNumber(airline),
      airline: airline,
      departure_airport: departure,
      arrival_airport: arrival,
      departure_time: outboundDeparture,
      arrival_time: outboundArrival,
      duration: flightDuration,
      price: basePrice,
      available_seats: availableSeats,
      total_seats: totalSeats,
      status: faker.helpers.weightedArrayElement([
        { weight: 90, value: 'scheduled' },
        { weight: 7, value: 'delayed' },
        { weight: 3, value: 'cancelled' }
      ]),
      average_rating: faker.number.float({ min: 3.5, max: 5.0, precision: 0.01 }),
      seat_configuration: JSON.stringify(seatConfig),
      carry_on_fee: faker.helpers.arrayElement([0, 0, 0, 35.00]),
      checked_bag_fee: faker.helpers.arrayElement([35.00, 40.00, 45.00]),
      baggage_allowance: '1 Carry-on included'
    },
    return: {
      flight_number: generateFlightNumber(airline),
      airline: airline,
      departure_airport: arrival, // Reversed
      arrival_airport: departure, // Reversed
      departure_time: returnDeparture,
      arrival_time: returnArrival,
      duration: flightDuration,
      price: basePrice * faker.number.float({ min: 0.9, max: 1.1, precision: 0.01 }),
      available_seats: returnAvailableSeats,
      total_seats: totalSeats,
      status: faker.helpers.weightedArrayElement([
        { weight: 90, value: 'scheduled' },
        { weight: 7, value: 'delayed' },
        { weight: 3, value: 'cancelled' }
      ]),
      average_rating: faker.number.float({ min: 3.5, max: 5.0, precision: 0.01 }),
      seat_configuration: JSON.stringify(seatConfig),
      carry_on_fee: faker.helpers.arrayElement([0, 0, 0, 35.00]),
      checked_bag_fee: faker.helpers.arrayElement([35.00, 40.00, 45.00]),
      baggage_allowance: '1 Carry-on included'
    }
  };
}

async function seedFlights() {
  console.log('='.repeat(80));
  console.log('SEEDING FLIGHTS (WITH RETURN PAIRS)');
  console.log('='.repeat(80));
  console.log();

  const connection = await mysql.createConnection(MYSQL_CONFIG);
  const insertedIds = [];
  
  try {
    // Load existing flight numbers to avoid duplicates
    console.log('🔍 Loading existing flight numbers...');
    const [existingFlights] = await connection.query('SELECT flight_number FROM flights');
    existingFlights.forEach(row => usedFlightNumbers.add(row.flight_number));
    console.log(`✅ Loaded ${usedFlightNumbers.size} existing flight numbers`);
    console.log();
    
    // Verify airports exist
    const [airportCheck] = await connection.query('SELECT code FROM airports');
    const existingAirports = airportCheck.map(row => row.code);
    console.log(`✅ Found ${existingAirports.length} airports in database`);
    
    if (existingAirports.length === 0) {
      throw new Error('No airports found in database. Please seed airports first.');
    }
    console.log();

    // Get current count
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM flights');
    const currentCount = countResult[0].count;
    console.log(`📊 Current flight count: ${currentCount.toLocaleString()}`);
    console.log(`🎯 Target: Add ${TARGET_PAIRS.toLocaleString()} flight pairs (${TARGET_PAIRS * 2} total flights)`);
    console.log();

    const batches = Math.ceil(TARGET_PAIRS / BATCH_SIZE);
    let totalInserted = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = Date.now();
      const flights = [];
      const remainingPairs = TARGET_PAIRS - (totalInserted / 2);
      const currentBatchSize = Math.min(BATCH_SIZE, remainingPairs);
      
      // Generate flight pairs for this batch
      for (let i = 0; i < currentBatchSize; i++) {
        const pair = generateFlightPair();
        flights.push(pair.outbound);
        flights.push(pair.return);
      }
      
      // Batch insert
      const values = flights.map(flight => [
        flight.flight_number,
        flight.airline,
        flight.departure_airport,
        flight.arrival_airport,
        flight.departure_time,
        flight.arrival_time,
        flight.duration,
        flight.price,
        flight.available_seats,
        flight.total_seats,
        flight.status,
        flight.average_rating,
        flight.seat_configuration,
        flight.carry_on_fee,
        flight.checked_bag_fee,
        flight.baggage_allowance
      ]);
      
      const sql = `
        INSERT INTO flights (
          flight_number, airline, departure_airport, arrival_airport,
          departure_time, arrival_time, duration, price, available_seats,
          total_seats, status, average_rating, seat_configuration,
          carry_on_fee, checked_bag_fee, baggage_allowance
        ) VALUES ?
      `;
      
      const [result] = await connection.query(sql, [values]);
      
      // Store inserted IDs
      const firstId = result.insertId;
      for (let i = 0; i < flights.length; i++) {
        insertedIds.push(firstId + i);
      }
      
      totalInserted += flights.length;
      const batchTime = Date.now() - batchStart;
      const progress = ((batch + 1) / batches * 100).toFixed(1);
      
      console.log(`✅ Batch ${batch + 1}/${batches} (${progress}%) - ${flights.length} flights (${currentBatchSize} pairs) inserted in ${batchTime}ms`);
    }
    
    console.log();
    console.log(`✅ Successfully inserted ${totalInserted.toLocaleString()} flights (${totalInserted / 2} pairs)`);
    console.log();

    // Verify insertion
    console.log('🔍 Verification:');
    const [newCount] = await connection.query('SELECT COUNT(*) as count FROM flights');
    console.log(`   Total flights in database: ${newCount[0].count.toLocaleString()}`);
    
    // Route distribution check
    const [routeDist] = await connection.query(`
      SELECT 
        CONCAT(departure_airport, ' → ', arrival_airport) as route,
        COUNT(*) as count 
      FROM flights 
      GROUP BY route
      ORDER BY count DESC 
      LIMIT 10
    `);
    console.log('\n   Top 10 routes:');
    routeDist.forEach(row => {
      console.log(`      ${row.route.padEnd(15)}: ${row.count.toLocaleString().padStart(6)} flights`);
    });
    
    // Airline distribution
    const [airlineDist] = await connection.query(`
      SELECT airline, COUNT(*) as count 
      FROM flights 
      GROUP BY airline 
      ORDER BY count DESC
    `);
    console.log('\n   Airline distribution:');
    airlineDist.forEach(row => {
      const percentage = (row.count / newCount[0].count * 100).toFixed(1);
      console.log(`      ${row.airline.padEnd(25)}: ${row.count.toLocaleString().padStart(6)} (${percentage}%)`);
    });
    
    // Status distribution
    const [statusDist] = await connection.query(`
      SELECT status, COUNT(*) as count 
      FROM flights 
      GROUP BY status 
      ORDER BY count DESC
    `);
    console.log('\n   Status distribution:');
    statusDist.forEach(row => {
      const percentage = (row.count / newCount[0].count * 100).toFixed(1);
      console.log(`      ${row.status.padEnd(15)}: ${row.count.toLocaleString().padStart(6)} (${percentage}%)`);
    });
    
    // Sample flights
    const [samples] = await connection.query(`
      SELECT id, flight_number, airline, departure_airport, arrival_airport, 
             departure_time, price 
      FROM flights 
      ORDER BY id DESC 
      LIMIT 5
    `);
    console.log('\n   Sample flights (most recent):');
    samples.forEach(flight => {
      const date = new Date(flight.departure_time).toISOString().split('T')[0];
      const time = new Date(flight.departure_time).toTimeString().split(' ')[0].substring(0, 5);
      console.log(`      ID ${flight.id}: ${flight.flight_number} (${flight.airline}) ${flight.departure_airport}→${flight.arrival_airport} on ${date} ${time} - $${flight.price}`);
    });
    
    // Save IDs to file
    const idsData = {
      count: insertedIds.length,
      ids: insertedIds,
      minId: Math.min(...insertedIds),
      maxId: Math.max(...insertedIds),
      pairs: TARGET_PAIRS,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('flight-ids.json', JSON.stringify(idsData, null, 2));
    console.log('\n💾 Flight IDs saved to flight-ids.json');
    
    console.log();
    console.log('='.repeat(80));
    console.log('✅ FLIGHT SEEDING COMPLETE');
    console.log('='.repeat(80));
    console.log();
    
  } catch (error) {
    console.error('❌ Error seeding flights:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedFlights();
