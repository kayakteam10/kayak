const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function applyNewDatabase() {
  let connection;
  
  try {
    console.log('🔄 Connecting to MySQL server...');
    
    // Connect without specifying database (to drop/create it)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      multipleStatements: true
    });
    
    console.log('✅ Connected to MySQL server\n');
    
    // Read SQL files
    console.log('📖 Reading schema file...');
    const schemaPath = path.join(__dirname, '01-complete-schema-new.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    
    console.log('📖 Reading data file...');
    const dataPath = path.join(__dirname, '02-dummy-data.sql');
    const dataSQL = await fs.readFile(dataPath, 'utf8');
    
    // Apply schema (drops and recreates database)
    console.log('\n🗑️  Dropping old kayak_db database...');
    console.log('🏗️  Creating new database and tables...');
    await connection.query(schemaSQL);
    console.log('✅ Schema applied successfully!\n');
    
    // Apply data
    console.log('📝 Inserting dummy data...');
    await connection.query(dataSQL);
    console.log('✅ Data inserted successfully!\n');
    
    // Verify what was created
    await connection.query('USE kayak_db');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📊 Created tables:');
    tables.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`   - ${tableName}`);
    });
    
    // Show counts
    console.log('\n📈 Data counts:');
    const tablesToCount = ['users', 'airports', 'cities', 'flights', 'flight_seats', 
                           'hotels', 'room_types', 'cars', 'bookings', 'payments', 
                           'billing', 'administrators'];
    
    for (const table of tablesToCount) {
      try {
        const [result] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ${table}: ${result[0].count} rows`);
      } catch (err) {
        // Table might not exist, skip
      }
    }
    
    console.log('\n✅ Database successfully recreated from database-new files!');
    console.log('🚀 Your backend will now use the new schema and data.');
    
  } catch (error) {
    console.error('\n❌ Error applying database:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Connection closed');
    }
  }
}

// Run the script
applyNewDatabase();
