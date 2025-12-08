/**
 * MongoDB Initialization Script - Complete Database Setup
 * Creates all collections with sample data for Kayak application
 */

// Connect to the kayak_db database
db = db.getSiblingDB('kayak_db');

print('🚀 Initializing MongoDB Collections...\n');

// ========== 1. REVIEWS COLLECTION ==========
print('📝 Creating Reviews Collection...');
db.reviews.drop();
db.reviews.insertMany([
    // Hotel Reviews
    {
        entity_type: 'hotel',
        entity_id: 1,
        user_id: 2,
        rating: 4.5,
        title: 'Great stay in San Francisco!',
        review_text: 'The Hilton SF exceeded my expectations. Clean rooms, friendly staff, and excellent location near downtown. The pool area was beautiful and well-maintained.',
        pros: ['Great location', 'Clean rooms', 'Friendly staff', 'Nice pool'],
        cons: ['Parking was expensive'],
        stay_date: new Date('2025-11-15'),
        created_at: new Date('2025-11-20'),
        helpful_count: 12,
        verified_booking: true,
        photos: ['hotel_1_room_1.jpg', 'hotel_1_pool.jpg']
    },
    {
        entity_type: 'hotel',
        entity_id: 2,
        user_id: 3,
        rating: 5.0,
        title: 'Luxury at its finest',
        review_text: 'Marriott NY is truly a 5-star experience. The spa services were amazing, and the rooftop bar had stunning city views. Worth every penny!',
        pros: ['Excellent spa', 'Amazing views', 'Top-notch service', 'Comfortable beds'],
        cons: [],
        stay_date: new Date('2025-11-10'),
        created_at: new Date('2025-11-18'),
        helpful_count: 25,
        verified_booking: true,
        photos: ['hotel_2_view.jpg']
    },
    {
        entity_type: 'hotel',
        entity_id: 3,
        user_id: 5,
        rating: 3.5,
        title: 'Decent but not exceptional',
        review_text: 'Hyatt Chicago was okay. Room was clean but a bit dated. Location is good but parking situation could be better.',
        pros: ['Good location', 'Clean'],
        cons: ['Dated furniture', 'Limited parking'],
        stay_date: new Date('2025-11-05'),
        created_at: new Date('2025-11-10'),
        helpful_count: 8,
        verified_booking: true
    },

    // Flight Reviews
    {
        entity_type: 'flight',
        entity_id: 1,
        user_id: 4,
        rating: 4.0,
        title: 'Smooth flight experience',
        review_text: 'American Airlines AA101 was great! On-time departure and arrival. Cabin crew was professional and courteous. Entertainment system worked well.',
        pros: ['On-time', 'Professional crew', 'Good entertainment'],
        cons: ['Legroom could be better'],
        flight_date: new Date('2025-12-10'),
        created_at: new Date('2025-12-11'),
        helpful_count: 15,
        verified_booking: true
    },
    {
        entity_type: 'flight',
        entity_id: 7,
        user_id: 6,
        rating: 5.0,
        title: 'Best flight I\'ve had!',
        review_text: 'Delta DL401 JFK to LAX was phenomenal. Spacious seats, excellent food service, and super friendly staff. Flight was smooth and arrived early!',
        pros: ['Comfortable seats', 'Great food', 'Early arrival', 'Excellent service'],
        cons: [],
        flight_date: new Date('2025-12-12'),
        created_at: new Date('2025-12-13'),
        helpful_count: 32,
        verified_booking: true
    },
    {
        entity_type: 'flight',
        entity_id: 19,
        user_id: 8,
        rating: 2.5,
        title: 'Budget airline experience',
        review_text: 'Spirit NK1001 was what you\'d expect from a budget carrier. No frills, cramped seats, but got me there. You get what you pay for.',
        pros: ['Cheap price'],
        cons: ['Cramped seats', 'No complimentary snacks', 'Extra fees for everything'],
        flight_date: new Date('2025-12-10'),
        created_at: new Date('2025-12-11'),
        helpful_count: 18,
        verified_booking: true
    },

    // Car Reviews
    {
        entity_type: 'car',
        entity_id: 1,
        user_id: 7,
        rating: 4.5,
        title: 'Reliable and comfortable',
        review_text: 'Hertz Toyota Camry was in excellent condition. Clean, comfortable, and great gas mileage. Pickup and drop-off process was smooth.',
        pros: ['Clean car', 'Good fuel economy', 'Smooth process', 'Latest model'],
        cons: ['GPS was a bit outdated'],
        rental_date: new Date('2025-11-25'),
        created_at: new Date('2025-11-30'),
        helpful_count: 10,
        verified_booking: true
    },
    {
        entity_type: 'car',
        entity_id: 4,
        user_id: 9,
        rating: 5.0,
        title: 'Luxury car, luxury experience',
        review_text: 'Enterprise BMW 3 Series was amazing! The car was pristine, drives like a dream. Perfect for a business trip. Highly recommend!',
        pros: ['Pristine condition', 'Luxury features', 'Excellent performance', 'Professional service'],
        cons: [],
        rental_date: new Date('2025-11-20'),
        created_at: new Date('2025-11-27'),
        helpful_count: 22,
        verified_booking: true
    },
    {
        entity_type: 'car',
        entity_id: 31,
        user_id: 10,
        rating: 4.0,
        title: 'Fun convertible for LA roads',
        review_text: 'Hertz Chevy Camaro convertible was a blast to drive in Los Angeles! Great car for the sunny weather. Just wish fuel economy was better.',
        pros: ['Fun to drive', 'Perfect for sunny weather', 'Turns heads'],
        cons: ['Poor fuel economy', 'Trunk space limited'],
        rental_date: new Date('2025-11-18'),
        created_at: new Date('2025-11-25'),
        helpful_count: 14,
        verified_booking: true
    }
]);
print(`✅ Created ${db.reviews.countDocuments()} reviews\n`);

