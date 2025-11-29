const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

async function addRoomTypes() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'kayak_db',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'database', 'add-room-types.sql');
    console.log('📖 Reading SQL file:', sqlFilePath);
    
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');

    // Execute the SQL
    console.log('🚀 Creating room_types table and adding data...');
    await connection.query(sqlContent);
    
    console.log('✅ Room types added successfully!');
    
    // Verify
    const [rooms] = await connection.query('SELECT COUNT(*) as count FROM room_types');
    console.log(`📊 Total room types: ${rooms[0].count}`);

  } catch (error) {
    console.error('❌ Error adding room types:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

addRoomTypes();
