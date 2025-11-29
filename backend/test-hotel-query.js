const pool = require('./config/database');

async function testHotelQuery() {
  try {
    console.log('Testing hotel query...');
    
    // Test 1: Check if hotels table exists
    const tables = await pool.query('SHOW TABLES');
    console.log('\n✅ Tables in database:', tables.rows.map(r => Object.values(r)[0]));
    
    // Test 2: Get hotel table structure
    const structure = await pool.query('DESCRIBE hotels');
    console.log('\n✅ Hotels table structure:');
    structure.rows.forEach(row => {
      console.log(`  - ${row.Field} (${row.Type})`);
    });
    
    // Test 3: Count hotels
    const count = await pool.query('SELECT COUNT(*) as count FROM hotels');
    console.log(`\n✅ Total hotels in database: ${count.rows[0].count}`);
    
    // Test 4: Get sample hotel
    const sample = await pool.query('SELECT * FROM hotels LIMIT 1');
    console.log('\n✅ Sample hotel:', JSON.stringify(sample.rows[0], null, 2));
    
    // Test 5: Search for San Francisco hotels
    const sfHotels = await pool.query(
      `SELECT * FROM hotels 
       WHERE (LOWER(city) LIKE LOWER(?) OR LOWER(address) LIKE LOWER(?))
       ORDER BY star_rating DESC, user_rating DESC`,
      ['%san francisco%', '%san francisco%']
    );
    console.log(`\n✅ Hotels in San Francisco: ${sfHotels.rows.length}`);
    if (sfHotels.rows.length > 0) {
      console.log('First result:', sfHotels.rows[0].hotel_name);
    }
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testHotelQuery();
