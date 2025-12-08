-- =================================================================
-- User Payment Methods (Non-Stripe Version)
-- Stores encrypted payment methods in database (no Stripe)
-- =================================================================

USE kayak_db;

-- Drop old Stripe-based table if exists
DROP TABLE IF EXISTS user_payment_methods;

-- Create new user_payment_methods table WITHOUT Stripe dependencies
CREATE TABLE IF NOT EXISTS user_payment_methods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT 'Reference to users.id',
    
    -- Encrypted card data (stored as encrypted strings)
    encrypted_card_number TEXT NOT NULL COMMENT 'Encrypted full card number',
    card_last4 VARCHAR(4) NOT NULL COMMENT 'Last 4 digits (unencrypted for display)',
    card_brand VARCHAR(50) COMMENT 'Card brand (Visa, Mastercard, Amex, Discover)',
    card_exp_month INT NOT NULL COMMENT 'Expiration month (1-12)',
    card_exp_year INT NOT NULL COMMENT 'Expiration year (4 digits)',
    encrypted_cvv TEXT COMMENT 'Encrypted CVV (optional storage)',
    
    -- Billing information
    billing_name VARCHAR(255) NOT NULL COMMENT 'Cardholder name',
    billing_address VARCHAR(255) COMMENT 'Billing street address',
    billing_city VARCHAR(100) COMMENT 'Billing city',
    billing_state VARCHAR(50) COMMENT 'Billing state/province',
    billing_zip VARCHAR(10) NOT NULL COMMENT 'Billing ZIP code',
    billing_country VARCHAR(2) DEFAULT 'US' COMMENT 'Billing country code',
    
    -- Card settings
    is_default BOOLEAN DEFAULT FALSE COMMENT 'Is this the default payment method?',
    nickname VARCHAR(100) COMMENT 'User-defined nickname for the card',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL COMMENT 'When this card was last used for payment',
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_user_payment_methods (user_id),
    INDEX idx_is_default (user_id, is_default),
    INDEX idx_last_used (user_id, last_used_at),
    INDEX idx_card_last4 (user_id, card_last4),
    
    -- Constraints
    CONSTRAINT chk_exp_month CHECK (card_exp_month >= 1 AND card_exp_month <= 12),
    CONSTRAINT chk_exp_year CHECK (card_exp_year >= 2024),
    CONSTRAINT chk_last4 CHECK (LENGTH(card_last4) = 4),
    
    -- Prevent duplicate cards (same last4, expiry, and user)
    UNIQUE KEY unique_card_per_user (user_id, card_last4, card_exp_month, card_exp_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Stores user payment methods with encrypted card data';

-- Remove stripe_customer_id column from users table if it exists
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='stripe_customer_id');
SET @sqlstmt := IF(@exist>0, 'ALTER TABLE users DROP COLUMN stripe_customer_id', 'SELECT ''Column does not exist''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create trigger to ensure only one default payment method per user
DELIMITER $$

DROP TRIGGER IF EXISTS before_payment_method_insert$$
CREATE TRIGGER before_payment_method_insert
BEFORE INSERT ON user_payment_methods
FOR EACH ROW
BEGIN
    -- If this is being set as default, unset all other defaults for this user
    IF NEW.is_default = TRUE THEN
        UPDATE user_payment_methods 
        SET is_default = FALSE 
        WHERE user_id = NEW.user_id;
    END IF;
END$$

DROP TRIGGER IF EXISTS before_payment_method_update$$
CREATE TRIGGER before_payment_method_update
BEFORE UPDATE ON user_payment_methods
FOR EACH ROW
BEGIN
    -- If this is being set as default, unset all other defaults for this user
    IF NEW.is_default = TRUE AND OLD.is_default = FALSE THEN
        UPDATE user_payment_methods 
        SET is_default = FALSE 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
END$$

DELIMITER ;

-- Success message
SELECT 'Non-Stripe payment methods table created successfully!' AS status;
