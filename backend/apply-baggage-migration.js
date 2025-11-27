const fs = require('fs');
const path = require('path');
const pool = require('./config/database');

async function applyMigration() {
  try {
    console.log('🚀 Starting baggage migration...');
    
    const sqlPath = path.join(__dirname, 'database', 'add-baggage-fields.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon to get individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await pool.query(statement);
        console.log('✅ Executed:', statement.substring(0, 50) + '...');
      } catch (err) {
        // Ignore "Duplicate column name" errors if we run this multiple times
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠️ Column already exists, skipping...');
        } else {
          console.error('❌ Error executing statement:', err.message);
        }
      }
    }

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
