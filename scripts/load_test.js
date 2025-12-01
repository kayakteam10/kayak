const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG_NAME = process.argv[2] || 'default';
const NUM_USERS = 100;
const DURATION_MS = 60000; // 60 seconds
const BASE_URL = 'http://localhost:8000/api';

// Test Data
const AIRPORTS = ['SFO', 'JFK', 'LHR', 'DXB', 'SIN', 'HND', 'CDG', 'AMS', 'FRA', 'LAX'];
const CITIES = ['San Francisco', 'New York', 'London', 'Dubai', 'Singapore', 'Tokyo', 'Paris', 'Amsterdam', 'Berlin', 'Los Angeles'];

// Stats
const stats = {
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    latencies: [],
    errors: {},
    startTime: 0,
    endTime: 0
};

// Utilities
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class User {
    constructor(id) {
        this.id = id;
    }

    async run(endTime) {
        while (Date.now() < endTime) {
            const action = Math.random();
            const startTime = Date.now();
            let success = false;

            try {
                if (action < 0.3) {
                    await this.searchFlights();
                } else if (action < 0.6) {
                    await this.searchHotels();
                } else if (action < 0.9) {
                    await this.searchCars();
                } else {
                    // 10% chance to book (simulated by just hitting the booking endpoint with dummy data if possible, 
                    // or doing a full flow. Full flow is better but harder. 
                    // Let's do a search then book flow for realism)
                    await this.bookFlightFlow();
                }
                success = true;
            } catch (error) {
                // console.error(`User ${this.id} error:`, error.message);
                const errorMsg = error.message;
                stats.errors[errorMsg] = (stats.errors[errorMsg] || 0) + 1;
            }

            const latency = Date.now() - startTime;
            stats.latencies.push(latency);
            stats.totalRequests++;
            if (success) stats.successRequests++;
            else stats.failedRequests++;

            // Small think time between actions
            await sleep(Math.random() * 100);
        }
    }

    async searchFlights() {
        const from = getRandomElement(AIRPORTS);
        let to = getRandomElement(AIRPORTS);
        while (to === from) to = getRandomElement(AIRPORTS);

        await axios.get(`${BASE_URL}/flights/search`, {
            params: { from, to, date: '2025-01-01' }
        });
    }

    async searchHotels() {
        const city = getRandomElement(CITIES);
        await axios.get(`${BASE_URL}/hotels/search`, {
            params: { city }
        });
    }

    async searchCars() {
        const location = getRandomElement(CITIES);
        await axios.get(`${BASE_URL}/cars/search`, {
            params: { location }
        });
    }

    async bookFlightFlow() {
        // 1. Search to get a flight
        const from = getRandomElement(AIRPORTS);
        let to = getRandomElement(AIRPORTS);
        while (to === from) to = getRandomElement(AIRPORTS);

        const searchRes = await axios.get(`${BASE_URL}/flights/search`, {
            params: { from, to, date: '2025-01-01' }
        });

        if (searchRes.data && searchRes.data.length > 0) {
            const flight = searchRes.data[0];
            // 2. Book it
            await axios.post(`${BASE_URL}/bookings`, {
                userId: 1, // Dummy user ID
                bookingType: 'flight',
                details: {
                    flightId: flight.id,
                    flightNumber: flight.flight_number,
                    price: flight.price
                },
                totalAmount: flight.price,
                paymentMethod: 'credit_card'
            });
        }
    }
}

async function main() {
    console.log(`🚀 Starting Load Test: ${CONFIG_NAME}`);
    console.log(`👥 Users: ${NUM_USERS}`);
    console.log(`⏱️  Duration: ${DURATION_MS / 1000}s`);

    // Create results directory
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir);
    }

    stats.startTime = Date.now();
    const endTime = stats.startTime + DURATION_MS;

    const users = Array.from({ length: NUM_USERS }, (_, i) => new User(i));

    // Start all users
    await Promise.all(users.map(u => u.run(endTime)));

    stats.endTime = Date.now();
    const totalTimeSeconds = (stats.endTime - stats.startTime) / 1000;

    // Calculate metrics
    const sortedLatencies = stats.latencies.sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.50)] || 0;
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;
    const avgLatency = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length || 0;
    const throughput = stats.successRequests / totalTimeSeconds;

    const results = {
        config: CONFIG_NAME,
        timestamp: new Date().toISOString(),
        metrics: {
            totalRequests: stats.totalRequests,
            successRequests: stats.successRequests,
            failedRequests: stats.failedRequests,
            throughputRPS: throughput.toFixed(2),
            avgLatencyMs: avgLatency.toFixed(2),
            p50LatencyMs: p50,
            p95LatencyMs: p95,
            p99LatencyMs: p99,
            errorRate: (stats.failedRequests / stats.totalRequests * 100).toFixed(2) + '%'
        },
        errors: stats.errors
    };

    console.log('\n📊 Results:');
    console.log(JSON.stringify(results.metrics, null, 2));

    const outputFile = path.join(resultsDir, `benchmark_${CONFIG_NAME}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n✅ Results saved to ${outputFile}`);
}

main().catch(console.error);
