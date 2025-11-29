const pool = require('./config/database');

async function checkStructure() {
  try {
    // Check flights table structure
    const flightsStructure = await pool.query('DESCRIBE flights');
    console.log('\n📋 Flights table columns:');
    flightsStructure.rows.forEach(row => {
      console.log(`  - ${row.Field} (${row.Type})`);
    });
    
    // Check airports table
    const airportsStructure = await pool.query('DESCRIBE airports');
    console.log('\n✈️ Airports table columns:');
    airportsStructure.rows.forEach(row => {
      console.log(`  - ${row.Field} (${row.Type})`);
    });
    
    // Sample flights
    const sample = await pool.query('SELECT * FROM flights LIMIT 3');
    console.log('\n📊 Sample flights:');
    sample.rows.forEach((row, idx) => {
      console.log(`\nFlight ${idx + 1}:`);
      console.log(`  Airline: ${row.airline}`);
      console.log(`  Flight: ${row.flight_number}`);
      console.log(`  From: ${row.departure_airport || row.departure_city}`);
      console.log(`  To: ${row.arrival_airport || row.arrival_city}`);
      console.log(`  Date: ${row.departure_time}`);
      console.log(`  Price: $${row.price}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkStructure();
