/**
 * Payment Methods API Service
 * Handles communication with backend for payment method management
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

/**
 * Get all payment methods for the current user
 */
export const getPaymentMethods = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/payment-methods`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        throw error;
    }
};

/**
 * Add a new payment method
 * @param {Object} cardData - Card details
 * @param {string} cardData.creditCardNumber - Full card number
 * @param {string} cardData.expiryDate - Expiry in MM/YY format
 * @param {string} cardData.cvv - CVV code
 * @param {string} cardData.billingName - Cardholder name
 * @param {string} cardData.billingAddress - Billing address
 * @param {string} cardData.billingCity - Billing city
 * @param {string} cardData.billingState - Billing state
 * @param {string} cardData.billingZip - Billing ZIP
 * @param {string} cardData.billingCountry - Billing country (default: US)
 * @param {string} cardData.cardBrand - Card brand (Visa, Mastercard, etc.)
 * @param {string} cardData.nickname - Optional nickname for the card
 * @param {boolean} cardData.setAsDefault - Set as default payment method
 */
export const addPaymentMethod = async (cardData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
            `${API_BASE_URL}/api/payment-methods`,
            cardData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error adding payment method:', error);
        throw error;
    }
};

/**
 * Set a payment method as default
 * @param {number} paymentMethodId - Payment method ID
 */
export const setDefaultPaymentMethod = async (paymentMethodId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.put(
            `${API_BASE_URL}/api/payment-methods/${paymentMethodId}/set-default`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error setting default payment method:', error);
        throw error;
    }
};

/**
 * Delete a payment method
 * @param {number} paymentMethodId - Payment method ID
 */
export const deletePaymentMethod = async (paymentMethodId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(
            `${API_BASE_URL}/api/payment-methods/${paymentMethodId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error deleting payment method:', error);
        throw error;
    }
};

/**
 * Mark a payment method as used (updates last_used_at)
 * @param {number} paymentMethodId - Payment method ID
 */
export const markPaymentMethodUsed = async (paymentMethodId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.put(
            `${API_BASE_URL}/api/payment-methods/${paymentMethodId}/mark-used`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error marking payment method as used:', error);
        // Don't throw - this is a non-critical operation
        console.warn('Failed to update payment method usage timestamp');
    }
};

export default {
    getPaymentMethods,
    addPaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
    markPaymentMethodUsed
};