// ========== 2. IMAGES COLLECTION ==========
print('🖼️  Creating Images Collection...');
db.images.drop();
db.images.insertMany([
    // Hotel Images
    {
        entity_type: 'hotel',
        entity_id: 1,
        image_type: 'room',
        url: 'https://images.kayak.com/hotels/hilton-sf-room-1.jpg',
        thumbnail_url: 'https://images.kayak.com/hotels/thumbs/hilton-sf-room-1.jpg',
        caption: 'Deluxe King Room with City View',
        width: 1920,
        height: 1080,
        file_size: 245678,
        format: 'jpg',
        uploaded_by: 'admin',
        uploaded_at: new Date('2025-10-01'),
        is_primary: true,
        tags: ['room', 'king', 'city-view', 'modern']
    },
    {
        entity_type: 'hotel',
        entity_id: 1,
        image_type: 'amenity',
        url: 'https://images.kayak.com/hotels/hilton-sf-pool.jpg',
        thumbnail_url: 'https://images.kayak.com/hotels/thumbs/hilton-sf-pool.jpg',
        caption: 'Rooftop Pool Area',
        width: 1920,
        height: 1080,
        file_size: 312456,
        format: 'jpg',
        uploaded_by: 'admin',
        uploaded_at: new Date('2025-10-01'),
        is_primary: false,
        tags: ['pool', 'rooftop', 'amenity']
    },
    {
        entity_type: 'hotel',
        entity_id: 2,
        image_type: 'room',
        url: 'https://images.kayak.com/hotels/marriott-ny-suite.jpg',
        thumbnail_url: 'https://images.kayak.com/hotels/thumbs/marriott-ny-suite.jpg',
        caption: 'Presidential Suite',
        width: 2048,
        height: 1536,
        file_size: 456789,
        format: 'jpg',
        uploaded_by: 'admin',
        uploaded_at: new Date('2025-10-02'),
        is_primary: true,
        tags: ['suite', 'luxury', 'spacious']
    },

    // Car Images
    {
        entity_type: 'car',
        entity_id: 1,
        image_type: 'exterior',
        url: 'https://images.kayak.com/cars/toyota-camry-2024.jpg',
        thumbnail_url: 'https://images.kayak.com/cars/thumbs/toyota-camry-2024.jpg',
        caption: '2024 Toyota Camry - Exterior',
        width: 1920,
        height: 1080,
        file_size: 234567,
        format: 'jpg',
        uploaded_by: 'hertz_admin',
        uploaded_at: new Date('2025-09-15'),
        is_primary: true,
        tags: ['sedan', 'toyota', 'camry', 'exterior']
    },
    {
        entity_type: 'car',
        entity_id: 1,
        image_type: 'interior',
        url: 'https://images.kayak.com/cars/toyota-camry-interior.jpg',
        thumbnail_url: 'https://images.kayak.com/cars/thumbs/toyota-camry-interior.jpg',
        caption: 'Interior Dashboard and Seats',
        width: 1920,
        height: 1080,
        file_size: 198765,
        format: 'jpg',
        uploaded_by: 'hertz_admin',
        uploaded_at: new Date('2025-09-15'),
        is_primary: false,
        tags: ['sedan', 'interior', 'dashboard']
    },
    {
        entity_type: 'car',
        entity_id: 4,
        image_type: 'exterior',
        url: 'https://images.kayak.com/cars/bmw-3-series-2024.jpg',
        thumbnail_url: 'https://images.kayak.com/cars/thumbs/bmw-3-series-2024.jpg',
        caption: '2024 BMW 3 Series',
        width: 2048,
        height: 1536,
        file_size: 389456,
        format: 'jpg',
        uploaded_by: 'enterprise_admin',
        uploaded_at: new Date('2025-09-20'),
        is_primary: true,
        tags: ['luxury', 'bmw', 'sedan', 'premium']
    },

    // User Profile Images
    {
        entity_type: 'user',
        entity_id: 1,
        image_type: 'profile',
        url: 'https://images.kayak.com/users/user-1-profile.jpg',
        thumbnail_url: 'https://images.kayak.com/users/thumbs/user-1-profile.jpg',
        caption: 'Profile Picture',
        width: 512,
        height: 512,
        file_size: 45678,
        format: 'jpg',
        uploaded_by: 'user_1',
        uploaded_at: new Date('2025-08-10'),
        is_primary: true,
        tags: ['profile', 'avatar']
    },
    {
        entity_type: 'user',
        entity_id: 2,
        image_type: 'profile',
        url: 'https://images.kayak.com/users/user-2-profile.jpg',
        thumbnail_url: 'https://images.kayak.com/users/thumbs/user-2-profile.jpg',
        caption: 'Profile Picture',
        width: 512,
        height: 512,
        file_size: 52341,
        format: 'jpg',
        uploaded_by: 'user_2',
        uploaded_at: new Date('2025-07-22'),
        is_primary: true,
        tags: ['profile', 'avatar']
    }
]);
print(`✅ Created ${db.images.countDocuments()} images\n`);

