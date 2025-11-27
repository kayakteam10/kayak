const fs = require('fs');
const path = require('path');
const pool = require('./config/database');

async function applyMigration() {
    try {
        console.log('📋 Reading migration file...');
        const sqlPath = path.join(__dirname, 'database/add-seat-selection.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🔄 Applying seat selection migration...');

        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
            await pool.query(statement);
            console.log('✅ Executed statement');
        }

        console.log('✅ Seat selection migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

applyMigration();
