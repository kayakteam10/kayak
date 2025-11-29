const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

async function addHotelData() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'autorack.proxy.rlwy.net',
      port: process.env.DB_PORT || 27326,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'BtYMVLKdQZnEeBRnQdBvqYvJjElLgtJL',
      database: process.env.DB_NAME || 'kayak_db',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'database', 'add-sample-hotels.sql');
    console.log('📖 Reading SQL file:', sqlFilePath);
    
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');

    // Execute the SQL
    console.log('🚀 Executing SQL statements...');
    const [results] = await connection.query(sqlContent);
    
    console.log('✅ Hotel data added successfully!');
    
    // Show results
    if (Array.isArray(results)) {
      const lastResult = results[results.length - 1];
      if (lastResult && lastResult[0]) {
        console.log('📊 Result:', lastResult[0]);
      }
    }

  } catch (error) {
    console.error('❌ Error adding hotel data:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
addHotelData();
