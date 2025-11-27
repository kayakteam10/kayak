const axios = require('axios');

const API_URL = 'http://localhost:8089';

async function testFlightSearch() {
  console.log('🧪 Testing Flight Search API');
  console.log('='.repeat(60));
  
  const testCases = [
    {
      name: 'One-way: New York to Los Angeles (Dec 20)',
      params: {
        origin: 'New York',
        destination: 'Los Angeles',
        departure_date: '2024-12-20',
        passengers: 1
      }
    },
    {
      name: 'Roundtrip: New York to Los Angeles (Dec 20 → Dec 25)',
      params: {
        origin: 'New York',
        destination: 'Los Angeles',
        departure_date: '2024-12-20',
        return_date: '2024-12-25',
        passengers: 1
      }
    },
    {
      name: 'Roundtrip: New York to Los Angeles (Dec 21 → Dec 25)',
      params: {
        origin: 'New York',
        destination: 'Los Angeles',
        departure_date: '2024-12-21',
        return_date: '2024-12-25',
        passengers: 1
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('   Params:', testCase.params);
    
    try {
      const response = await axios.get(`${API_URL}/api/flights/search`, {
        params: testCase.params
      });
      
      console.log('   ✅ Status:', response.status);
      console.log('   📦 Response structure:', Object.keys(response.data));
      console.log('   ✈️  Flights found:', response.data.flights?.length || 0);
      console.log('   📊 Total:', response.data.total || 0);
      
      if (response.data.flights && response.data.flights.length > 0) {
        console.log('   🎉 SUCCESS - Flights found!');
        const firstFlight = response.data.flights[0];
        console.log('   📝 First flight:', {
          airline: firstFlight.airline,
          flight_number: firstFlight.flight_number,
          route: `${firstFlight.departure_city} → ${firstFlight.arrival_city}`,
          price: firstFlight.price,
          total_price: firstFlight.total_price,
          is_roundtrip: firstFlight.is_roundtrip,
          has_return_flight: !!firstFlight.return_flight
        });
      } else {
        console.log('   ⚠️  WARNING - No flights found!');
        console.log('   Response data:', JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.log('   ❌ ERROR:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Error:', error.response.data);
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠️  Backend server is not running!');
        console.log('   Please start the backend: cd kayak-app/backend && npm start');
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Testing complete!');
}

// Run the test
testFlightSearch().catch(console.error);

