// Add Detailed Analytics Data to MongoDB
db = db.getSiblingDB('kayak_db');

print('📊 Adding detailed analytics data...\n');

// ========== 1. PAGE CLICK TRACKING ==========
print('🖱️  Adding page click data...');
const pageClicks = [
    // Homepage clicks
    { page: 'homepage', section: 'hero_banner', clicks: 1250, unique_users: 820, timestamp: new Date('2025-12-01') },
    { page: 'homepage', section: 'search_flights', clicks: 980, unique_users: 650, timestamp: new Date('2025-12-01') },
    { page: 'homepage', section: 'search_hotels', clicks: 856, unique_users: 590, timestamp: new Date('2025-12-01') },
    { page: 'homepage', section: 'search_cars', clicks: 645, unique_users: 420, timestamp: new Date('2025-12-01') },
    { page: 'homepage', section: 'featured_deals', clicks: 523, unique_users: 380, timestamp: new Date('2025-12-01') },
    { page: 'homepage', section: 'footer', clicks: 120, unique_users: 95, timestamp: new Date('2025-12-01') },

    // Flight search results page
    { page: 'flight_results', section: 'filter_sidebar', clicks: 1450, unique_users: 680, timestamp: new Date('2025-12-02') },
    { page: 'flight_results', section: 'sort_options', clicks: 890, unique_users: 520, timestamp: new Date('2025-12-02') },
    { page: 'flight_results', section: 'flight_cards', clicks: 2340, unique_users: 780, timestamp: new Date('2025-12-02') },
    { page: 'flight_results', section: 'pagination', clicks: 420, unique_users: 280, timestamp: new Date('2025-12-02') },
    { page: 'flight_results', section: 'map_view', clicks: 180, unique_users: 95, timestamp: new Date('2025-12-02') },

    // Hotel search results page
    { page: 'hotel_results', section: 'filter_sidebar', clicks: 1320, unique_users: 620, timestamp: new Date('2025-12-03') },
    { page: 'hotel_results', section: 'sort_options', clicks: 820, unique_users: 490, timestamp: new Date('2025-12-03') },
    { page: 'hotel_results', section: 'hotel_cards', clicks: 2180, unique_users: 720, timestamp: new Date('2025-12-03') },
    { page: 'hotel_results', section: 'map_view', clicks: 650, unique_users: 380, timestamp: new Date('2025-12-03') },
    { page: 'hotel_results', section: 'reviews_summary', clicks: 420, unique_users: 260, timestamp: new Date('2025-12-03') },

    // Car search results page
    { page: 'car_results', section: 'filter_sidebar', clicks: 890, unique_users: 450, timestamp: new Date('2025-12-04') },
    { page: 'car_results', section: 'car_cards', clicks: 1560, unique_users: 580, timestamp: new Date('2025-12-04') },
    { page: 'car_results', section: 'company_filter', clicks: 520, unique_users: 320, timestamp: new Date('2025-12-04') },
    { page: 'car_results', section: 'price_range', clicks: 380, unique_users: 240, timestamp: new Date('2025-12-04') },

    // Details pages
    { page: 'flight_details', section: 'booking_button', clicks: 890, unique_users: 520, timestamp: new Date('2025-12-05') },
    { page: 'flight_details', section: 'flight_info', clicks: 1240, unique_users: 680, timestamp: new Date('2025-12-05') },
    { page: 'flight_details', section: 'baggage_info', clicks: 450, unique_users: 310, timestamp: new Date('2025-12-05') },
    { page: 'flight_details', section: 'reviews', clicks: 320, unique_users: 210, timestamp: new Date('2025-12-05') },

    { page: 'hotel_details', section: 'booking_button', clicks: 780, unique_users: 480, timestamp: new Date('2025-12-06') },
    { page: 'hotel_details', section: 'photo_gallery', clicks: 1850, unique_users: 690, timestamp: new Date('2025-12-06') },
    { page: 'hotel_details', section: 'amenities', clicks: 920, unique_users: 560, timestamp: new Date('2025-12-06') },
    { page: 'hotel_details', section: 'room_types', clicks: 1120, unique_users: 620, timestamp: new Date('2025-12-06') },
    { page: 'hotel_details', section: 'reviews', clicks: 650, unique_users: 420, timestamp: new Date('2025-12-06') },
    { page: 'hotel_details', section: 'location_map', clicks: 480, unique_users: 320, timestamp: new Date('2025-12-06') },

    { page: 'car_details', section: 'booking_button', clicks: 620, unique_users: 380, timestamp: new Date('2025-12-07') },
    { page: 'car_details', section: 'car_photos', clicks: 980, unique_users: 520, timestamp: new Date('2025-12-07') },
    { page: 'car_details', section: 'specifications', clicks: 720, unique_users: 440, timestamp: new Date('2025-12-07') },
    { page: 'car_details', section: 'insurance_options', clicks: 380, unique_users: 240, timestamp: new Date('2025-12-07') }
];

db.page_clicks.drop();
db.page_clicks.insertMany(pageClicks);
print(`✅ Added ${pageClicks.length} page click records\n`);

