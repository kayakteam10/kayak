import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const StripeProvider = ({ children }) => {
    const [stripePromise, setStripePromise] = useState(null);

    useEffect(() => {
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/api/payment-methods/config`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.publishableKey) {
                    setStripePromise(loadStripe(data.publishableKey));
                } else {
                    console.error('Failed to load Stripe publishable key');
                }
            })
            .catch(error => {
                console.error('Error fetching Stripe config:', error);
            });
    }, []);

    if (!stripePromise) {
        return <div>Loading payment system...</div>;
    }

    return (
        <Elements stripe={stripePromise}>
            {children}
        </Elements>
    );
};

export default StripeProvider;
