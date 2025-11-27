/**
 * Mock Payment Service
 * Simulates payment processing validation
 */

const processPayment = async (paymentDetails, amount) => {
    return new Promise((resolve, reject) => {
        // Simulate network delay
        setTimeout(() => {
            const { cardNumber, expiryDate, cvv } = paymentDetails;

            // Basic Validation
            if (!cardNumber || !expiryDate || !cvv) {
                return reject({ status: 'error', message: 'Incomplete payment details' });
            }

            // Clean card number
            const cleanCard = cardNumber.replace(/\D/g, '');

            // Validate Card Number Length
            if (cleanCard.length !== 16) {
                return reject({ status: 'error', message: 'Invalid card number length' });
            }

            // Validate Expiry (MM/YY)
            const [month, year] = expiryDate.split('/');
            if (!month || !year) {
                return reject({ status: 'error', message: 'Invalid expiry date format' });
            }

            const now = new Date();
            const currentYear = parseInt(now.getFullYear().toString().substr(-2));
            const currentMonth = now.getMonth() + 1;

            if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
                return reject({ status: 'error', message: 'Card has expired' });
            }

            // MOCK LOGIC: Decline cards ending in 0000
            if (cleanCard.endsWith('0000')) {
                return reject({ status: 'declined', message: 'Payment declined by bank. Please enter valid card details.' });
            }

            // Success
            resolve({
                status: 'approved',
                transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                amount: amount,
                timestamp: new Date().toISOString()
            });

        }, 1000); // 1 second delay
    });
};

module.exports = {
    processPayment
};
