// Add Activity Logs for the 30 New Bookings
db = db.getSiblingDB('kayak_db');

print('📊 Adding activity logs for 30 new bookings...\n');

const newLogs = [];
const now = new Date();

// Add booking_created logs for all 30 bookings
for (let i = 1; i <= 10; i++) {
    // Flight bookings
    newLogs.push({
        user_id: i,
        activity_type: 'booking_created',
        timestamp: new Date(now.getTime() - (30 - i) * 60000), // Stagger times
        booking_type: 'flight',
        booking_reference: `FLT-${String(i).padStart(3, '0')}`,
        amount: [320, 850, 275, 450, 380, 950, 520, 420, 600, 125][i - 1],
        session_id: `sess_flight_${i}`,
        ip_address: `192.168.1.${100 + i}`,
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        location: {
            city: ['San Francisco', 'New York', 'Chicago', 'Los Angeles', 'Boston', 'New York', 'Los Angeles', 'Miami', 'Denver', 'Seattle'][i - 1],
            country: 'USA'
        },
        details: {
            flight_number: ['AA101', 'DL401', 'UA201', 'WN501', 'B6701', 'AA102', 'DL402', 'UA202', 'NK1001', 'AS301'][i - 1],
            from: ['SFO', 'JFK', 'ORD', 'LAX', 'BOS', 'JFK', 'LAX', 'MIA', 'LAS', 'SEA'][i - 1],
            to: ['JFK', 'LAX', 'MIA', 'LAS', 'FLL', 'SFO', 'JFK', 'ORD', 'DEN', 'PDX'][i - 1]
        }
    });

    // Hotel bookings
    newLogs.push({
        user_id: i,
        activity_type: 'booking_created',
        timestamp: new Date(now.getTime() - (20 - i) * 60000),
        booking_type: 'hotel',
        booking_reference: `HTL-${String(i).padStart(3, '0')}`,
        amount: [216, 600, 450, 520, 750, 640, 690, 1200, 480, 390][i - 1],
        session_id: `sess_hotel_${i}`,
        ip_address: `192.168.1.${110 + i}`,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        location: {
            city: ['San Francisco', 'New York', 'Chicago', 'Miami', 'Las Vegas', 'Boston', 'Los Angeles', 'New York', 'Seattle', 'San Francisco'][i - 1],
            country: 'USA'
        },
        details: {
            hotel_name: ['Hilton SF', 'Marriott NY', 'Hyatt Chicago', 'Sheraton Miami', 'Bellagio Las Vegas', 'Four Seasons Boston', 'Ritz Carlton LA', 'Waldorf Astoria', 'Grand Hyatt Seattle', 'Fairmont SF'][i - 1],
            nights: [3, 3, 3, 4, 3, 4, 3, 4, 4, 3][i - 1]
        }
    });

    // Car bookings
    newLogs.push({
        user_id: i,
        activity_type: 'booking_created',
        timestamp: new Date(now.getTime() - (10 - i) * 60000),
        booking_type: 'car',
        booking_reference: `CAR-${String(i).padStart(3, '0')}`,
        amount: [165, 300, 180, 200, 270, 320, 360, 160, 480, 240][i - 1],
        session_id: `sess_car_${i}`,
        ip_address: `192.168.1.${120 + i}`,
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        location: {
            city: ['San Francisco', 'New York', 'Chicago', 'Miami', 'Las Vegas', 'Boston', 'Los Angeles', 'Seattle', 'Miami', 'Denver'][i - 1],
            country: 'USA'
        },
        details: {
            company: ['Hertz', 'Enterprise', 'Avis', 'Budget', 'Dollar', 'Alamo', 'National', 'Thrifty', 'Sixt', 'Payless'][i - 1],
            model: ['Toyota Camry', 'BMW 3 Series', 'Honda CR-V', 'Nissan Altima', 'Ford Mustang', 'Chevy Tahoe', 'Tesla Model 3', 'Honda Civic', 'Mercedes E-Class', 'Jeep Wrangler'][i - 1],
            days: [3, 3, 3, 4, 3, 4, 3, 4, 4, 3][i - 1]
        }
    });
}

db.activity_logs.insertMany(newLogs);

print(`✅ Added ${newLogs.length} activity logs for bookings\n`);

// Also add corresponding search history for these bookings
const searchHistory = [];
for (let i = 1; i <= 10; i++) {
    // Flight searches
    searchHistory.push({
        user_id: i,
        search_type: 'flight',
        timestamp: new Date(now.getTime() - (35 - i) * 60000),
        params: {
            from: ['SFO', 'JFK', 'ORD', 'LAX', 'BOS', 'JFK', 'LAX', 'MIA', 'LAS', 'SEA'][i - 1],
            to: ['JFK', 'LAX', 'MIA', 'LAS', 'FLL', 'SFO', 'JFK', 'ORD', 'DEN', 'PDX'][i - 1],
            departure_date: '2025-12-10',
            passengers: 1,
            cabin_class: 'economy'
        },
        results_count: 20 + i,
        booked: true,
        session_id: `sess_flight_${i}`
    });

    // Hotel searches
    searchHistory.push({
        user_id: i,
        search_type: 'hotel',
        timestamp: new Date(now.getTime() - (25 - i) * 60000),
        params: {
            city: ['San Francisco', 'New York', 'Chicago', 'Miami', 'Las Vegas', 'Boston', 'Los Angeles', 'New York', 'Seattle', 'San Francisco'][i - 1],
            checkin: '2025-12-10',
            checkout: '2025-12-13',
            guests: 2,
            rooms: 1
        },
        results_count: 30 + i,
        booked: true,
        session_id: `sess_hotel_${i}`
    });

    // Car searches
    searchHistory.push({
        user_id: i,
        search_type: 'car',
        timestamp: new Date(now.getTime() - (15 - i) * 60000),
        params: {
            location: ['San Francisco', 'New York', 'Chicago', 'Miami', 'Las Vegas', 'Boston', 'Los Angeles', 'Seattle', 'Miami', 'Denver'][i - 1],
            pickup_date: '2025-12-10',
            dropoff_date: '2025-12-13',
            car_type: 'any'
        },
        results_count: 15 + i,
        booked: true,
        session_id: `sess_car_${i}`
    });
}

db.search_history.insertMany(searchHistory);

print(`✅ Added ${searchHistory.length} search history entries\n`);

// Summary
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('📊 MONGODB LOGS SUMMARY:\n');
print(`Total Activity Logs: ${db.activity_logs.countDocuments()}`);
print(`  - Booking Created: ${db.activity_logs.countDocuments({ activity_type: 'booking_created' })}`);
print(`  - Login: ${db.activity_logs.countDocuments({ activity_type: 'login' })}`);
print(`  - Search: ${db.activity_logs.countDocuments({ activity_type: 'search' })}`);
print(`\nTotal Search History: ${db.search_history.countDocuments()}`);
print(`  - Booked: ${db.search_history.countDocuments({ booked: true })}`);
print(`  - Not Booked: ${db.search_history.countDocuments({ booked: false })}`);
print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
print('🎉 Booking logs successfully added to MongoDB!\n');
