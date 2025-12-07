-- AI Service Database Schema
-- Initial migration for chat sessions, deals, bundles, and watches

-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    context_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Conversation Turns
CREATE TABLE IF NOT EXISTS conversation_turns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_session_timestamp (session_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Hotel Deals
CREATE TABLE IF NOT EXISTS hotel_deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    listing_id VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    neighbourhood VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    avg_30d_price DECIMAL(10, 2) DEFAULT 0,
    is_deal BOOLEAN DEFAULT FALSE,
    is_pet_friendly BOOLEAN DEFAULT FALSE,
    near_transit BOOLEAN DEFAULT FALSE,
    has_breakfast BOOLEAN DEFAULT FALSE,
    is_refundable BOOLEAN DEFAULT FALSE,
    rooms_left INT DEFAULT 10,
    cancellation_policy TEXT,
    deal_score INT DEFAULT 0,
    tags VARCHAR(500),
    source VARCHAR(50) DEFAULT 'airbnb',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_listing_id (listing_id),
    INDEX idx_city (city),
    INDEX idx_is_deal (is_deal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Flight Deals
CREATE TABLE IF NOT EXISTS flight_deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_key VARCHAR(100) NOT NULL,
    origin VARCHAR(10) NOT NULL,
    destination VARCHAR(10) NOT NULL,
    depart_date DATE NOT NULL,
    return_date DATE,
    airline VARCHAR(100) NOT NULL,
    stops INT DEFAULT 0,
    duration_minutes INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_red_eye BOOLEAN DEFAULT FALSE,
    is_direct BOOLEAN DEFAULT FALSE,
    seats_left INT DEFAULT 10,
    deal_score INT DEFAULT 0,
    tags VARCHAR(500),
    source VARCHAR(50) DEFAULT 'kaggle',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_route_key (route_key),
    INDEX idx_origin (origin),
    INDEX idx_destination (destination)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bundles
CREATE TABLE IF NOT EXISTS bundles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    hotel_id INT NOT NULL,
    session_id INT,
    total_price DECIMAL(10, 2) NOT NULL,
    fit_score DECIMAL(5, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    explanation_short VARCHAR(255),
    tradeoffs TEXT,
    user_viewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (flight_id) REFERENCES flight_deals(id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES hotel_deals(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL,
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Watches
CREATE TABLE IF NOT EXISTS watches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bundle_id INT NOT NULL,
    session_id INT,
    max_price DECIMAL(10, 2),
    min_rooms_left INT,
    min_seats_left INT,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMP NULL,
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL,
    INDEX idx_bundle_id (bundle_id),
    INDEX idx_session_id (session_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Deal Events
CREATE TABLE IF NOT EXISTS deal_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_type VARCHAR(20) NOT NULL,
    deal_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_to_kafka BOOLEAN DEFAULT FALSE,
    
    INDEX idx_timestamp (timestamp),
    INDEX idx_deal_type_id (deal_type, deal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
