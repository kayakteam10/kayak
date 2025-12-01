const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'kayak_db',
    port: process.env.DB_PORT || 3307
};

const BATCH_SIZE = 1000;
const TOTAL_RECORDS = 10000;
const RECORDS_PER_TYPE = Math.ceil(TOTAL_RECORDS / 3);

async function seedData() {
    const connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to database');

    try {
        await seedAirports(connection);
        await seedFlights(connection);
        await seedHotels(connection);
        await seedCars(connection);
        console.log('🎉 Data seeding completed successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await connection.end();
    }
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedAirports(connection) {
    console.log('🛫 Seeding airports...');
    const airports = [
        ['SFO', 'San Francisco International', 'San Francisco', 'CA', 'USA'],
        ['JFK', 'John F. Kennedy International', 'New York', 'NY', 'USA'],
        ['LHR', 'Heathrow Airport', 'London', 'England', 'UK'],
        ['DXB', 'Dubai International', 'Dubai', 'Dubai', 'UAE'],
        ['SIN', 'Changi Airport', 'Singapore', 'Singapore', 'Singapore'],
        ['HND', 'Haneda Airport', 'Tokyo', 'Tokyo', 'Japan'],
        ['CDG', 'Charles de Gaulle', 'Paris', 'Ile-de-France', 'France'],
        ['AMS', 'Schiphol', 'Amsterdam', 'North Holland', 'Netherlands'],
        ['FRA', 'Frankfurt Airport', 'Frankfurt', 'Hesse', 'Germany'],
        ['LAX', 'Los Angeles International', 'Los Angeles', 'CA', 'USA']
    ];

    for (const airport of airports) {
        await connection.query(
            'INSERT IGNORE INTO airports (code, name, city, state, country) VALUES (?, ?, ?, ?, ?)',
            airport
        );
    }
    console.log('✅ Airports seeded');
}

async function seedFlights(connection) {
    console.log(`✈️  Seeding ${RECORDS_PER_TYPE} flights...`);
    const airports = ['SFO', 'JFK', 'LHR', 'DXB', 'SIN', 'HND', 'CDG', 'AMS', 'FRA', 'LAX'];
    const airlines = ['United', 'Delta', 'Emirates', 'British Airways', 'Lufthansa', 'Air France'];

    // 1. Insert Flights
    let flightValues = [];
    const now = Date.now();
    for (let i = 0; i < RECORDS_PER_TYPE; i++) {
        const origin = getRandomElement(airports);
        let destination = getRandomElement(airports);
        while (destination === origin) destination = getRandomElement(airports);

        const departure = getRandomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
        const arrival = new Date(departure.getTime() + getRandomInt(2, 14) * 60 * 60 * 1000);

        flightValues.push([
            `FL${now}${i}`, // Unique flight number
            getRandomElement(airlines),
            origin,
            destination,
            departure,
            arrival,
            getRandomInt(200, 1500), // price
            100, // available_seats
            100, // total_seats
            'scheduled' // status
        ]);

        if (flightValues.length >= BATCH_SIZE) {
            await connection.query(
                'INSERT IGNORE INTO flights (flight_number, airline, departure_airport, arrival_airport, departure_time, arrival_time, price, available_seats, total_seats, status) VALUES ?',
                [flightValues]
            );
            flightValues = [];
            process.stdout.write('.');
        }
    }
    if (flightValues.length > 0) {
        await connection.query(
            'INSERT IGNORE INTO flights (flight_number, airline, departure_airport, arrival_airport, departure_time, arrival_time, price, available_seats, total_seats, status) VALUES ?',
            [flightValues]
        );
    }
    console.log('\n✅ Flights seeded');

    // 2. Insert Seats (for the first 1000 flights to save time/space, enough for load testing)
    console.log('💺 Seeding seats for flights...');
    const [flights] = await connection.query('SELECT id FROM flights ORDER BY id DESC LIMIT 1000');

    let seatValues = [];
    const seatLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (const flight of flights) {
        for (let row = 1; row <= 10; row++) {
            for (const letter of seatLetters) {
                seatValues.push([
                    flight.id,
                    `${row}${letter}`,
                    row <= 2 ? 'business' : 'economy',
                    true, // is_available
                    row <= 2 ? 1.5 : 1.0 // price_modifier
                ]);
            }
        }

        if (seatValues.length >= BATCH_SIZE) {
            await connection.query(
                'INSERT IGNORE INTO flight_seats (flight_id, seat_number, seat_type, is_available, price_modifier) VALUES ?',
                [seatValues]
            );
            seatValues = [];
        }
    }
    if (seatValues.length > 0) {
        await connection.query(
            'INSERT IGNORE INTO flight_seats (flight_id, seat_number, seat_type, is_available, price_modifier) VALUES ?',
            [seatValues]
        );
    }
    console.log('✅ Flight seats seeded');
}

async function seedHotels(connection) {
    console.log(`🏨 Seeding ${RECORDS_PER_TYPE} hotels...`);
    const cities = ['San Francisco', 'New York', 'London', 'Dubai', 'Singapore', 'Tokyo', 'Paris', 'Amsterdam', 'Berlin', 'Los Angeles'];
    const states = ['CA', 'NY', 'UK', 'UAE', 'SG', 'JP', 'FR', 'NL', 'DE', 'CA'];
    const names = ['Grand', 'Plaza', 'Hyatt', 'Hilton', 'Marriott', 'Sheraton', 'Ritz', 'Four Seasons', 'Intercontinental', 'Westin'];

    let values = [];
    for (let i = 0; i < RECORDS_PER_TYPE; i++) {
        const cityIndex = getRandomInt(0, cities.length - 1);
        const city = cities[cityIndex];
        const state = states[cityIndex];
        const name = `${getRandomElement(names)} ${city} ${i}`; // Ensure unique name if needed

        values.push([
            name,
            city,
            state,
            `${getRandomInt(1, 999)} Main St`,
            `${getRandomInt(10000, 99999)}`, // zip_code
            getRandomInt(3, 5), // rating
            getRandomInt(100, 800), // price
            getRandomInt(0, 50), // available rooms
            JSON.stringify(['wifi', 'pool', 'gym'])
        ]);

        if (values.length >= BATCH_SIZE) {
            await connection.query(
                'INSERT IGNORE INTO hotels (hotel_name, city, state, address, zip_code, star_rating, price_per_night, available_rooms, amenities) VALUES ?',
                [values]
            );
            values = [];
            process.stdout.write('.');
        }
    }
    if (values.length > 0) {
        await connection.query(
            'INSERT IGNORE INTO hotels (hotel_name, city, state, address, zip_code, star_rating, price_per_night, available_rooms, amenities) VALUES ?',
            [values]
        );
    }
    console.log('\n✅ Hotels seeded');
}

async function seedCars(connection) {
    console.log(`🚗 Seeding ${RECORDS_PER_TYPE} cars...`);
    const cities = ['San Francisco', 'New York', 'London', 'Dubai', 'Singapore', 'Tokyo', 'Paris', 'Amsterdam', 'Berlin', 'Los Angeles'];
    const companies = ['Hertz', 'Avis', 'Enterprise', 'Budget', 'Sixt'];
    const models = ['Toyota Camry', 'Honda Accord', 'Ford Mustang', 'Tesla Model 3', 'BMW 3 Series', 'Audi A4', 'Mercedes C-Class'];
    const types = ['economy', 'compact', 'suv', 'luxury'];

    let values = [];
    for (let i = 0; i < RECORDS_PER_TYPE; i++) {
        values.push([
            getRandomElement(models),
            getRandomElement(types),
            getRandomElement(companies),
            2023, // year
            4, // num_seats
            getRandomElement(cities),
            getRandomInt(50, 300), // price
            'available' // status
        ]);

        if (values.length >= BATCH_SIZE) {
            await connection.query(
                'INSERT IGNORE INTO cars (model, car_type, company, year, num_seats, location_city, daily_rental_price, status) VALUES ?',
                [values]
            );
            values = [];
            process.stdout.write('.');
        }
    }
    if (values.length > 0) {
        await connection.query(
            'INSERT IGNORE INTO cars (model, car_type, company, year, num_seats, location_city, daily_rental_price, status) VALUES ?',
            [values]
        );
    }
    console.log('\n✅ Cars seeded');
}

seedData();
