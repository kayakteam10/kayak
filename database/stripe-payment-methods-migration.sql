-- =================================================================
-- Stripe Payment Methods Migration
-- Adds Stripe integration support for multiple saved cards per user
-- =================================================================

USE kayak_db;

-- Step 1: Add Stripe customer ID to users table
ALTER TABLE users 
  ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE COMMENT 'Stripe customer ID (cus_xxxxx)' AFTER mongo_image_id,
  ADD INDEX idx_stripe_customer (stripe_customer_id);

-- Step 2: Create user_payment_methods table
CREATE TABLE IF NOT EXISTS user_payment_methods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT 'Reference to users.id',
    stripe_customer_id VARCHAR(255) NOT NULL COMMENT 'Stripe customer ID',
    stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE COMMENT 'Stripe payment method ID (pm_xxxxx)',
    card_brand VARCHAR(50) COMMENT 'Card brand (Visa, Mastercard, Amex, Discover)',
    card_last4 VARCHAR(4) COMMENT 'Last 4 digits of card',
    card_exp_month INT COMMENT 'Expiration month (1-12)',
    card_exp_year INT COMMENT 'Expiration year (4 digits)',
    billing_name VARCHAR(255) COMMENT 'Cardholder name',
    billing_zip VARCHAR(10) COMMENT 'Billing ZIP code',
    is_default BOOLEAN DEFAULT FALSE COMMENT 'Is this the default payment method?',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_user_payment_methods (user_id),
    INDEX idx_stripe_customer (stripe_customer_id),
    INDEX idx_is_default (user_id, is_default),
    
    -- Constraints
    CONSTRAINT chk_exp_month CHECK (card_exp_month >= 1 AND card_exp_month <= 12),
    CONSTRAINT chk_exp_year CHECK (card_exp_year >= 2024),
    CONSTRAINT chk_last4 CHECK (LENGTH(card_last4) = 4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Stores user payment methods (Stripe integration)';

-- Step 3: Create trigger to ensure only one default payment method per user
DELIMITER $$

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
SELECT 'Stripe payment methods migration completed successfully!' AS status;