// ========== 2. PROPERTY/LISTING CLICK TRACKING ==========
print('🏨 Adding property click data...');
const propertyClicks = [];

// Top 20 hotels by clicks
const topHotels = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 35, 40, 45, 50, 12, 18, 22, 28, 33, 38];
topHotels.forEach((hotelId, index) => {
    propertyClicks.push({
        property_type: 'hotel',
        property_id: hotelId,
        clicks: 850 - (index * 30),
        unique_users: 520 - (index * 20),
        bookings: 45 - (index * 2),
        conversion_rate: ((45 - (index * 2)) / (520 - (index * 20)) * 100).toFixed(2),
        date: new Date('2025-12-07')
    });
});

// Top 20 flights by clicks
const topFlights = [1, 7, 13, 19, 25, 31, 37, 2, 8, 14, 20, 26, 32, 38, 3, 9, 15, 21, 27, 33];
topFlights.forEach((flightId, index) => {
    propertyClicks.push({
        property_type: 'flight',
        property_id: flightId,
        clicks: 920 - (index * 35),
        unique_users: 580 - (index * 22),
        bookings: 52 - (index * 2),
        conversion_rate: ((52 - (index * 2)) / (580 - (index * 22)) * 100).toFixed(2),
        date: new Date('2025-12-07')
    });
});

// Top 20 cars by clicks
const topCars = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 2, 5, 8, 11, 14, 17, 20, 23, 26, 29];
topCars.forEach((carId, index) => {
    propertyClicks.push({
        property_type: 'car',
        property_id: carId,
        clicks: 680 - (index * 25),
        unique_users: 420 - (index * 18),
        bookings: 38 - (index * 1.5),
        conversion_rate: ((38 - (index * 1.5)) / (420 - (index * 18)) * 100).toFixed(2),
        date: new Date('2025-12-07')
    });
});

db.property_clicks.drop();
db.property_clicks.insertMany(propertyClicks);
print(`✅ Added ${propertyClicks.length} property click records\n`);

// ========== 3. SECTION VISIBILITY TRACKING ==========
print('👁️  Adding section visibility data...');
const sectionVisibility = [
    // High visibility sections
    { page: 'homepage', section: 'hero_banner', visibility_score: 98, avg_time_visible: 4.5, scroll_depth: 100 },
    { page: 'homepage', section: 'search_widget', visibility_score: 95, avg_time_visible: 8.2, scroll_depth: 100 },
    { page: 'homepage', section: 'featured_deals', visibility_score: 78, avg_time_visible: 3.1, scroll_depth: 85 },

    // Medium visibility sections
    { page: 'hotel_results', section: 'filter_sidebar', visibility_score: 82, avg_time_visible: 5.6, scroll_depth: 90 },
    { page: 'hotel_results', section: 'hotel_cards', visibility_score: 92, avg_time_visible: 12.4, scroll_depth: 95 },
    { page: 'hotel_results', section: 'map_view', visibility_score: 45, avg_time_visible: 1.8, scroll_depth: 60 },

    // Low visibility sections (LEAST SEEN)
    { page: 'homepage', section: 'footer_links', visibility_score: 15, avg_time_visible: 0.5, scroll_depth: 15 },
    { page: 'homepage', section: 'partner_logos', visibility_score: 22, avg_time_visible: 0.8, scroll_depth: 25 },
    { page: 'flight_results', section: 'sponsore d_ads', visibility_score: 18, avg_time_visible: 0.6, scroll_depth: 20 },
    { page: 'flight_details', section: 'related_flights', visibility_score: 28, avg_time_visible: 1.2, scroll_depth: 30 },
    { page: 'hotel_details', section: 'nearby_attractions', visibility_score: 32, avg_time_visible: 1.4, scroll_depth: 35 },
    { page: 'car_results', section: 'insurance_banner', visibility_score: 20, avg_time_visible: 0.7, scroll_depth: 22 }
];

db.section_visibility.drop();
db.section_visibility.insertMany(sectionVisibility);
print(`✅ Added ${sectionVisibility.length} section visibility records\n`);

// ========== 4. USER COHORT DATA ==========
print('👥 Adding user cohort data...');
const userCohorts = [];

// Users from different cities
const cities = [
    { name: 'San Jose', state: 'CA', users: 245, bookings: 89, avg_spend: 450.00 },
    { name: 'San Francisco', state: 'CA', users: 320, bookings: 125, avg_spend: 520.00 },
    { name: 'New York', state: 'NY', users: 580, bookings: 220, avg_spend: 680.00 },
    { name: 'Los Angeles', state: 'CA', users: 450, bookings: 170, avg_spend: 490.00 },
    { name: 'Chicago', state: 'IL', users: 380, bookings: 145, avg_spend: 520.00 },
    { name: 'Boston', state: 'MA', users: 290, bookings: 110, avg_spend: 560.00 },
    { name: 'Seattle', state: 'WA', users: 310, bookings: 120, avg_spend: 480.00 },
    { name: 'Miami', state: 'FL', users: 270, bookings: 98, avg_spend: 510.00 }
];

