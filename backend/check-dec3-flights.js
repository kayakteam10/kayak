const pool = require('./config/database');

async function checkDec3Flights() {
  try {
    const flights = await pool.query(`
      SELECT f.*, dep.city as dep_city, arr.city as arr_city
      FROM flights f
      JOIN airports dep ON f.departure_airport = dep.code
      JOIN airports arr ON f.arrival_airport = arr.code
      WHERE DATE(f.departure_time) = '2025-12-03'
      ORDER BY f.departure_time
    `);
    
    console.log(`\n✈️ Flights on December 3, 2025: ${flights.rows.length}`);
    flights.rows.forEach(flight => {
      console.log(`  ${flight.airline} ${flight.flight_number}: ${flight.dep_city} (${flight.departure_airport}) → ${flight.arr_city} (${flight.arrival_airport})`);
      console.log(`    Departs: ${flight.departure_time}, Price: $${flight.price}, Seats: ${flight.available_seats}`);
    });
    
    // Check SFO to New York area
    const sfoToNY = await pool.query(`
      SELECT f.*, dep.city as dep_city, arr.city as arr_city
      FROM flights f
      JOIN airports dep ON f.departure_airport = dep.code
      JOIN airports arr ON f.arrival_airport = arr.code
      WHERE f.departure_airport = 'SFO'
        AND (arr.city LIKE '%New York%' OR f.arrival_airport IN ('JFK', 'LGA', 'EWR'))
        AND DATE(f.departure_time) = '2025-12-03'
    `);
    
    console.log(`\n✈️ SFO to New York area on Dec 3: ${sfoToNY.rows.length}`);
    sfoToNY.rows.forEach(flight => {
      console.log(`  ${flight.airline} ${flight.flight_number}: ${flight.dep_city} → ${flight.arr_city}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDec3Flights();
