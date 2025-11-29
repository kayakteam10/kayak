const pool = require('./config/database');

async function checkHotelSchema() {
  try {
    const result = await pool.query('DESCRIBE hotels');
    
    console.log('\n📋 Current HOTELS table structure:\n');
    console.log('Field'.padEnd(25) + 'Type'.padEnd(30) + 'Null'.padEnd(8) + 'Default');
    console.log('-'.repeat(80));
    
    result.rows.forEach(row => {
      console.log(
        row.Field.padEnd(25) + 
        row.Type.padEnd(30) + 
        row.Null.padEnd(8) + 
        (row.Default || '')
      );
    });
    
    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkHotelSchema();
