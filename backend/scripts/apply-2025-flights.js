// Script to add 2025 flights to database
// Run: node kayak-app/apply-2025-flights.js

const fs = require('fs');
const path = require('path');

// Get absolute paths
const backendDir = path.join(__dirname, 'backend');
const databaseConfig = path.join(backendDir, 'config', 'database');

// Change to backend directory to use its node_modules
process.chdir(backendDir);
const pool = require(databaseConfig);

async function applyFlights() {
  try {
    console.log('✅ Using database pool from backend config');

    // Read SQL file (from original __dirname before chdir)
    const originalDir = path.resolve(__dirname, '..');
    const sqlFile = path.join(originalDir, 'kayak-app', 'database', 'add-dec21-25-2025-flights.sql');
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

    console.log('✅ Successfully added 2025 flights to database!');

    // Verify flights were added
    const verifyResult = await pool.query(
      'SELECT COUNT(*) as total FROM flights WHERE YEAR(departure_time) = 2025'
    );
    console.log('✅ Total 2025 flights in database:', verifyResult.rows[0].total);

    // Check specific dates
    const dateCheckResult = await pool.query(
      `SELECT COUNT(*) as total, 
       MIN(DATE(departure_time)) as min_date, 
       MAX(DATE(departure_time)) as max_date
       FROM flights 
       WHERE YEAR(departure_time) = 2025 
       AND departure_city = 'New York' 
       AND arrival_city = 'Los Angeles'`
    );
    console.log('✅ 2025 NY→LA flights:', dateCheckResult.rows[0]);

    // Check return flights
    const returnCheckResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM flights 
       WHERE YEAR(departure_time) = 2025 
       AND departure_city = 'Los Angeles' 
       AND arrival_city = 'New York'`
    );
    console.log('✅ 2025 LA→NY flights:', returnCheckResult.rows[0].total);

  } catch (error) {
    console.error('❌ Error applying flights:', error.message);
    console.error('Error details:', error);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Tip: Set MYSQL_PASSWORD in kayak-app/backend/.env file');
    }
    process.exit(1);
  } finally {
    // Close pool
    await pool.end();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
}

// Run the script
applyFlights();

