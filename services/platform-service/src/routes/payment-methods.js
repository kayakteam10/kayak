/**
 * Payment Methods Routes
 * RESTful API for managing user payment methods with Stripe
 */

const express = require('express');
const router = express.Router();
const { stripe, isStripeEnabled, getPublishableKey } = require('../config/stripe');
const PaymentMethodModel = require('../models/PaymentMethod');
const verifyToken = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

/**
 * GET /api/stripe/config
 * Get Stripe publishable key for frontend
 */
router.get('/config', (req, res) => {
    if (!isStripeEnabled()) {
        return res.status(503).json({
            success: false,
            message: 'Stripe is not configured'
        });
    }

    res.json({
        success: true,
        publishableKey: getPublishableKey()
    });
});

/**
 * GET /api/payment-methods
 * List all payment methods for the authenticated user
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        if (!isStripeEnabled()) {
            return res.status(503).json({
                success: false,
                message: 'Stripe is not configured'
            });
        }

        const userId = req.user.userId;
        const paymentMethods = await PaymentMethodModel.findByUserId(userId);

        res.json({
            success: true,
            data: paymentMethods
        });
    } catch (error) {
        logger.error('Error fetching payment methods:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment methods',
            error: error.message
        });
    }
});

/**
 * POST /api/payment-methods
 * Add a new payment method for the user
 * 
 * Body: { payment_method_id: 'pm_xxxxx' }
 */
router.post('/', verifyToken, async (req, res) => {
    try {
        if (!isStripeEnabled()) {
            return res.status(503).json({
                success: false,
                message: 'Stripe is not configured'
            });
        }

        const userId = req.user.userId;
        const { payment_method_id } = req.body;

        if (!payment_method_id) {
            return res.status(400).json({
                success: false,
                message: 'payment_method_id is required'
            });
        }

        // Get or create Stripe customer
        let stripeCustomerId = req.user.stripe_customer_id;

        if (!stripeCustomerId) {
            // Create new Stripe customer
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: `${req.user.first_name} ${req.user.last_name}`,
                metadata: {
                    user_id: userId.toString()
                }
            });

            stripeCustomerId = customer.id;

            // Update user record with Stripe customer ID
            const db = require('../config/database');
            await db.execute(
                'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
                [stripeCustomerId, userId]
            );

            logger.info(`Created Stripe customer ${stripeCustomerId} for user ${userId}`);
        }

        // Attach payment method to customer
        await stripe.paymentMethods.attach(payment_method_id, {
            customer: stripeCustomerId
        });

        // Retrieve payment method details from Stripe
        const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);

        // Check if this is the first payment method
        const existingCount = await PaymentMethodModel.countByUserId(userId);
        const isFirst = existingCount === 0;

        // Set as default if it's the first card
        if (isFirst) {
            await stripe.customers.update(stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: payment_method_id
                }
            });
        }

        // Save to database
        const savedPaymentMethod = await PaymentMethodModel.create({
            userId,
            stripeCustomerId,
            stripePaymentMethodId: payment_method_id,
            cardBrand: paymentMethod.card.brand,
            cardLast4: paymentMethod.card.last4,
            cardExpMonth: paymentMethod.card.exp_month,
            cardExpYear: paymentMethod.card.exp_year,
            billingName: paymentMethod.billing_details.name,
            billingZip: paymentMethod.billing_details.address?.postal_code,
            isDefault: isFirst
        });

        logger.info(`Added payment method ${payment_method_id} for user ${userId}`);

        res.status(201).json({
            success: true,
            message: 'Payment method added successfully',
            data: savedPaymentMethod
        });
    } catch (error) {
        logger.error('Error adding payment method:', error);

        // Handle Stripe-specific errors
        if (error.type) {
            return res.status(400).json({
                success: false,
                message: error.message,
                type: error.type
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to add payment method',
            error: error.message
        });
    }
});

/**
 * PUT /api/payment-methods/:id/set-default
 * Set a payment method as the default
 */
router.put('/:id/set-default', verifyToken, async (req, res) => {
    try {
        if (!isStripeEnabled()) {
            return res.status(503).json({
                success: false,
                message: 'Stripe is not configured'
            });
        }

        const userId = req.user.userId;
        const paymentMethodId = parseInt(req.params.id);

        // Get payment method
        const paymentMethod = await PaymentMethodModel.findById(paymentMethodId, userId);

        if (!paymentMethod) {
            return res.status(404).json({
                success: false,
                message: 'Payment method not found'
            });
        }

        // Update Stripe
        await stripe.customers.update(paymentMethod.stripe_customer_id, {
            invoice_settings: {
                default_payment_method: paymentMethod.stripe_payment_method_id
            }
        });

        // Update database
        await PaymentMethodModel.setAsDefault(paymentMethodId, userId);

        logger.info(`Set payment method ${paymentMethodId} as default for user ${userId}`);

        res.json({
            success: true,
            message: 'Default payment method updated'
        });
    } catch (error) {
        logger.error('Error setting default payment method:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set default payment method',
            error: error.message
        });
    }
});

/**
 * DELETE /api/payment-methods/:id
 * Delete a payment method
 */
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        if (!isStripeEnabled()) {
            return res.status(503).json({
                success: false,
                message: 'Stripe is not configured'
            });
        }

        const userId = req.user.userId;
        const paymentMethodId = parseInt(req.params.id);

        // Get payment method
        const paymentMethod = await PaymentMethodModel.findById(paymentMethodId, userId);

        if (!paymentMethod) {
            return res.status(404).json({
                success: false,
                message: 'Payment method not found'
            });
        }

        // Don't allow deleting default payment method
        if (paymentMethod.is_default) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete default payment method. Please set another card as default first.'
            });
        }

        // Detach from Stripe
        await stripe.paymentMethods.detach(paymentMethod.stripe_payment_method_id);

        // Delete from database
        await PaymentMethodModel.delete(paymentMethodId, userId);

        logger.info(`Deleted payment method ${paymentMethodId} for user ${userId}`);

        res.json({
            success: true,
            message: 'Payment method deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting payment method:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete payment method',
            error: error.message
        });
    }
});

module.exports = router;
