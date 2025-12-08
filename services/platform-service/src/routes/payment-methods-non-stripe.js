/**
 * Payment Methods Routes (Non-Stripe Version)
 * RESTful API for managing user payment methods with encryption
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Database connection
const db = require('../config/database');

/**
 * Encryption utilities
 */
const ENCRYPTION_KEY = process.env.PAYMENT_ENCRYPTION_KEY || 'your-secure-32-char-encryption-key-here!!';
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return IV + AuthTag + Encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * GET /api/payment-methods
 * List all payment methods for the authenticated user
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [rows] = await db.execute(
            `SELECT 
                id,
                card_last4,
                card_brand,
                card_exp_month,
                card_exp_year,
                billing_name,
                billing_address,
                billing_city,
                billing_state,
                billing_zip,
                billing_country,
                is_default,
                nickname,
                created_at,
                last_used_at
            FROM user_payment_methods
            WHERE user_id = ?
            ORDER BY is_default DESC, last_used_at DESC, created_at DESC`,
            [userId]
        );

        // Format response
        const paymentMethods = rows.map(row => ({
            id: row.id,
            card_last4: row.card_last4,
            card_brand: row.card_brand,
            card_exp_month: row.card_exp_month,
            card_exp_year: row.card_exp_year,
            billing_name: row.billing_name,
            billing_address: row.billing_address,
            billing_city: row.billing_city,
            billing_state: row.billing_state,
            billing_zip: row.billing_zip,
            billing_country: row.billing_country,
            is_default: Boolean(row.is_default),
            nickname: row.nickname,
            created_at: row.created_at,
            last_used_at: row.last_used_at
        }));

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
 * Body: {
 *   creditCardNumber: string,
 *   cardExpMonth: number,
 *   cardExpYear: number,
 *   cvv: string,
 *   billingName: string,
 *   billingAddress: string,
 *   billingCity: string,
 *   billingState: string,
 *   billingZip: string,
 *   billingCountry: string,
 *   cardBrand: string,
 *   setAsDefault: boolean
 * }
 */
