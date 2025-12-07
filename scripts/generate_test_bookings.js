const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'root123',
    database: 'kayak_db'
};

// Random data generators
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'William', 'Jessica', 
    'James', 'Mary', 'Christopher', 'Patricia', 'Daniel', 'Jennifer', 'Matthew', 'Linda', 'Anthony', 'Barbara',
    'Mark', 'Elizabeth', 'Donald', 'Susan', 'Steven', 'Karen', 'Paul', 'Nancy', 'Andrew', 'Betty',
    'Joshua', 'Margaret', 'Kenneth', 'Sandra', 'Kevin', 'Ashley', 'Brian', 'Kimberly', 'George', 'Emily',
    'Edward', 'Donna', 'Ronald', 'Michelle', 'Timothy', 'Carol', 'Jason', 'Amanda', 'Jeffrey', 'Melissa'];

const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];

const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 
    'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco',
    'Indianapolis', 'Seattle', 'Denver', 'Boston', 'Nashville', 'Detroit', 'Portland', 'Las Vegas', 'Miami'];

const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'FL', 'OH', 'NC', 'WA', 'CO', 'MA', 'TN', 'MI', 'OR', 'NV'];

const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm St', 'Park Ave', 'Washington Blvd',
    'Lake Dr', 'Hill St', 'River Rd', 'Forest Ave', 'Sunset Blvd', 'Beach St', 'Mountain View'];

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSSN() {
    const area = getRandomNumber(100, 999);
    const group = getRandomNumber(10, 99);
    const serial = getRandomNumber(1000, 9999);
    return `${area}-${group}-${serial}`;
}

function generatePhone() {
    const area = getRandomNumber(200, 999);
    const prefix = getRandomNumber(200, 999);
    const line = getRandomNumber(1000, 9999);
    return `${area}-${prefix}-${line}`;
}

function generateZipCode() {
    return getRandomNumber(10000, 99999).toString();
}

function generateEmail(firstName, lastName, index) {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'email.com'];
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${getRandomElement(domains)}`;
}

function generateBookingReference() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BKG-${timestamp}-${random}`;
}

function getRandomDate(daysBack = 30) {
    const date = new Date();
    date.setDate(date.getDate() - getRandomNumber(0, daysBack));
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function getBookingAmount(type) {
    if (type === 'flight') return getRandomNumber(100, 800);
    if (type === 'hotel') return getRandomNumber(150, 600);
    if (type === 'car') return getRandomNumber(50, 300);
    return 100;
}

async function main() {
    let connection;
    
    try {
        console.log('🔌 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database\n');

        // Get existing flight, hotel, car IDs
        const [flights] = await connection.execute('SELECT id FROM flights');
        const [hotels] = await connection.execute('SELECT id FROM hotels');
        const [cars] = await connection.execute('SELECT id FROM cars');

        const flightIds = flights.map(f => f.id);
        const hotelIds = hotels.map(h => h.id);
        const carIds = cars.map(c => c.id);

        console.log(`📊 Available inventory:`);
        console.log(`   Flights: ${flightIds.length}`);
        console.log(`   Hotels: ${hotelIds.length}`);
        console.log(`   Cars: ${carIds.length}\n`);

        // Generate 100 users
        console.log('👥 Creating 100 test users...');
        const userIds = [];
        
        for (let i = 1; i <= 100; i++) {
            const firstName = getRandomElement(firstNames);
            const lastName = getRandomElement(lastNames);
            const email = generateEmail(firstName, lastName, i);
            const passwordHash = '$2b$10$YourHashedPasswordHere'; // Hashed "password123"
            const ssn = generateSSN();
            const phone = generatePhone();
            const address = `${getRandomNumber(100, 9999)} ${getRandomElement(streets)}`;
            const city = getRandomElement(cities);
            const state = getRandomElement(states);
            const zipCode = generateZipCode();

            const [result] = await connection.execute(
                `INSERT INTO users (first_name, last_name, email, password_hash, ssn, phone_number, address, city, state, zip_code, role)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')`,
                [firstName, lastName, email, passwordHash, ssn, phone, address, city, state, zipCode]
            );
            
            userIds.push(result.insertId);
            
            if (i % 20 === 0) {
                console.log(`   Created ${i} users...`);
            }
        }
        
        console.log(`✅ Created 100 users (IDs: ${userIds[0]} - ${userIds[userIds.length - 1]})\n`);

        // Generate bookings (distributed across flight, hotel, car)
        console.log('📝 Creating test bookings...');
        
        let flightBookings = 0;
        let hotelBookings = 0;
        let carBookings = 0;

        for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            
            // Randomly decide booking type (40% flight, 35% hotel, 25% car)
            const rand = Math.random();
            let bookingType;
            let bookingDetails;
            let amount;

            if (rand < 0.40 && flightIds.length > 0) {
                // Flight booking
                bookingType = 'flight';
                const flightId = getRandomElement(flightIds);
                bookingDetails = JSON.stringify({
                    flight_id: flightId,
                    passengers: 1,
                    seat_class: getRandomElement(['economy', 'business', 'first'])
                });
                amount = getBookingAmount('flight');
                flightBookings++;
            } else if (rand < 0.75 && hotelIds.length > 0) {
                // Hotel booking
                bookingType = 'hotel';
                const hotelId = getRandomElement(hotelIds);
                bookingDetails = JSON.stringify({
                    hotel_id: hotelId,
                    check_in: '2025-12-20',
                    check_out: '2025-12-23',
                    rooms: 1,
                    guests: getRandomNumber(1, 4)
                });
                amount = getBookingAmount('hotel');
                hotelBookings++;
            } else if (carIds.length > 0) {
                // Car booking
                bookingType = 'car';
                const carId = getRandomElement(carIds);
                bookingDetails = JSON.stringify({
                    car_id: carId,
                    pickup_date: '2025-12-15',
                    dropoff_date: '2025-12-18',
                    pickup_location: getRandomElement(cities)
                });
                amount = getBookingAmount('car');
                carBookings++;
            } else {
                continue; // Skip if no inventory
            }

            const bookingRef = generateBookingReference();
            const status = Math.random() > 0.1 ? 'confirmed' : 'pending'; // 90% confirmed, 10% pending
            const bookingDate = getRandomDate(30);

            await connection.execute(
                `INSERT INTO bookings (user_id, booking_reference, booking_type, booking_details, total_amount, status, booking_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, bookingRef, bookingType, bookingDetails, amount, status, bookingDate]
            );

            if ((i + 1) % 25 === 0) {
                console.log(`   Created ${i + 1} bookings...`);
            }
        }

        console.log(`\n✅ Booking creation complete!\n`);
        console.log('📊 Summary:');
        console.log(`   Total Users Created: 100`);
        console.log(`   Total Bookings: ${flightBookings + hotelBookings + carBookings}`);
        console.log(`   ✈️  Flight Bookings: ${flightBookings}`);
        console.log(`   🏨 Hotel Bookings: ${hotelBookings}`);
        console.log(`   🚗 Car Bookings: ${carBookings}`);
        
        // Calculate total revenue
        const [revenueResult] = await connection.execute(
            `SELECT SUM(total_amount) as total FROM bookings WHERE status = 'confirmed'`
        );
        const totalRevenue = revenueResult[0].total || 0;
        
        console.log(`   💰 Total Revenue (Confirmed): $${parseFloat(totalRevenue).toFixed(2)}\n`);
        
        console.log('🎉 Test data generation complete!');
        console.log('📊 Go to your admin dashboard to see the results!');
        console.log('🌐 http://localhost:8088/admin\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

main();
