const pool = require('./config/database');

async function checkFlights() {
    try {
        const result = await pool.query("SELECT * FROM flights WHERE departure_city = 'Los Angeles' AND arrival_city = 'Seattle' LIMIT 5");
        console.log('Available flights:', JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkFlights();