router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            creditCardNumber,
            cardExpMonth,
            cardExpYear,
            cvv,
            billingName,
            billingAddress,
            billingCity,
            billingState,
            billingZip,
            billingCountry = 'US',
            cardBrand,
            nickname,
            setAsDefault = false
        } = req.body;

        // Validate required fields
        if (!creditCardNumber || !cardExpMonth || !cardExpYear || !billingName || !billingZip) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: creditCardNumber, cardExpMonth, cardExpYear, billingName, billingZip'
            });
        }

        // Validate billing state is provided
        if (!billingState || billingState.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Billing state is required'
            });
        }

        // Validate expiry
        if (cardExpMonth < 1 || cardExpMonth > 12) {
            return res.status(400).json({
                success: false,
                message: 'Invalid expiration month'
            });
        }

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        if (cardExpYear < currentYear || (cardExpYear === currentYear && cardExpMonth < currentMonth)) {
            return res.status(400).json({
                success: false,
                message: 'Card has expired'
            });
        }

        // Get last 4 digits
        const cardLast4 = creditCardNumber.slice(-4);

        // Check for duplicate (same last4, expiry, and user)
        const [existing] = await db.execute(
            `SELECT id FROM user_payment_methods 
             WHERE user_id = ? AND card_last4 = ? AND card_exp_month = ? AND card_exp_year = ?`,
            [userId, cardLast4, cardExpMonth, cardExpYear]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'This payment method already exists'
            });
        }

        // Encrypt sensitive data
        const encryptedCardNumber = encrypt(creditCardNumber);
        const encryptedCvv = cvv ? encrypt(cvv) : null;

        // Check if this should be default (first card OR explicitly requested)
        const [countResult] = await db.execute(
            'SELECT COUNT(*) as count FROM user_payment_methods WHERE user_id = ?',
            [userId]
        );
        const isFirstCard = countResult[0].count === 0;
        const isDefault = isFirstCard || setAsDefault;

        // If setting as default, unset all other defaults for this user BEFORE inserting
        if (isDefault) {
            await db.execute(
                'UPDATE user_payment_methods SET is_default = 0 WHERE user_id = ?',
                [userId]
            );
        }

        // Insert new payment method
        const [result] = await db.execute(
            `INSERT INTO user_payment_methods (
                user_id,
                encrypted_card_number,
                card_last4,
                card_brand,
                card_exp_month,
                card_exp_year,
                encrypted_cvv,
                billing_name,
                billing_address,
                billing_city,
                billing_state,
                billing_zip,
                billing_country,
                nickname,
                is_default
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                encryptedCardNumber,
                cardLast4,
                cardBrand || 'Unknown',
                cardExpMonth,
                cardExpYear,
                encryptedCvv,
                billingName,
                billingAddress || '',
                billingCity || '',
                billingState,
                billingZip,
                billingCountry,
                nickname || null,
                isDefault
            ]
        );

        logger.info(`Added payment method (ending ${cardLast4}) for user ${userId}`);

        // Return the created payment method (without encrypted data)
        const [newCard] = await db.execute(
            `SELECT 
                id, card_last4, card_brand, card_exp_month, card_exp_year,
                billing_name, billing_address, billing_city, billing_state,
                billing_zip, billing_country, is_default, nickname, created_at
            FROM user_payment_methods WHERE id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Payment method added successfully',
            data: {
                ...newCard[0],
                is_default: Boolean(newCard[0].is_default)
            }
        });
    } catch (error) {
        logger.error('Error adding payment method:', error);
        
        // Handle duplicate key error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'This payment method already exists'
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
        const userId = req.user.userId;
        const paymentMethodId = parseInt(req.params.id);

        // Verify ownership
        const [card] = await db.execute(
            'SELECT id FROM user_payment_methods WHERE id = ? AND user_id = ?',
            [paymentMethodId, userId]
        );

        if (card.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Payment method not found'
            });
        }

        // First, unset all other defaults for this user
        await db.execute(
            'UPDATE user_payment_methods SET is_default = 0 WHERE user_id = ?',
            [userId]
        );

        // Then set this one as default
        await db.execute(
            'UPDATE user_payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?',
            [paymentMethodId, userId]
        );

        logger.info(`Set payment method ${paymentMethodId} as default for user ${userId}`);

        res.json({
            success: true,
            message: 'Payment method set as default'
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
        const userId = req.user.userId;
        const paymentMethodId = parseInt(req.params.id);

        // Verify ownership and get card details
        const [card] = await db.execute(
            'SELECT is_default FROM user_payment_methods WHERE id = ? AND user_id = ?',
            [paymentMethodId, userId]
        );

        if (card.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Payment method not found'
            });
        }

        const wasDefault = card[0].is_default;

        // Delete the payment method
        await db.execute(
            'DELETE FROM user_payment_methods WHERE id = ? AND user_id = ?',
            [paymentMethodId, userId]
        );

        // If this was the default, set another card as default
        if (wasDefault) {
            await db.execute(
                `UPDATE user_payment_methods 
                 SET is_default = TRUE 
                 WHERE user_id = ? 
                 ORDER BY last_used_at DESC, created_at DESC 
                 LIMIT 1`,
                [userId]
            );
        }

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

/**
 * PUT /api/payment-methods/:id/mark-used
 * Update last_used_at timestamp (called after successful payment)
 */
router.put('/:id/mark-used', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const paymentMethodId = parseInt(req.params.id);

        await db.execute(
            'UPDATE user_payment_methods SET last_used_at = NOW() WHERE id = ? AND user_id = ?',
            [paymentMethodId, userId]
        );

        res.json({
            success: true,
            message: 'Payment method usage updated'
        });
    } catch (error) {
        logger.error('Error updating payment method usage:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment method',
            error: error.message
        });
    }
});

module.exports = router;
