const pool = require('./config/database');

async function checkBillingStructure() {
  try {
    console.log('Checking billing structure...\n');
    
    // Check if billing table exists and its structure
    try {
      const structure = await pool.query('DESCRIBE billing');
      console.log('✅ Billing table structure:');
      structure.rows.forEach(row => {
        console.log(`  - ${row.Field} (${row.Type})`);
      });
    } catch (err) {
      console.log('❌ Billing table does not exist');
    }
    
    // Check payments table structure
    try {
      const payStructure = await pool.query('DESCRIBE payments');
      console.log('\n✅ Payments table structure:');
      payStructure.rows.forEach(row => {
        console.log(`  - ${row.Field} (${row.Type})`);
      });
    } catch (err) {
      console.log('❌ Payments table does not exist');
    }
    
    // Check bookings table structure
    try {
      const bookStructure = await pool.query('DESCRIBE bookings');
      console.log('\n✅ Bookings table structure:');
      bookStructure.rows.forEach(row => {
        console.log(`  - ${row.Field} (${row.Type})`);
      });
    } catch (err) {
      console.log('❌ Bookings table does not exist');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkBillingStructure();
