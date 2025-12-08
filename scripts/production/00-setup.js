require('dotenv').config();
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'kayak_db';

async function validateSetup() {
  console.log('='.repeat(80));
  console.log('KAYAK PRODUCTION DATA SEEDING - SETUP VALIDATION');
  console.log('='.repeat(80));
  console.log();

  let mysqlConnection;
  let mongoClient;

  try {
    // ========================================
    // 1. MySQL Connection Test
    // ========================================
    console.log('📊 Testing MySQL Connection...');
    console.log(`   Host: ${MYSQL_CONFIG.host}`);
    console.log(`   Database: ${MYSQL_CONFIG.database}`);
    
    mysqlConnection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('   ✅ MySQL Connection Successful');
    console.log();

    // ========================================
    // 2. Verify Required Tables
    // ========================================
    console.log('📋 Verifying Required Tables...');
    const [tables] = await mysqlConnection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    const requiredTables = ['users', 'hotels', 'cars', 'flights', 'airports', 'bookings', 'payments'];
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.log('   ❌ Missing tables:', missingTables.join(', '));
      throw new Error('Database schema incomplete');
    }
    
    console.log('   ✅ All required tables present');
    console.log('   Tables:', tableNames.join(', '));
    console.log();

    // ========================================
    // 3. Check Current Data Counts
    // ========================================
    console.log('📈 Current Data Counts:');
    
    for (const table of requiredTables) {
      const [result] = await mysqlConnection.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result[0].count;
      console.log(`   ${table.padEnd(15)}: ${count.toLocaleString()} records`);
    }
    console.log();

    // ========================================
    // 4. Get Schema Information
    // ========================================
    console.log('🔍 Schema Validation:');
    
    // Users Table
    const [userCols] = await mysqlConnection.query('DESCRIBE users');
    console.log('   Users table columns:', userCols.map(c => c.Field).join(', '));
    
    // Hotels Table
    const [hotelCols] = await mysqlConnection.query('DESCRIBE hotels');
    console.log('   Hotels table columns:', hotelCols.map(c => c.Field).join(', '));
    
    // Flights Table
    const [flightCols] = await mysqlConnection.query('DESCRIBE flights');
    console.log('   Flights table columns:', flightCols.map(c => c.Field).join(', '));
    
    // Cars Table
    const [carCols] = await mysqlConnection.query('DESCRIBE cars');
    console.log('   Cars table columns:', carCols.map(c => c.Field).join(', '));
    
    // Bookings Table
    const [bookingCols] = await mysqlConnection.query('DESCRIBE bookings');
    console.log('   Bookings table columns:', bookingCols.map(c => c.Field).join(', '));
    console.log();

    // ========================================
    // 5. Get MAX IDs
    // ========================================
    console.log('🔢 Current MAX IDs:');
    
    for (const table of ['users', 'hotels', 'cars', 'flights', 'bookings']) {
      const [result] = await mysqlConnection.query(`SELECT MAX(id) as max_id FROM ${table}`);
      const maxId = result[0].max_id || 0;
      console.log(`   ${table.padEnd(15)}: ${maxId}`);
    }
    console.log();

    // ========================================
    // 6. MongoDB Connection Test
    // ========================================
    console.log('🍃 Testing MongoDB Connection...');
    console.log(`   URI: ${MONGODB_URI}`);
    console.log(`   Database: ${MONGODB_DATABASE}`);
    
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    
    const db = mongoClient.db(MONGODB_DATABASE);
    const collections = await db.listCollections().toArray();
    
    console.log('   ✅ MongoDB Connection Successful');
    console.log('   Collections:', collections.map(c => c.name).join(', '));
    
    // Check reviews collection
    const reviewsCollection = db.collection('reviews');
    const reviewCount = await reviewsCollection.countDocuments();
    console.log(`   Reviews count: ${reviewCount.toLocaleString()}`);
    console.log();

    // ========================================
    // 7. Verify Airports Data
    // ========================================
    console.log('✈️  Verifying Airports Data...');
    const [airportCount] = await mysqlConnection.query('SELECT COUNT(*) as count FROM airports');
    console.log(`   Total airports: ${airportCount[0].count}`);
    
    if (airportCount[0].count === 0) {
      console.log('   ⚠️  WARNING: No airports found! Flight seeding will fail.');
      console.log('   Please run airport seeding first.');
    } else {
      const [sampleAirports] = await mysqlConnection.query('SELECT code, city, state FROM airports LIMIT 10');
      console.log('   Sample airports:', sampleAirports.map(a => `${a.code} (${a.city}, ${a.state})`).join(', '));
    }
    console.log();

    // ========================================
    // SUCCESS
    // ========================================
    console.log('='.repeat(80));
    console.log('✅ SETUP VALIDATION COMPLETE - READY FOR SEEDING');
    console.log('='.repeat(80));
    console.log();
    console.log('Next Steps:');
    console.log('1. npm run seed:users     - Seed 10,000 users');
    console.log('2. npm run seed:hotels    - Seed 10,000 hotels');
    console.log('3. npm run seed:cars      - Seed 5,000 cars');
    console.log('4. npm run seed:flights   - Seed 20,000 flights');
    console.log('5. npm run seed:bookings  - Seed 100,000 bookings');
    console.log('6. npm run seed:reviews   - Seed 50,000 reviews');
    console.log();
    console.log('Or run all at once:');
    console.log('npm run seed:all');
    console.log();

  } catch (error) {
    console.error('❌ Setup Validation Failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (mysqlConnection) await mysqlConnection.end();
    if (mongoClient) await mongoClient.close();
  }
}

validateSetup();
