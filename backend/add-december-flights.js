const mysql = require('mysql2/promise');
require('dotenv').config();

async function addDecemberFlights() {
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
    console.log('🚀 Adding December 2025 flights...');

    const flights = [];
    const airlines = ['American', 'Delta', 'United', 'JetBlue', 'Southwest'];
    const routes = [
      { from: 'SFO', to: 'JFK', duration: 330, price: 350 },
      { from: 'SFO', to: 'LAX', duration: 90, price: 150 },
      { from: 'SFO', to: 'ORD', duration: 240, price: 280 },
      { from: 'SFO', to: 'SEA', duration: 120, price: 120 },
      { from: 'JFK', to: 'SFO', duration: 360, price: 380 },
      { from: 'JFK', to: 'LAX', duration: 330, price: 320 },
      { from: 'JFK', to: 'ORD', duration: 150, price: 180 },
      { from: 'JFK', to: 'MIA', duration: 180, price: 220 },
      { from: 'LAX', to: 'JFK', duration: 330, price: 340 },
      { from: 'LAX', to: 'SFO', duration: 90, price: 140 },
      { from: 'LAX', to: 'SEA', duration: 150, price: 160 },
      { from: 'ORD', to: 'SFO', duration: 240, price: 270 },
      { from: 'ORD', to: 'JFK', duration: 150, price: 190 },
      { from: 'ORD', to: 'LAX', duration: 240, price: 250 },
      { from: 'SEA', to: 'SFO', duration: 120, price: 110 },
      { from: 'SEA', to: 'LAX', duration: 150, price: 150 },
    ];

    // Generate flights for December 1-31, 2025
    for (let day = 1; day <= 31; day++) {
      for (const route of routes) {
        // Generate 3-5 flights per day per route
        const numFlights = Math.floor(Math.random() * 3) + 3;
        
        for (let i = 0; i < numFlights; i++) {
          const airline = airlines[Math.floor(Math.random() * airlines.length)];
          const hour = 6 + (i * 4); // Spread throughout the day
          const minute = Math.floor(Math.random() * 60);
          const priceVariation = (Math.random() - 0.5) * 100; // ±$50
          const actualPrice = Math.max(50, route.price + priceVariation);
          
          const departureTime = `2025-12-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          
          // Calculate arrival time
          const depDate = new Date(departureTime);
          depDate.setMinutes(depDate.getMinutes() + route.duration);
          const arrivalTime = depDate.toISOString().slice(0, 19).replace('T', ' ');
          
          const flightNumber = `${airline.slice(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`;
          
          flights.push(`
            ('${flightNumber}', '${airline}', '${route.from}', '${route.to}', 
             '${departureTime}', '${arrivalTime}', ${route.duration}, ${actualPrice.toFixed(2)}, 
             ${Math.floor(Math.random() * 50) + 50}, 180, 'scheduled', 4.20, NULL, 0, 30, '1 carry-on, 1 checked bag')
          `);
        }
      }
    }

    // Insert in batches to avoid query size limits
    const batchSize = 50;
    for (let i = 0; i < flights.length; i += batchSize) {
      const batch = flights.slice(i, i + batchSize);
      const sql = `
        INSERT INTO flights 
        (flight_number, airline, departure_airport, arrival_airport, departure_time, arrival_time, 
         duration, price, available_seats, total_seats, status, average_rating, seat_configuration, 
         carry_on_fee, checked_bag_fee, baggage_allowance)
        VALUES ${batch.join(',')}
        ON DUPLICATE KEY UPDATE price = VALUES(price)
      `;
      
      await connection.query(sql);
      console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} flights)`);
    }

    console.log(`✅ Added ${flights.length} flights for December 2025!`);
    
    // Verify
    const [count] = await connection.query('SELECT COUNT(*) as total FROM flights WHERE MONTH(departure_time) = 12 AND YEAR(departure_time) = 2025');
    console.log(`📊 Total December 2025 flights in database: ${count[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

addDecemberFlights();
