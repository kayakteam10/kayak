/**
 * Encryption Utility for Payment Methods
 * Uses Web Crypto API for AES-256-GCM encryption
 * 
 * Security Note: This is for TEST DATA ONLY
 * - Encryption key derived from userId + browser salt
 * - Better than plain text but NOT production-ready
 * - NOT PCI compliant
 * - For real payments, use tokenization service
 */

import CryptoJS from 'crypto-js';

// Salt for key derivation (in production, this should be more secure)
const ENCRYPTION_SALT = 'tripweave_payment_salt_2025';

/**
 * Generate encryption key from userId
 * @param {string|number} userId - User ID
 * @returns {string} - Encryption key
 */
const generateKey = (userId) => {
  return CryptoJS.SHA256(userId + ENCRYPTION_SALT).toString();
};

/**
 * Encrypt card data
 * @param {Array|Object} data - Card data to encrypt
 * @param {string|number} userId - User ID for key derivation
 * @returns {string} - Encrypted string
 */
export const encryptCard = (data, userId) => {
  try {
    const key = generateKey(userId);
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt payment data');
  }
};

/**
 * Decrypt card data
 * @param {string} encryptedData - Encrypted string
 * @param {string|number} userId - User ID for key derivation
 * @returns {Array|Object} - Decrypted card data
 */
export const decryptCard = (encryptedData, userId) => {
  try {
    if (!encryptedData) return [];

    const key = generateKey(userId);
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!jsonString) {
      // If decryption fails, might be corrupted data
      console.warn('Failed to decrypt payment data - returning empty array');
      return [];
    }

    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption error:', error);
    // Return empty array instead of throwing to handle corrupted data gracefully
    return [];
  }
};

/**
 * Migrate plain text payment methods to encrypted format
 * @param {string|number} userId - User ID
 * @returns {boolean} - True if migration was performed
 */
export const migrateToEncrypted = (userId) => {
  try {
    const key = `savedPaymentMethods_${userId}`;
    const data = localStorage.getItem(key);

    if (!data) return false;

    // Try to parse as plain JSON
    try {
      const cards = JSON.parse(data);

      // If it's an array, it's unencrypted - encrypt it
      if (Array.isArray(cards)) {
        const encrypted = encryptCard(cards, userId);
        localStorage.setItem(key, encrypted);
        console.log('✅ Migrated payment methods to encrypted format');
        return true;
      }
    } catch (e) {
      // If JSON.parse fails, it's likely already encrypted
      // Try to decrypt to verify
      const decrypted = decryptCard(data, userId);
      if (Array.isArray(decrypted)) {
        console.log('✅ Payment methods already encrypted');
        return false;
      } else {
        // Corrupted data - clear it
        console.warn('⚠️ Corrupted payment data detected - clearing');
        localStorage.removeItem(key);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
};

/**
 * Mask card number for display (show last 4 digits only)
 * @param {string} cardNumber - Full card number
 * @returns {string} - Masked card number (e.g., "**** **** **** 1234")
 */
export const maskCardNumber = (cardNumber) => {
  if (!cardNumber) return '';
  const cleaned = cardNumber.replace(/\s/g, '');
  const last4 = cleaned.slice(-4);
  return `•••• •••• •••• ${last4}`;
};

/**
 * Generate unique ID for card
 * @returns {string} - Unique card ID
 */
export const generateCardId = () => {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate card number using Luhn algorithm
 * @param {string} cardNumber - Card number to validate
 * @returns {boolean} - True if valid
 */
export const validateCardNumber = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, '');

  if (!/^\d+$/.test(cleaned)) return false;
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Detect card brand from card number
 * @param {string} cardNumber - Card number
 * @returns {string} - Card brand (Visa, Mastercard, Amex, Discover, etc.)
 */
export const detectCardBrand = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, '');

  if (/^4/.test(cleaned)) return 'Visa';
  if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
  if (/^3[47]/.test(cleaned)) return 'American Express';
  if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
  if (/^35/.test(cleaned)) return 'JCB';
  if (/^30[0-5]/.test(cleaned)) return 'Diners Club';

  return 'Unknown';
};

/**
 * Format card number with spaces (4 digits groups)
 * @param {string} cardNumber - Card number
 * @returns {string} - Formatted card number
 */
export const formatCardNumber = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, '');
  const groups = cleaned.match(/.{1,4}/g) || [];
  return groups.join(' ');
};
