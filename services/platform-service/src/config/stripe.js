/**
 * Stripe Configuration Module
 * Initializes Stripe SDK with API keys
 */

const Stripe = require('stripe');
const logger = require('../utils/logger');

// Validate Stripe keys
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_SECRET_KEY) {
    logger.warn('⚠️  STRIPE_SECRET_KEY not found. Stripe integration disabled.');
}

// Initialize Stripe with latest API version
const stripe = STRIPE_SECRET_KEY
    ? Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
        typescript: false,
        maxNetworkRetries: 3,
    })
    : null;

// Log Stripe status
if (stripe) {
    logger.info('✅ Stripe initialized successfully');
    logger.info(`🔑 Publishable Key: ${STRIPE_PUBLISHABLE_KEY ? STRIPE_PUBLISHABLE_KEY.substring(0, 20) + '...' : 'Not set'}`);
} else {
    logger.warn('❌ Stripe not initialized - missing API keys');
}

/**
 * Get Stripe publishable key for frontend
 */
const getPublishableKey = () => {
    return STRIPE_PUBLISHABLE_KEY;
};

/**
 * Check if Stripe is enabled
 */
const isStripeEnabled = () => {
    return !!stripe;
};

module.exports = {
    stripe,
    getPublishableKey,
    isStripeEnabled
};