cities.forEach(city => {
    userCohorts.push({
        cohort_type: 'location',
        cohort_name: `${city.name}, ${city.state}`,
        city: city.name,
        state: city.state,
        user_count: city.users,
        total_bookings: city.bookings,
        avg_spend_per_user: city.avg_spend,
        created_at: new Date('2025-12-01')
    });
});

// Age cohorts
const ageGroups = [
    { range: '18-24', users: 420, bookings: 145, avg_spend: 320.00 },
    { range: '25-34', users: 890, bookings: 385, avg_spend: 480.00 },
    { range: '35-44', users: 650, bookings: 295, avg_spend: 620.00 },
    { range: '45-54', users: 480, bookings: 225, avg_spend: 720.00 },
    { range: '55+', users: 320, bookings: 180, avg_spend: 850.00 }
];

ageGroups.forEach(age => {
    userCohorts.push({
        cohort_type: 'age',
        cohort_name: age.range,
        user_count: age.users,
        total_bookings: age.bookings,
        avg_spend_per_user: age.avg_spend,
        created_at: new Date('2025-12-01')
    });
});

db.user_cohorts.drop();
db.user_cohorts.insertMany(userCohorts);
print(`✅ Added ${userCohorts.length} user cohort records\n`);

// ========== 5. REVIEW ANALYTICS ==========
print('⭐ Adding review analytics...');
const reviewAnalytics = [];

// Hotel review stats
for (let i = 1; i <= 50; i++) {
    reviewAnalytics.push({
        property_type: 'hotel',
        property_id: i,
        total_reviews: Math.floor(Math.random() * 50) + 10,
        avg_rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
        rating_distribution: {
            5: Math.floor(Math.random() * 30) + 10,
            4: Math.floor(Math.random() * 20) + 5,
            3: Math.floor(Math.random() * 10) + 2,
            2: Math.floor(Math.random() * 5),
            1: Math.floor(Math.random() * 3)
        },
        sentiment_score: (Math.random() * 0.4 + 0.6).toFixed(2), // 0.6 - 1.0
        last_updated: new Date()
    });
}

// Flight review stats
for (let i = 1; i <= 30; i++) {
    reviewAnalytics.push({
        property_type: 'flight',
        property_id: i,
        total_reviews: Math.floor(Math.random() * 80) + 20,
        avg_rating: (Math.random() * 2 + 3).toFixed(1),
        rating_distribution: {
            5: Math.floor(Math.random() * 40) + 15,
            4: Math.floor(Math.random() * 25) + 8,
            3: Math.floor(Math.random() * 15) + 3,
            2: Math.floor(Math.random() * 8),
            1: Math.floor(Math.random() * 5)
        },
        sentiment_score: (Math.random() * 0.3 + 0.7).toFixed(2),
        last_updated: new Date()
    });
}

// Car review stats
for (let i = 1; i <= 30; i++) {
    reviewAnalytics.push({
        property_type: 'car',
        property_id: i,
        total_reviews: Math.floor(Math.random() * 40) + 8,
        avg_rating: (Math.random() * 2 + 3).toFixed(1),
        rating_distribution: {
            5: Math.floor(Math.random() * 20) + 5,
            4: Math.floor(Math.random() * 15) + 3,
            3: Math.floor(Math.random() * 10) + 2,
            2: Math.floor(Math.random() * 5),
            1: Math.floor(Math.random() * 3)
        },
        sentiment_score: (Math.random() * 0.35 + 0.65).toFixed(2),
        last_updated: new Date()
    });
}

db.review_analytics.drop();
db.review_analytics.insertMany(reviewAnalytics);
print(`✅ Added ${reviewAnalytics.length} review analytics records\n`);

// ========== CREATE INDEXES ==========
print('📈 Creating indexes...');
db.page_clicks.createIndex({ page: 1, section: 1 });
db.page_clicks.createIndex({ timestamp: -1 });
db.property_clicks.createIndex({ property_type: 1, property_id: 1 });
db.property_clicks.createIndex({ clicks: -1 });
db.section_visibility.createIndex({ visibility_score: 1 });
db.user_cohorts.createIndex({ cohort_type: 1 });
db.review_analytics.createIndex({ property_type: 1, avg_rating: -1 });

print('✅ All indexes created\n');

// ========== SUMMARY ==========
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('📊 ANALYTICS DATA SUMMARY:\n');
print(`✅ Page Clicks: ${db.page_clicks.countDocuments()} records`);
print(`✅ Property Clicks: ${db.property_clicks.countDocuments()} records`);
print(`✅ Section Visibility: ${db.section_visibility.countDocuments()} records`);
print(`✅ User Cohorts: ${db.user_cohorts.countDocuments()} records`);
print(`✅ Review Analytics: ${db.review_analytics.countDocuments()} records`);
print('\nLeast Seen Sections:');
const leastSeen = db.section_visibility.find().sort({ visibility_score: 1 }).limit(5);
leastSeen.forEach(section => {
    print(`  - ${section.page}/${section.section}: ${section.visibility_score}% visible`);
});
print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
print('🎉 Analytics data ready for admin portal!\n');
