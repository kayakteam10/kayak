/**
 * Simple Card Input Component
 * Plain HTML form for card entry (NO Stripe SDK)
 * Includes client-side validation and card type detection
 */

import React, { useState } from 'react';
import {
  validateCardNumber,
  detectCardBrand,
  formatCardNumber,
  generateCardId
} from '../utils/encryption';
import './SimpleCardInput.css';

const SimpleCardInput = ({ onSuccess, onError, buttonText = 'Save Card' }) => {
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: ''
  });

  const [errors, setErrors] = useState({});
  const [cardBrand, setCardBrand] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\s/g, '');

    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    // Limit to 19 digits (max card length)
    if (value.length > 19) return;

    // Format with spaces
    const formatted = formatCardNumber(value);

    setFormData({ ...formData, cardNumber: formatted });
    setCardBrand(detectCardBrand(value));

    // Clear error when user types
    if (errors.cardNumber) {
      setErrors({ ...errors, cardNumber: '' });
    }
  };

  const handleExpiryChange = (field, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    if (field === 'expiryMonth') {
      // Limit to 2 digits, max 12
      if (value.length > 2) return;
      if (parseInt(value) > 12) return;
      setFormData({ ...formData, expiryMonth: value });
    } else {
      // Limit to 4 digits
      if (value.length > 4) return;
      setFormData({ ...formData, expiryYear: value });
    }

    if (errors.expiry) {
      setErrors({ ...errors, expiry: '' });
    }
  };

  const handleCVVChange = (e) => {
    let value = e.target.value;

    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    // Limit to exactly 3 digits
    if (value.length > 3) return;

    setFormData({ ...formData, cvv: value });

    if (errors.cvv) {
      setErrors({ ...errors, cvv: '' });
    }
  };

  const validate = () => {
    const newErrors = {};

    // Validate card number (lenient for test payments)
    const cleanedCard = formData.cardNumber.replace(/\s/g, '');
    if (!cleanedCard) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cleanedCard.length < 13 || cleanedCard.length > 19) {
      newErrors.cardNumber = 'Card number must be 13-19 digits';
    } else if (!/^\d+$/.test(cleanedCard)) {
      newErrors.cardNumber = 'Card number must contain only digits';
    }
    // Note: Skip Luhn validation for test payments

    // Validate expiry
    if (!formData.expiryMonth || !formData.expiryYear) {
      newErrors.expiry = 'Expiry date is required';
    } else {
      const month = parseInt(formData.expiryMonth);
      const year = parseInt(formData.expiryYear);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      if (month < 1 || month > 12) {
        newErrors.expiry = 'Invalid month';
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        newErrors.expiry = 'Card has expired';
      }
    }

    // Validate CVV
    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (formData.cvv.length !== 3) {
      newErrors.cvv = 'CVV must be exactly 3 digits';
    }

    // Validate cardholder name
    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    }

    // Validate billing info
    if (!formData.billingAddress.trim()) {
      newErrors.billingAddress = 'Billing address is required';
    }
    if (!formData.billingCity.trim()) {
      newErrors.billingCity = 'City is required';
    }
    if (!formData.billingState) {
      newErrors.billingState = 'State is required';
    }
    if (!formData.billingZip.trim()) {
      newErrors.billingZip = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.billingZip)) {
      newErrors.billingZip = 'Invalid ZIP code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      if (onError) {
        onError(new Error('Please fix validation errors'));
      }
      return;
    }

    setLoading(true);

    try {
      // Create card object in the format expected by the API
      const cardData = {
        creditCardNumber: formData.cardNumber.replace(/\s/g, ''),
        cardExpMonth: parseInt(formData.expiryMonth),
        cardExpYear: parseInt(formData.expiryYear),
        cvv: formData.cvv,
        billingName: formData.cardholderName,
        billingAddress: formData.billingAddress,
        billingCity: formData.billingCity,
        billingState: formData.billingState,
        billingZip: formData.billingZip,
        billingCountry: 'US',
        cardBrand: cardBrand || 'Unknown',
        setAsDefault: false
      };

      // Clear form
      setFormData({
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        cardholderName: '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingZip: ''
      });
      setCardBrand('');

      // Call success callback
      if (onSuccess) {
        onSuccess(cardData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Card input error:', error);
      if (onError) {
        onError(error);
      }
      setLoading(false);
    }
  };

  const USA_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  return (
    <form onSubmit={handleSubmit} className="simple-card-input-form">
      <div className="form-row">
        <div className="form-group full-width">
          <label>Card Number *</label>
          <div className="card-number-input">
            <input
              type="text"
              value={formData.cardNumber}
              onChange={handleCardNumberChange}
              placeholder="1234 5678 9012 3456"
              maxLength="19"
              className={errors.cardNumber ? 'error' : ''}
            />
            {cardBrand && (
              <span className="card-brand-indicator">{cardBrand}</span>
            )}
          </div>
          {errors.cardNumber && (
            <span className="error-message">{errors.cardNumber}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Expiry Month *</label>
          <input
            type="text"
            value={formData.expiryMonth}
            onChange={(e) => handleExpiryChange('expiryMonth', e.target.value)}
            placeholder="MM"
            maxLength="2"
            className={errors.expiry ? 'error' : ''}
          />
        </div>
        <div className="form-group">
          <label>Expiry Year *</label>
          <input
            type="text"
            value={formData.expiryYear}
            onChange={(e) => handleExpiryChange('expiryYear', e.target.value)}
            placeholder="YYYY"
            maxLength="4"
            className={errors.expiry ? 'error' : ''}
          />
        </div>
        <div className="form-group">
          <label>CVV *</label>
          <input
            type="text"
            value={formData.cvv}
            onChange={handleCVVChange}
            placeholder="123"
            maxLength="3"
            className={errors.cvv ? 'error' : ''}
          />
        </div>
      </div>
      {errors.expiry && (
        <span className="error-message">{errors.expiry}</span>
      )}
      {errors.cvv && (
        <span className="error-message">{errors.cvv}</span>
      )}

      <div className="form-row">
        <div className="form-group full-width">
          <label>Cardholder Name *</label>
          <input
            type="text"
            value={formData.cardholderName}
            onChange={(e) => setFormData({ ...formData, cardholderName: e.target.value })}
            placeholder="John Doe"
            className={errors.cardholderName ? 'error' : ''}
          />
          {errors.cardholderName && (
            <span className="error-message">{errors.cardholderName}</span>
          )}
        </div>
      </div>

      <div className="billing-section">
        <h4>Billing Address</h4>

        <div className="form-row">
          <div className="form-group full-width">
            <label>Street Address *</label>
            <input
              type="text"
              value={formData.billingAddress}
              onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
              placeholder="123 Main St"
              className={errors.billingAddress ? 'error' : ''}
            />
            {errors.billingAddress && (
              <span className="error-message">{errors.billingAddress}</span>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>City *</label>
            <input
              type="text"
              value={formData.billingCity}
              onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
              placeholder="San Francisco"
              className={errors.billingCity ? 'error' : ''}
            />
            {errors.billingCity && (
              <span className="error-message">{errors.billingCity}</span>
            )}
          </div>
          <div className="form-group">
            <label>State *</label>
            <select
              value={formData.billingState}
              onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
              className={errors.billingState ? 'error' : ''}
            >
              <option value="">Select State</option>
              {USA_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {errors.billingState && (
              <span className="error-message">{errors.billingState}</span>
            )}
          </div>
          <div className="form-group">
            <label>ZIP Code *</label>
            <input
              type="text"
              value={formData.billingZip}
              onChange={(e) => setFormData({ ...formData, billingZip: e.target.value })}
              placeholder="94102"
              className={errors.billingZip ? 'error' : ''}
            />
            {errors.billingZip && (
              <span className="error-message">{errors.billingZip}</span>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="btn-save-card"
        disabled={loading}
      >
        {loading ? 'Saving...' : buttonText}
      </button>

      <p className="test-card-note">
        💡 <strong>Test Payment System:</strong> Use test card numbers only (e.g., 4111 1111 1111 1111).
        No actual charges will be made.
      </p>
    </form>
  );
};

export default SimpleCardInput;
