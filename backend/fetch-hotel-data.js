const pool = require('./config/database');

async function fetchHotels() {
  try {
    const results = await pool.query(`
      SELECT id, hotel_name, address, city, state, zip_code, star_rating, 
             user_rating, amenities, description, price_per_night, 
             available_rooms, total_rooms, free_cancellation, free_breakfast, 
             discount_percentage, image_url, location, review_count 
      FROM hotels 
      ORDER BY id 
      LIMIT 50
    `);
    
    console.log(JSON.stringify(results, null, 2));
    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fetchHotels();
