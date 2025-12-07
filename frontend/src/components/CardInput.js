/**
 * Card Input Component
 * Stripe CardElement for secure card entry
 */

import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './CardInput.css';

const CardInput = ({ onSuccess, onError, buttonText = 'Save Card' }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setCardError(null);

    try {
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      });

      if (error) {
        setCardError(error.message);
        if (onError) onError(error);
        setLoading(false);
        return;
      }

      // Send payment method to backend
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_method_id: paymentMethod.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save card');
      }

      // Clear the form
      elements.getElement(CardElement).clear();

      if (onSuccess) onSuccess(data.data);
      setLoading(false);
    } catch (error) {
      setCardError(error.message);
      if (onError) onError(error);
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#32325d',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
    hidePostalCode: false,
  };

  return (
    <form onSubmit={handleSubmit} className="card-input-form">
      <div className="card-element-container">
        <CardElement options={cardElementOptions} />
      </div>

      {cardError && (
        <div className="card-error">
          <span className="error-icon">⚠️</span>
          {cardError}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="submit-card-button"
      >
        {loading ? 'Processing...' : buttonText}
      </button>
    </form>
  );
};

export default CardInput;
