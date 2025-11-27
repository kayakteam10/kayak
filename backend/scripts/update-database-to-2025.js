// Script to remove all 2024 flights from database
// Run: node kayak-app/update-database-to-2025.js

const fs = require('fs');
const path = require('path');

// Get absolute paths
const backendDir = path.join(__dirname, 'backend');
const databaseConfig = path.join(backendDir, 'config', 'database');

// Change to backend directory to use its node_modules
process.chdir(backendDir);
const pool = require(databaseConfig);

async function updateDatabase() {
  try {
    console.log('✅ Using database pool from backend config');
    console.log('🗑️  Removing all 2024 flights...');

    // Delete all 2024 flights
    const deleteResult = await pool.query(
      'DELETE FROM flights WHERE YEAR(departure_time) = 2024'
    );
    
    console.log('✅ Deleted 2024 flights');

    // Verify remaining flights
    const verifyResult = await pool.query(
      `SELECT COUNT(*) as total_2025_flights, 
       MIN(DATE(departure_time)) as min_date, 
       MAX(DATE(departure_time)) as max_date
       FROM flights 
       WHERE YEAR(departure_time) = 2025`
    );
    
    console.log('✅ Remaining 2025 flights:', verifyResult.rows[0]);

    // Check all flights
    const allFlightsResult = await pool.query(
      `SELECT COUNT(*) as total, 
       MIN(DATE(departure_time)) as min_date, 
       MAX(DATE(departure_time)) as max_date
       FROM flights`
    );
    
    console.log('✅ All flights in database:', allFlightsResult.rows[0]);

  } catch (error) {
    console.error('❌ Error updating database:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    // Close pool
    await pool.end();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
}

// Run the script
updateDatabase();