// ========== 3. USER PREFERENCES COLLECTION ==========
print('⚙️  Creating User Preferences Collection...');
db.user_preferences.drop();
db.user_preferences.insertMany([
    {
        user_id: 1,
        notifications: {
            email: {
                booking_confirmations: true,
                promotional_offers: true,
                price_alerts: false,
                trip_reminders: true
            },
            sms: {
                booking_confirmations: true,
                flight_updates: true,
                check_in_reminders: false
            },
            push: {
                enabled: true,
                deal_alerts: true,
                trip_updates: true
            }
        },
        search_preferences: {
            default_currency: 'USD',
            preferred_airlines: ['American', 'Delta', 'United'],
            preferred_car_companies: ['Hertz', 'Enterprise'],
            preferred_hotel_chains: ['Hilton', 'Marriott'],
            cabin_class: 'economy',
            flexible_dates: true,
            non_stop_only: false
        },
        payment_preferences: {
            default_payment_method: 'credit_card',
            save_cards: true,
            auto_fill_billing: true
        },
        accessibility: {
            wheelchair_accessible: false,
            large_text: false,
            high_contrast: false
        },
        privacy: {
            share_travel_plans: false,
            public_reviews: true,
            marketing_emails: true
        },
        favorites: {
            airports: ['SFO', 'JFK', 'LAX'],
            cities: ['San Francisco', 'New York', 'Los Angeles'],
            hotels: [1, 2],
            cars: [1, 4]
        },
        recent_searches: [
            { type: 'flight', from: 'SFO', to: 'JFK', date: '2025-12-10' },
            { type: 'hotel', city: 'New York', checkin: '2025-12-15', checkout: '2025-12-18' }
        ],
        updated_at: new Date('2025-12-01')
    },
    {
        user_id: 2,
        notifications: {
            email: {
                booking_confirmations: true,
                promotional_offers: false,
                price_alerts: true,
                trip_reminders: true
            },
            sms: {
                booking_confirmations: true,
                flight_updates: true,
                check_in_reminders: true
            },
            push: {
                enabled: false,
                deal_alerts: false,
                trip_updates: false
            }
        },
        search_preferences: {
            default_currency: 'USD',
            preferred_airlines: ['JetBlue', 'Southwest'],
            preferred_car_companies: ['Avis', 'Budget'],
            preferred_hotel_chains: ['Hyatt', 'Four Seasons'],
            cabin_class: 'business',
            flexible_dates: false,
            non_stop_only: true
        },
        payment_preferences: {
            default_payment_method: 'paypal',
            save_cards: false,
            auto_fill_billing: false
        },
        accessibility: {
            wheelchair_accessible: false,
            large_text: true,
            high_contrast: false
        },
        privacy: {
            share_travel_plans: true,
            public_reviews: true,
            marketing_emails: false
        },
        favorites: {
            airports: ['JFK', 'MIA', 'BOS'],
            cities: ['Miami', 'Boston'],
            hotels: [5],
            cars: [2, 3]
        },
        recent_searches: [
            { type: 'flight', from: 'JFK', to: 'MIA', date: '2025-12-20' },
            { type: 'car', city: 'Miami', pickup: '2025-12-20', dropoff: '2025-12-25' }
        ],
        updated_at: new Date('2025-11-28')
    },
    {
        user_id: 3,
        notifications: {
            email: {
                booking_confirmations: true,
                promotional_offers: true,
                price_alerts: true,
                trip_reminders: true
            },
            sms: {
                booking_confirmations: false,
                flight_updates: false,
                check_in_reminders: false
            },
            push: {
                enabled: true,
                deal_alerts: true,
                trip_updates: true
            }
        },
        search_preferences: {
            default_currency: 'USD',
            preferred_airlines: ['Delta', 'Alaska'],
            preferred_car_companies: ['Enterprise'],
            preferred_hotel_chains: [],
            cabin_class: 'premium_economy',
            flexible_dates: true,
            non_stop_only: false
        },
        payment_preferences: {
            default_payment_method: 'credit_card',
            save_cards: true,
            auto_fill_billing: true
        },
        accessibility: {
            wheelchair_accessible: false,
            large_text: false,
            high_contrast: false
        },
        privacy: {
            share_travel_plans: false,
            public_reviews: false,
            marketing_emails: true
        },
        favorites: {
            airports: ['ORD', 'SEA'],
            cities: ['Chicago', 'Seattle'],
            hotels: [],
            cars: []
        },
        recent_searches: [],
        updated_at: new Date('2025-11-15')
    }
]);
print(`✅ Created ${db.user_preferences.countDocuments()} user preferences\n`);

