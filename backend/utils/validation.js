/**
 * Validation utilities for user data
 */

// US State abbreviations (all 50 states + DC + territories)
const VALID_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
];

/**
 * Validate SSN format (###-##-####)
 * @param {string} ssn - Social Security Number
 * @returns {Object} { valid: boolean, error: string }
 */
const validateSSN = (ssn) => {
  if (!ssn || ssn.trim() === '') {
    return { valid: false, error: 'SSN is required' };
  }

  // Remove any whitespace
  const cleanSSN = ssn.trim();

  // Check format: ###-##-####
  const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
  if (!ssnRegex.test(cleanSSN)) {
    return { valid: false, error: 'SSN must be in format ###-##-####' };
  }

  // Extract parts
  const parts = cleanSSN.split('-');
  const area = parts[0];
  const group = parts[1];
  const serial = parts[2];

  // Invalid area numbers (according to SSA rules)
  if (area === '000' || area === '666' || parseInt(area) >= 900) {
    return { valid: false, error: 'Invalid SSN area number' };
  }

  // Group and serial cannot be all zeros
  if (group === '00' || serial === '0000') {
    return { valid: false, error: 'Invalid SSN format' };
  }

  return { valid: true, error: null };
};

/**
 * Validate ZIP code format (##### or #####-####)
 * @param {string} zipCode - ZIP code
 * @returns {Object} { valid: boolean, error: string }
 */
const validateZipCode = (zipCode) => {
  if (!zipCode || zipCode.trim() === '') {
    return { valid: false, error: 'ZIP code is required' };
  }

  const cleanZip = zipCode.trim();

  // Check format: ##### or #####-####
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(cleanZip)) {
    return { valid: false, error: 'ZIP code must be in format ##### or #####-####' };
  }

  return { valid: true, error: null };
};

/**
 * Validate US state abbreviation
 * @param {string} state - Two-letter state code
 * @returns {Object} { valid: boolean, error: string }
 */
const validateState = (state) => {
  if (!state || state.trim() === '') {
    return { valid: false, error: 'State is required' };
  }

  const upperState = state.trim().toUpperCase();

  if (upperState.length !== 2) {
    return { valid: false, error: 'State must be a 2-letter abbreviation' };
  }

  if (!VALID_STATES.includes(upperState)) {
    return { valid: false, error: 'Invalid state abbreviation' };
  }

  return { valid: true, error: null };
};

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {Object} { valid: boolean, error: string }
 */
const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true, error: null };
};

/**
 * Validate phone number (US format)
 * @param {string} phone - Phone number
 * @returns {Object} { valid: boolean, error: string }
 */
const validatePhone = (phone) => {
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Phone number is required' };
  }

  // Accept formats: (123) 456-7890, 123-456-7890, 1234567890
  const phoneRegex = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
  if (!phoneRegex.test(phone.trim())) {
    return { valid: false, error: 'Invalid phone number format' };
  }

  return { valid: true, error: null };
};

/**
 * Validate credit card last 4 digits
 * @param {string} last4 - Last 4 digits of credit card
 * @returns {Object} { valid: boolean, error: string }
 */
const validateCreditCardLast4 = (last4) => {
  if (!last4 || last4.trim() === '') {
    return { valid: true, error: null }; // Optional field
  }

  const digitRegex = /^\d{4}$/;
  if (!digitRegex.test(last4.trim())) {
    return { valid: false, error: 'Credit card last 4 must be exactly 4 digits' };
  }

  return { valid: true, error: null };
};

/**
 * Validate complete user profile data
 * @param {Object} userData - User data object
 * @returns {Object} { valid: boolean, errors: Object }
 */
const validateUserProfile = (userData) => {
  const errors = {};

  // Email validation
  if (userData.email) {
    const emailCheck = validateEmail(userData.email);
    if (!emailCheck.valid) errors.email = emailCheck.error;
  }

  // SSN validation (if provided)
  if (userData.ssn) {
    const ssnCheck = validateSSN(userData.ssn);
    if (!ssnCheck.valid) errors.ssn = ssnCheck.error;
  }

  // ZIP code validation (if provided)
  if (userData.zip_code) {
    const zipCheck = validateZipCode(userData.zip_code);
    if (!zipCheck.valid) errors.zip_code = zipCheck.error;
  }

  // State validation (if provided)
  if (userData.state) {
    const stateCheck = validateState(userData.state);
    if (!stateCheck.valid) errors.state = stateCheck.error;
  }

  // Phone validation (if provided)
  if (userData.phone) {
    const phoneCheck = validatePhone(userData.phone);
    if (!phoneCheck.valid) errors.phone = phoneCheck.error;
  }

  // Credit card last 4 validation (if provided)
  if (userData.credit_card_last4) {
    const ccCheck = validateCreditCardLast4(userData.credit_card_last4);
    if (!ccCheck.valid) errors.credit_card_last4 = ccCheck.error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  validateSSN,
  validateZipCode,
  validateState,
  validateEmail,
  validatePhone,
  validateCreditCardLast4,
  validateUserProfile,
  VALID_STATES
};
