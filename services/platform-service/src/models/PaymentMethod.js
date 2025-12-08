/**
 * PaymentMethod Model
 * Handles CRUD operations for user payment methods (Stripe integration)
 */

const db = require('../config/database');
const logger = require('../utils/logger');

class PaymentMethodModel {
    /**
     * Get all payment methods for a user
     */
    static async findByUserId(userId) {
        try {
            const [rows] = await db.execute(
                `SELECT 
          id, user_id, stripe_customer_id, stripe_payment_method_id,
          card_brand, card_last4, card_exp_month, card_exp_year,
          billing_name, billing_zip, is_default, created_at, updated_at
         FROM user_payment_methods 
         WHERE user_id = ? 
         ORDER BY is_default DESC, created_at DESC`,
                [userId]
            );
            return rows;
        } catch (error) {
            logger.error('Error fetching payment methods:', error);
            throw error;
        }
    }

    /**
     * Get a single payment method by ID
     */
    static async findById(id, userId = null) {
        try {
            const query = userId
                ? 'SELECT * FROM user_payment_methods WHERE id = ? AND user_id = ?'
                : 'SELECT * FROM user_payment_methods WHERE id = ?';

            const params = userId ? [id, userId] : [id];
            const [rows] = await db.execute(query, params);
            return rows[0] || null;
        } catch (error) {
            logger.error('Error fetching payment method:', error);
            throw error;
        }
    }

    /**
     * Find payment method by Stripe PM ID
     */
    static async findByStripePaymentMethodId(stripePaymentMethodId) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM user_payment_methods WHERE stripe_payment_method_id = ?',
                [stripePaymentMethodId]
            );
            return rows[0] || null;
        } catch (error) {
            logger.error('Error fetching payment method by Stripe ID:', error);
            throw error;
        }
    }

    /**
     * Create a new payment method
     */
    static async create(paymentMethodData) {
        const {
            userId,
            stripeCustomerId,
            stripePaymentMethodId,
            cardBrand,
            cardLast4,
            cardExpMonth,
            cardExpYear,
            billingName,
            billingZip,
            isDefault
        } = paymentMethodData;

        try {
            // If this is being set as default, unset all other defaults for this user
            if (isDefault) {
                await db.execute(
                    'UPDATE user_payment_methods SET is_default = FALSE WHERE user_id = ?',
                    [userId]
                );
            }

            const [result] = await db.execute(
                `INSERT INTO user_payment_methods (
                user_id, stripe_customer_id, stripe_payment_method_id,
                card_brand, card_last4, card_exp_month, card_exp_year,
                billing_name, billing_zip, is_default
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    stripeCustomerId,
                    stripePaymentMethodId,
                    cardBrand,
                    cardLast4,
                    cardExpMonth,
                    cardExpYear,
                    billingName || null,
                    billingZip || null,
                    isDefault || false
                ]
            );

            return {
                id: result.insertId,
                ...paymentMethodData
            };
        } catch (error) {
            logger.error('Error creating payment method:', error);
            throw error;
        }
    }

    /**
     * Set a payment method as default (and unset others)
     */
    static async setAsDefault(id, userId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Verify ownership
            const [payment] = await connection.execute(
                'SELECT * FROM user_payment_methods WHERE id = ? AND user_id = ?',
                [id, userId]
            );

            if (!payment.length) {
                throw new Error('Payment method not found or unauthorized');
            }

            // Unset all defaults for this user
            await connection.execute(
                'UPDATE user_payment_methods SET is_default = FALSE WHERE user_id = ?',
                [userId]
            );

            // Set new default
            await connection.execute(
                'UPDATE user_payment_methods SET is_default = TRUE WHERE id = ?',
                [id]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            logger.error('Error setting default payment method:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Delete a payment method
     */
    static async delete(id, userId) {
        try {
            // Check if it's the default
            const method = await this.findById(id, userId);
            if (!method) {
                throw new Error('Payment method not found');
            }

            if (method.is_default) {
                throw new Error('Cannot delete default payment method. Set another card as default first.');
            }

            const [result] = await db.execute(
                'DELETE FROM user_payment_methods WHERE id = ? AND user_id = ?',
                [id, userId]
            );

            return result.affectedRows > 0;
        } catch (error) {
            logger.error('Error deleting payment method:', error);
            throw error;
        }
    }

    /**
     * Get default payment method for user
     */
    static async getDefault(userId) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM user_payment_methods WHERE user_id = ? AND is_default = TRUE',
                [userId]
            );
            return rows[0] || null;
        } catch (error) {
            logger.error('Error fetching default payment method:', error);
            throw error;
        }
    }

    /**
     * Count payment methods for a user
     */
    static async countByUserId(userId) {
        try {
            const [rows] = await db.execute(
                'SELECT COUNT(*) as count FROM user_payment_methods WHERE user_id = ?',
                [userId]
            );
            return rows[0].count;
        } catch (error) {
            logger.error('Error counting payment methods:', error);
            throw error;
        }
    }
}

module.exports = PaymentMethodModel;
