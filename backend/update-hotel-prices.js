const pool = require('./config/database');

const updateHotelPrices = async () => {
  try {
    console.log('Updating hotel prices in price_per_night column...');
    
    // Different prices for different hotels ($50-$100 range)
    const hotelPrices = {
      'Nob Hill Grand Hotel': 95,
      'Golden Gate Suites': 89,
      'Hilton SF': 72,
      'Pacific Haven Hotel': 85,
      'Skyline Suites': 78,
      'Chicago Loop Hotel': 65,
      'Magnificent Mile Plaza': 82,
      'Ocean View Paradise': 92,
      'South Beach Luxury Resort': 98,
      'Miami Downtown Hotel': 68,
      'Manhattan Grand Hotel': 99,
      'Times Square Plaza': 88,
      'Brooklyn Bridge Inn': 75,
      'Hollywood Glamour Hotel': 84,
      'Santa Monica Beach Resort': 94,
      'Beverly Hills Grand': 97,
      'Vegas Strip Resort': 62,
      'Luxor Grand Hotel': 58,
      'Boston Harbor Hotel': 91,
      'Beacon Hill Inn': 73,
      'Disney Resort Hotel': 86,
      'Universal Studios Hotel': 79,
      'Gaslamp Quarter Hotel': 76,
      'La Jolla Cove Resort': 93,
      'Emerald Bay Resort': 87,
      'Seattle Waterfront Inn': 71,
      'Pike Place Hotel': 54
    };

    for (const [hotelName, price] of Object.entries(hotelPrices)) {
      const result = await pool.query(
        'UPDATE hotels SET price_per_night = ?, available_rooms = 15, total_rooms = 50 WHERE hotel_name = ?',
        [price, hotelName]
      );
      
      if (result.affectedRows > 0) {
        console.log(`Updated ${hotelName} to $${price}/night`);
      }
    }

    console.log('\n✅ All hotel prices updated in database!');
    
    // Display sample
    const result = await pool.query(
      'SELECT hotel_name, price_per_night, available_rooms FROM hotels WHERE hotel_name IN (?, ?, ?) ORDER BY hotel_name',
      ['Nob Hill Grand Hotel', 'Skyline Suites', 'Pike Place Hotel']
    );
    
    console.log('\nSample hotels with prices:');
    result.rows.forEach(hotel => {
      console.log(`${hotel.hotel_name}: $${hotel.price_per_night}/night (${hotel.available_rooms} available)`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

updateHotelPrices();
