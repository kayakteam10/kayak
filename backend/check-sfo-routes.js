const pool = require('./config/database');

async function checkSFOtoNYFlights() {
  try {
    const flights = await pool.query(`
      SELECT DATE(f.departure_time) as flight_date, COUNT(*) as count
      FROM flights f
      JOIN airports dep ON f.departure_airport = dep.code
      JOIN airports arr ON f.arrival_airport = arr.code
      WHERE f.departure_airport = 'SFO'
        AND (f.arrival_airport IN ('JFK', 'LGA', 'EWR') OR arr.city LIKE '%New York%')
      GROUP BY DATE(f.departure_time)
      ORDER BY flight_date
    `);
    
    console.log('\n✈️ San Francisco to New York flights available on:');
    if (flights.rows.length === 0) {
      console.log('  ❌ No SFO to New York flights found in database');
    } else {
      flights.rows.forEach(row => {
        console.log(`  ${row.flight_date}: ${row.count} flights`);
      });
    }
    
    // Check all available routes from SFO
    const sfoRoutes = await pool.query(`
      SELECT DISTINCT arr.city, f.arrival_airport, COUNT(*) as flight_count
      FROM flights f
      JOIN airports arr ON f.arrival_airport = arr.code
      WHERE f.departure_airport = 'SFO'
      GROUP BY arr.city, f.arrival_airport
      ORDER BY flight_count DESC
    `);
    
    console.log('\n✈️ All routes from San Francisco (SFO):');
    sfoRoutes.rows.forEach(row => {
      console.log(`  SFO → ${row.city} (${row.arrival_airport}): ${row.flight_count} flights`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSFOtoNYFlights();
