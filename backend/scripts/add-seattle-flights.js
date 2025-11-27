// Script to add Seattle flights for multi-city searches
// Run: node kayak-app/add-seattle-flights.js

const fs = require('fs');
const path = require('path');

// Get absolute paths
const backendDir = path.join(__dirname, 'backend');
const databaseConfig = path.join(backendDir, 'config', 'database');

// Change to backend directory to use its node_modules
process.chdir(backendDir);
const pool = require(databaseConfig);

async function addSeattleFlights() {
  try {
    console.log('✅ Using database pool from backend config');

    // Read SQL file (after chdir, we're in backend/, so go up to kayak-app/ then into database/)
    const originalDir = process.cwd();
    const sqlFile = path.join(originalDir, '..', 'database', 'add-seattle-flights.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 Reading SQL file:', sqlFile);
    console.log('🚀 Executing SQL...');

    // Remove comments and split SQL into individual statements
    const cleanedSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split by semicolon, but keep multi-line INSERT statements together
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.toUpperCase().startsWith('USE'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    let executedCount = 0;
    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          const result = await pool.query(statement);
          executedCount++;
          if (result.rows && result.rows.length > 0) {
            console.log(`✅ Executed statement ${executedCount}, affected rows:`, result.rows.length);
          }
        } catch (err) {
          console.error(`❌ Error executing statement ${executedCount + 1}:`, err.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }
    
    console.log(`✅ Executed ${executedCount} SQL statements`);

    // Verify flights were added
    const verifyResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM flights 
       WHERE departure_city = 'Los Angeles' 
       AND arrival_city = 'Seattle'
       AND YEAR(departure_time) = 2025`
    );
    console.log('✅ LA→Seattle flights in database:', verifyResult.rows[0].total);

    // Check date range
    const dateCheckResult = await pool.query(
      `SELECT COUNT(*) as total, 
       MIN(DATE(departure_time)) as min_date, 
       MAX(DATE(departure_time)) as max_date
       FROM flights 
       WHERE departure_city = 'Los Angeles' 
       AND arrival_city = 'Seattle'
       AND YEAR(departure_time) = 2025`
    );
    console.log('✅ LA→Seattle date range:', dateCheckResult.rows[0]);

  } catch (error) {
    console.error('❌ Error adding Seattle flights:', error.message);
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
addSeattleFlights();