// ========== 4. ACTIVITY LOGS COLLECTION ==========
print('📊 Creating Activity Logs Collection...');
db.activity_logs.drop();
db.activity_logs.insertMany([
    // User login activities
    {
        user_id: 1,
        activity_type: 'login',
        timestamp: new Date('2025-12-07T08:30:00Z'),
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        location: {
            city: 'San Francisco',
            state: 'CA',
            country: 'USA',
            coordinates: { lat: 37.7749, lng: -122.4194 }
        },
        session_id: 'sess_abc123',
        success: true
    },
    {
        user_id: 2,
        activity_type: 'login',
        timestamp: new Date('2025-12-07T09:15:00Z'),
        ip_address: '192.168.1.101',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        location: {
            city: 'New York',
            state: 'NY',
            country: 'USA',
            coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        session_id: 'sess_def456',
        success: true
    },
    // Search activities
    {
        user_id: 1,
        activity_type: 'search',
        timestamp: new Date('2025-12-07T08:35:00Z'),
        search_type: 'flight',
        search_params: {
            from: 'SFO',
            to: 'JFK',
            departure_date: '2025-12-10',
            return_date: '2025-12-15',
            passengers: 1,
            cabin_class: 'economy'
        },
        results_count: 45,
        session_id: 'sess_abc123'
    },
    {
        user_id: 1,
        activity_type: 'search',
        timestamp: new Date('2025-12-07T08:40:00Z'),
        search_type: 'hotel',
        search_params: {
            city: 'New York',
            checkin: '2025-12-10',
            checkout: '2025-12-15',
            guests: 2,
            rooms: 1
        },
        results_count: 78,
        session_id: 'sess_abc123'
    },
    {
        user_id: 2,
        activity_type: 'search',
        timestamp: new Date('2025-12-07T09:20:00Z'),
        search_type: 'car',
        search_params: {
            location: 'Miami',
            pickup_date: '2025-12-20',
            dropoff_date: '2025-12-25',
            car_type: 'suv'
        },
        results_count: 34,
        session_id: 'sess_def456'
    },
    // Booking activities
    {
        user_id: 1,
        activity_type: 'booking_created',
        timestamp: new Date('2025-12-07T08:50:00Z'),
        booking_type: 'flight',
        booking_id: 1,
        amount: 320.00,
        session_id: 'sess_abc123',
        details: {
            flight_number: 'AA101',
            from: 'SFO',
            to: 'JFK',
            departure: '2025-12-10T08:00:00Z'
        }
    },
    {
        user_id: 2,
        activity_type: 'booking_created',
        timestamp: new Date('2025-12-05T14:30:00Z'),
        booking_type: 'hotel',
        booking_id: 2,
        amount: 400.00,
        session_id: 'sess_xyz789',
        details: {
            hotel_name: 'Hilton SF',
            checkin: '2025-12-15',
            checkout: '2025-12-18',
            nights: 3
        }
    },
    // Page view activities
    {
        user_id: 1,
        activity_type: 'page_view',
        timestamp: new Date('2025-12-07T08:45:00Z'),
        page_type: 'flight_details',
        page_url: '/flights/AA101',
        duration_seconds: 45,
        session_id: 'sess_abc123'
    },
    {
        user_id: 1,
        activity_type: 'page_view',
        timestamp: new Date('2025-12-07T08:48:00Z'),
        page_type: 'checkout',
        page_url: '/checkout',
        duration_seconds: 120,
        session_id: 'sess_abc123'
    },
    // Review activities
    {
        user_id: 2,
        activity_type: 'review_submitted',
        timestamp: new Date('2025-11-20T16:20:00Z'),
        entity_type: 'hotel',
        entity_id: 1,
        rating: 4.5,
        session_id: 'sess_review123'
    }
]);
print(`✅ Created ${db.activity_logs.countDocuments()} activity logs\n`);

// ========== 5. SEARCH HISTORY COLLECTION ==========
print('🔍 Creating Search History Collection...');
db.search_history.drop();
db.search_history.insertMany([
    {
        user_id: 1,
        search_type: 'flight',
        timestamp: new Date('2025-12-07T08:35:00Z'),
        params: {
            from: 'SFO',
            to: 'JFK',
            departure_date: '2025-12-10',
            return_date: '2025-12-15',
            passengers: 1,
            cabin_class: 'economy',
            non_stop: false
        },
        results_count: 45,
        clicked_result_id: 1,
        booked: true,
        session_id: 'sess_abc123'
    },
    {
        user_id: 1,
        search_type: 'hotel',
        timestamp: new Date('2025-12-07T08:40:00Z'),
        params: {
            city: 'New York',
            checkin: '2025-12-10',
            checkout: '2025-12-15',
            guests: 2,
            rooms: 1,
            min_rating: 4.0
        },
        results_count: 78,
        clicked_result_id: 2,
        booked: false,
        session_id: 'sess_abc123'
    },
    {
        user_id: 1,
        search_type: 'flight',
        timestamp: new Date('2025-12-05T10:20:00Z'),
        params: {
            from: 'SFO',
            to: 'LAX',
            departure_date: '2025-12-20',
            passengers: 2,
            cabin_class: 'economy',
            non_stop: true
        },
        results_count: 23,
        clicked_result_id: null,
        booked: false,
        session_id: 'sess_old123'
    },
    {
        user_id: 2,
        search_type: 'car',
        timestamp: new Date('2025-12-07T09:20:00Z'),
        params: {
            location: 'Miami',
            pickup_date: '2025-12-20',
            dropoff_date: '2025-12-25',
            car_type: 'suv',
            transmission: 'automatic'
        },
        results_count: 34,
        clicked_result_id: 42,
        booked: false,
        session_id: 'sess_def456'
    },
    {
        user_id: 2,
        search_type: 'flight',
        timestamp: new Date('2025-12-06T14:30:00Z'),
        params: {
            from: 'JFK',
            to: 'MIA',
            departure_date: '2025-12-20',
            return_date: '2025-12-25',
            passengers: 1,
            cabin_class: 'business',
            non_stop: true
        },
        results_count: 12,
        clicked_result_id: 9,
        booked: true,
        session_id: 'sess_booking789'
    },
    {
        user_id: 3,
        search_type: 'hotel',
        timestamp: new Date('2025-12-04T11:15:00Z'),
        params: {
            city: 'Chicago',
            checkin: '2025-12-25',
            checkout: '2025-12-28',
            guests: 4,
            rooms: 2,
            min_rating: 3.5
        },
        results_count: 92,
        clicked_result_id: 3,
        booked: false,
        session_id: 'sess_chi123'
    },
    {
        user_id: 3,
        search_type: 'flight',
        timestamp: new Date('2025-12-03T16:45:00Z'),
        params: {
            from: 'ORD',
            to: 'SEA',
            departure_date: '2025-12-25',
            passengers: 2,
            cabin_class: 'premium_economy',
            non_stop: false
        },
        results_count: 28,
        clicked_result_id: null,
        booked: false,
        session_id: 'sess_sea456'
    }
]);
print(`✅ Created ${db.search_history.countDocuments()} search history entries\n`);

// ========== 6. NOTIFICATIONS COLLECTION ==========
print('🔔 Creating Notifications Collection...');
db.notifications.drop();
db.notifications.insertMany([
    {
        user_id: 1,
        type: 'booking_confirmation',
        title: 'Booking Confirmed!',
        message: 'Your flight booking for AA101 on Dec 10, 2025 has been confirmed.',
        data: {
            booking_id: 1,
            booking_type: 'flight',
            flight_number: 'AA101',
            departure: '2025-12-10T08:00:00Z'
        },
        priority: 'high',
        read: true,
        read_at: new Date('2025-12-07T09:00:00Z'),
        created_at: new Date('2025-12-07T08:50:00Z'),
        expires_at: new Date('2025-12-11T00:00:00Z'),
        channels: ['email', 'push', 'sms']
    },
    {
        user_id: 1,
        type: 'price_alert',
        title: 'Price Drop Alert!',
        message: 'Flight SFO → LAX on your saved search has dropped by $50!',
        data: {
            route: 'SFO-LAX',
            old_price: 150.00,
            new_price: 100.00,
            savings: 50.00
        },
        priority: 'medium',
        read: false,
        created_at: new Date('2025-12-06T15:30:00Z'),
        expires_at: new Date('2025-12-13T00:00:00Z'),
        channels: ['email', 'push']
    },
    {
        user_id: 1,
        type: 'trip_reminder',
        title: 'Upcoming Trip Reminder',
        message: 'Your flight AA101 departs in 3 days. Don\'t forget to check in!',
        data: {
            booking_id: 1,
            flight_number: 'AA101',
            departure: '2025-12-10T08:00:00Z',
            days_until: 3
        },
        priority: 'high',
        read: false,
        created_at: new Date('2025-12-07T08:00:00Z'),
        expires_at: new Date('2025-12-10T00:00:00Z'),
        channels: ['email', 'push']
    },
    {
        user_id: 2,
        type: 'booking_confirmation',
        title: 'Hotel Booking Confirmed',
        message: 'Your hotel reservation at Hilton SF for Dec 15-18 has been confirmed.',
        data: {
            booking_id: 2,
            booking_type: 'hotel',
            hotel_name: 'Hilton SF',
            checkin: '2025-12-15',
            checkout: '2025-12-18'
        },
        priority: 'high',
        read: true,
        read_at: new Date('2025-12-05T14:35:00Z'),
        created_at: new Date('2025-12-05T14:30:00Z'),
        expires_at: new Date('2025-12-19T00:00:00Z'),
        channels: ['email', 'sms']
    },
    {
        user_id: 2,
        type: 'promotional',
        title: 'Flash Sale! 30% Off Hotels',
        message: 'Book any hotel this weekend and save 30% with code FLASH30!',
        data: {
            promo_code: 'FLASH30',
            discount_percent: 30,
            valid_until: '2025-12-10T23:59:59Z'
        },
        priority: 'low',
        read: false,
        created_at: new Date('2025-12-06T10:00:00Z'),
        expires_at: new Date('2025-12-10T23:59:59Z'),
        channels: ['email']
    },
    {
        user_id: 3,
        type: 'flight_update',
        title: 'Flight Status Update',
        message: 'Your flight UA201 is on-time for departure.',
        data: {
            booking_id: 15,
            flight_number: 'UA201',
            status: 'on-time',
            gate: 'B12',
            departure: '2025-12-11T07:30:00Z'
        },
        priority: 'high',
        read: false,
        created_at: new Date('2025-12-11T05:00:00Z'),
        expires_at: new Date('2025-12-11T10:00:00Z'),
        channels: ['push', 'sms']
    },
    {
        user_id: 1,
        type: 'review_request',
        title: 'How was your stay?',
        message: 'Please share your experience at Hilton SF to help other travelers!',
        data: {
            booking_id: 2,
            entity_type: 'hotel',
            entity_id: 1,
            hotel_name: 'Hilton SF'
        },
        priority: 'low',
        read: false,
        created_at: new Date('2025-11-19T10:00:00Z'),
        expires_at: new Date('2025-12-19T00:00:00Z'),
        channels: ['email']
    },
    {
        user_id: 2,
        type: 'loyalty_points',
        title: 'You Earned Points!',
        message: 'Congratulations! You earned 500 points from your recent booking.',
        data: {
            points_earned: 500,
            total_points: 2350,
            booking_id: 2
        },
        priority: 'low',
        read: false,
        created_at: new Date('2025-12-05T15:00:00Z'),
        expires_at: null,
        channels: ['email', 'push']
    }
]);
print(`✅ Created ${db.notifications.countDocuments()} notifications\n`);

// ========== CREATE INDEXES FOR PERFORMANCE ==========
print('📈 Creating Indexes...');

// Reviews indexes
db.reviews.createIndex({ entity_type: 1, entity_id: 1 });
db.reviews.createIndex({ user_id: 1 });
db.reviews.createIndex({ rating: -1 });
db.reviews.createIndex({ created_at: -1 });
db.reviews.createIndex({ verified_booking: 1 });

// Images indexes
db.images.createIndex({ entity_type: 1, entity_id: 1 });
db.images.createIndex({ is_primary: 1 });
db.images.createIndex({ tags: 1 });

// User preferences indexes
db.user_preferences.createIndex({ user_id: 1 }, { unique: true });

// Activity logs indexes
db.activity_logs.createIndex({ user_id: 1, timestamp: -1 });
db.activity_logs.createIndex({ activity_type: 1 });
db.activity_logs.createIndex({ timestamp: -1 });
db.activity_logs.createIndex({ session_id: 1 });

// Search history indexes
db.search_history.createIndex({ user_id: 1, timestamp: -1 });
db.search_history.createIndex({ search_type: 1 });
db.search_history.createIndex({ booked: 1 });

// Notifications indexes
db.notifications.createIndex({ user_id: 1, created_at: -1 });
db.notifications.createIndex({ read: 1 });
db.notifications.createIndex({ type: 1 });
db.notifications.createIndex({ expires_at: 1 });

print('✅ All indexes created\n');

// ========== SUMMARY ==========
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('📊 MONGODB INITIALIZATION COMPLETE!\n');
print(`✅ Reviews: ${db.reviews.countDocuments()} documents`);
print(`✅ Images: ${db.images.countDocuments()} documents`);
print(`✅ User Preferences: ${db.user_preferences.countDocuments()} documents`);
print(`✅ Activity Logs: ${db.activity_logs.countDocuments()} documents`);
print(`✅ Search History: ${db.search_history.countDocuments()} documents`);
print(`✅ Notifications: ${db.notifications.countDocuments()} documents`);
print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🎉 MongoDB is ready for use!\n');
