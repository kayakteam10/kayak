const pool = require('./config/database');

async function checkFlights() {
  try {
    // Check total flights
    const total = await pool.query('SELECT COUNT(*) as count FROM flights');
    console.log(`\n📊 Total flights in database: ${total.rows[0].count}`);
    
    // Check date range
    const dates = await pool.query('SELECT MIN(DATE(departure_time)) as min_date, MAX(DATE(departure_time)) as max_date FROM flights');
    console.log(`📅 Date range: ${dates.rows[0].min_date} to ${dates.rows[0].max_date}`);
    
    // Check available routes
    const routes = await pool.query(`
      SELECT DISTINCT departure_city, arrival_city, COUNT(*) as flight_count
      FROM flights 
      GROUP BY departure_city, arrival_city
      ORDER BY departure_city, arrival_city
      LIMIT 20
    `);
    console.log('\n✈️ Available routes:');
    routes.rows.forEach(row => {
      console.log(`  ${row.departure_city} → ${row.arrival_city} (${row.flight_count} flights)`);
    });
    
    // Check December 2025 flights
    const dec2025 = await pool.query(`
      SELECT departure_city, arrival_city, DATE(departure_time) as date, COUNT(*) as count
      FROM flights 
      WHERE departure_time >= '2025-12-01' AND departure_time < '2026-01-01'
      GROUP BY departure_city, arrival_city, DATE(departure_time)
      ORDER BY date
      LIMIT 20
    `);
    console.log('\n📆 December 2025 flights:');
    dec2025.rows.forEach(row => {
      console.log(`  ${row.date}: ${row.departure_city} → ${row.arrival_city} (${row.count} flights)`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFlights();
