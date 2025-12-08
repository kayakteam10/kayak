import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { carsAPI, authAPI, bookingsAPI } from '../services/api';
import { FaCar, FaMapMarkerAlt, FaCalendar, FaClock, FaUsers, FaCreditCard, FaLock } from 'react-icons/fa';
import './CarBookingPage.css';

function CarBookingPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  // Booking details from URL params
  const pickupLocation = searchParams.get('pickupLocation') || '';
  const dropoffLocation = searchParams.get('dropoffLocation') || '';
  const pickupDate = searchParams.get('pickupDate') || '';
  const dropoffDate = searchParams.get('dropoffDate') || '';
  const pickupTime = searchParams.get('pickupTime') || '10:00';
  const dropoffTime = searchParams.get('dropoffTime') || '10:00';

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    cardType: '',
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    billingAddress: '',
    city: '',
    zipCode: '',
    country: ''
  });

  // Saved payment methods state
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [useNewCard, setUseNewCard] = useState(false);

  // Calculate rental days
  const calculateRentalDays = () => {
    if (!pickupDate || !dropoffDate) return 1;
    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    const diffTime = Math.abs(dropoff - pickup);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const rentalDays = calculateRentalDays();

  useEffect(() => {
    const fetchCarDetails = async () => {
      try {
        setLoading(true);
        const response = await carsAPI.getById(id);
        setCar(response.data.data || response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching car details:', err);
        setError('Failed to load car details. Please try again.');
        setLoading(false);
      }
    };

    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await authAPI.me();
          const userData = response.data.data || response.data;

          setPaymentForm(prev => ({
            ...prev,
            cardHolder: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            billingAddress: userData.address || '',
            city: userData.city || '',
            zipCode: userData.zipCode || '',
            country: userData.country || 'US' // Default to US if not present
          }));

          // Get saved payment methods from localStorage
          const savedPayments = localStorage.getItem('savedPaymentMethods');
          if (savedPayments) {
            try {
              let paymentMethods = JSON.parse(savedPayments);
              // Filter only card payments
              paymentMethods = paymentMethods.filter(p => p.paymentType === 'card');
              setSavedPaymentMethods(paymentMethods);

              if (paymentMethods.length > 0) {
                // Select the first card by default
                const firstCard = paymentMethods[0];
                handleSelectSavedCard(firstCard, 0);
              } else {
                setUseNewCard(true);
              }
            } catch (e) {
              console.error('Error parsing saved payments:', e);
              setUseNewCard(true);
            }
          } else {
            setUseNewCard(true);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    if (id) {
      fetchCarDetails();
      fetchUserProfile();
    }
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\s/g, '');
    if (value.length <= 16 && /^\d*$/.test(value)) {
      setPaymentForm(prev => ({
        ...prev,
        cardNumber: formatCardNumber(value)
      }));
    }
  };

  const handleCVVChange = (e) => {
    const value = e.target.value;
    const isAmex = paymentForm.cardType === 'American Express';
    const maxLength = isAmex ? 4 : 3;

    if (value.length <= maxLength && /^\d*$/.test(value)) {
      setPaymentForm(prev => ({
        ...prev,
        cvv: value
      }));
    }
  };

  // Handle selecting a saved payment method
  const handleSelectSavedCard = (card, index) => {
    setSelectedPaymentMethod(index);
    setUseNewCard(false);
    setPaymentForm(prev => ({
      ...prev,
      cardType: card.creditCardType || '',
      cardNumber: card.creditCardNumber || '',
      expiryMonth: card.expiryMonth || '',
      expiryYear: card.expiryYear ? card.expiryYear.toString() : '',
      billingAddress: card.billingAddress || prev.billingAddress,
      city: card.billingCity || prev.city,
      zipCode: card.billingZip || prev.zipCode,
      cvv: card.cvv || '',
      // Keep existing cardholder if not in saved card (usually not saved)
      cardHolder: prev.cardHolder
    }));
  };

  // Handle using a new card
  const handleUseNewCard = () => {
    setUseNewCard(true);
    setSelectedPaymentMethod(null);
    setPaymentForm(prev => ({
      ...prev,
      cardType: '',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: ''
    }));
  };

  const validateForm = () => {
    if (!paymentForm.cardType) {
      alert('Please select a card type');
      return false;
    }
    if (!paymentForm.cardNumber || paymentForm.cardNumber.replace(/\s/g, '').length !== 16) {
      alert('Please enter a valid 16-digit card number');
      return false;
    }
    if (!paymentForm.cardHolder.trim()) {
      alert('Please enter the cardholder name');
      return false;
    }
    if (!paymentForm.expiryMonth || !paymentForm.expiryYear) {
      alert('Please enter the card expiry date');
      return false;
    }
    const isAmex = paymentForm.cardType === 'American Express';
    const requiredCvvLength = isAmex ? 4 : 3;
    if (!paymentForm.cvv || paymentForm.cvv.length !== requiredCvvLength) {
      alert(`Please enter a valid ${requiredCvvLength}-digit CVV`);
      return false;
    }
    if (!paymentForm.billingAddress.trim() || !paymentForm.city.trim() ||
      !paymentForm.zipCode.trim() || !paymentForm.country.trim()) {
      alert('Please fill in all billing address fields');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setProcessing(true);

    try {
      // Get user ID from local storage or auth context (assuming token has user info or we fetched it)
      // We fetched user profile earlier, but didn't store ID. Let's rely on authAPI.me() again or store it.
      // Better: fetch user ID if not available.
      // For now, let's assume we can get it from the token or a stored user object.
      // Actually, we can just call authAPI.me() again or store user in state.

      // Let's use a hardcoded ID for now if we can't find it, or better, fetch it.
      // But wait, we fetched user profile in useEffect. Let's store the full user object.

      // Re-fetch user to get ID (or use the one from state if we added it)
      const userResponse = await authAPI.me();
      const user = userResponse.data.data || userResponse.data;

      const bookingPayload = {
        user_id: user.userId || user.id,
        booking_type: 'car',
        total_amount: totalPrice,
        payment_method: 'credit_card',
        booking_details: {
          car_id: parseInt(id),
          car_model: car.model,
          car_company: car.company,
          pickupLocation: pickupLocation,
          returnLocation: dropoffLocation,
          pickupDate: pickupDate,
          returnDate: dropoffDate,
          pickupTime: pickupTime,
          returnTime: dropoffTime,
          rentalDays: rentalDays,
          pricePerDay: dailyRate
        }
      };

      console.log('Creating car booking via Booking Service:', bookingPayload);

      // Call the booking API (Booking Service)
      const response = await bookingsAPI.create(bookingPayload);

      console.log('Booking response:', response.data);

      if (response.data && response.data.success) {
        // The booking service returns { data: { bookingId, booking_reference, ... } }
        const bookingId = response.data.data.bookingId || response.data.data.id;
        setProcessing(false);
        // Navigate to confirmation page like flights and hotels
        navigate(`/booking/confirmation/cars/${bookingId}`);
      } else {
        throw new Error('Booking failed');
      }

    } catch (err) {
      console.error('Error creating booking:', err);
      const errorMessage = err.response?.data?.error || 'Failed to complete booking. Please try again.';
      alert(errorMessage);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="car-booking-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading car details...</p>
        </div>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="car-booking-page">
        <div className="error-container">
          <p>{error || 'Car not found'}</p>
          <button onClick={() => navigate(-1)} className="back-btn">Go Back</button>
        </div>
      </div>
    );
  }

  const dailyRate = parseFloat(car.daily_rental_price) || 0;
  const totalPrice = dailyRate * rentalDays;

  return (
    <div className="car-booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <h1>Complete Your Car Rental</h1>
          <button onClick={() => navigate(-1)} className="back-link">← Back to Results</button>
        </div>

        <div className="booking-content">
          {/* Left Column: Booking Summary */}
          <div className="booking-summary-section">
            <div className="summary-card">
              <h2>Booking Summary</h2>

              {/* Car Details */}
              <div className="car-info">
                {car.image_url && (
                  <img src={car.image_url} alt={car.model} className="car-summary-image" />
                )}
                <div className="car-details">
                  <h3>{car.model}</h3>
                  <p className="car-company">{car.company} • {car.year}</p>
                  <div className="car-features">
                    <span className="feature">
                      <FaCar /> {car.car_type}
                    </span>
                    <span className="feature">
                      <FaUsers /> {car.num_seats} seats
                    </span>
                    <span className="feature">
                      {car.transmission}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rental Details */}
              <div className="rental-details">
                <h3>Rental Details</h3>

                <div className="detail-row">
                  <div className="detail-item">
                    <div className="detail-label">
                      <FaMapMarkerAlt /> Pick-up Location
                    </div>
                    <div className="detail-value">{pickupLocation}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">
                      <FaCalendar /> Pick-up Date
                    </div>
                    <div className="detail-value">
                      {new Date(pickupDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">
                      <FaClock /> Pick-up Time
                    </div>
                    <div className="detail-value">{pickupTime}</div>
                  </div>
                </div>

                <div className="location-divider">→</div>

                <div className="detail-row">
                  <div className="detail-item">
                    <div className="detail-label">
                      <FaMapMarkerAlt /> Drop-off Location
                    </div>
                    <div className="detail-value">{dropoffLocation}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">
                      <FaCalendar /> Drop-off Date
                    </div>
                    <div className="detail-value">
                      {new Date(dropoffDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">
                      <FaClock /> Drop-off Time
                    </div>
                    <div className="detail-value">{dropoffTime}</div>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="price-breakdown">
                <h3>Price Breakdown</h3>
                <div className="price-row">
                  <span>Daily Rate</span>
                  <span>${dailyRate.toFixed(2)}</span>
                </div>
                <div className="price-row">
                  <span>Number of Days</span>
                  <span>{rentalDays} {rentalDays === 1 ? 'day' : 'days'}</span>
                </div>
                <div className="price-row subtotal">
                  <span>Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="price-row">
                  <span>Taxes & Fees</span>
                  <span>${(totalPrice * 0.15).toFixed(2)}</span>
                </div>
                <div className="price-row total">
                  <span>Total Amount</span>
                  <span>${(totalPrice * 1.15).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Form */}
          <div className="payment-section">
            <div className="payment-card">
              <div className="payment-header">
                <FaCreditCard />
                <h2>Payment Details</h2>
              </div>
              <div className="secure-badge">
                <FaLock /> Secure Payment
              </div>

              {/* Saved Payment Methods Selection */}
              {savedPaymentMethods.length > 0 && (
                <div className="saved-cards-section">
                  <h3 className="form-section-title">Select payment method</h3>
                  <div className="payment-method-selector">
                    {savedPaymentMethods.map((card, index) => (
                      <label
                        key={index}
                        className={`payment-radio-option ${selectedPaymentMethod === index ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={selectedPaymentMethod === index}
                          onChange={() => handleSelectSavedCard(card, index)}
                        />
                        <div className="radio-content">
                          <div className="card-brand-icon-box">
                            {card.creditCardType === 'Visa' && (
                              <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                <rect width="52" height="34" rx="5" fill="#1434CB" />
                                <text x="26" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">VISA</text>
                              </svg>
                            )}
                            {card.creditCardType === 'MasterCard' && (
                              <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                <rect width="52" height="34" rx="5" fill="#EB001B" />
                                <circle cx="20" cy="17" r="10" fill="#FF5F00" />
                                <circle cx="32" cy="17" r="10" fill="#F79E1B" />
                              </svg>
                            )}
                            {card.creditCardType === 'American Express' && (
                              <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                <rect width="52" height="34" rx="5" fill="#006FCF" />
                                <text x="26" y="21" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">AMEX</text>
                              </svg>
                            )}
                            {card.creditCardType === 'Discover' && (
                              <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                <rect width="52" height="34" rx="5" fill="#FF6000" />
                                <circle cx="15" cy="17" r="8" fill="#FF9900" />
                                <text x="35" y="21" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">DISCOVER</text>
                              </svg>
                            )}
                            {!['Visa', 'MasterCard', 'American Express', 'Discover'].includes(card.creditCardType) && (
                              <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                <rect width="52" height="34" rx="5" fill="#6B7280" />
                                <rect x="8" y="10" width="36" height="6" rx="2" fill="white" opacity="0.3" />
                                <rect x="8" y="20" width="20" height="4" rx="1" fill="white" opacity="0.5" />
                              </svg>
                            )}
                          </div>
                          <div className="card-info">
                            <span className="card-label">{card.creditCardType}</span>
                            <span className="card-ending">•••• •••• •••• {card.creditCardNumber.slice(-4)}</span>
                          </div>
                        </div>
                        {selectedPaymentMethod === index && <span className="radio-check">✓</span>}
                      </label>
                    ))}

                    {/* Use New Card Option */}
                    <label className={`payment-radio-option add-new-card-option ${useNewCard ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={useNewCard}
                        onChange={handleUseNewCard}
                      />
                      <div className="radio-content">
                        <div className="card-brand-icon-box new-card-box">
                          <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                            <rect width="52" height="34" rx="5" fill="#FF6B35" opacity="0.1" stroke="#FF6B35" strokeWidth="2" strokeDasharray="4 4" />
                            <circle cx="26" cy="17" r="8" fill="#FF6B35" opacity="0.2" />
                            <path d="M26 13V21M22 17H30" stroke="#FF6B35" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div className="card-info">
                          <span className="card-label">Add new card</span>
                          <span className="card-ending">Enter card details below</span>
                        </div>
                      </div>
                      {useNewCard && <span className="radio-check">✓</span>}
                    </label>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="payment-form">
                {/* Card Details Form - Only show if using new card or no saved cards */}
                {(useNewCard || savedPaymentMethods.length === 0) && (
                  <div className="card-details-form">
                    <h3 className="form-section-title">Card details</h3>

                    <div className="accepted-cards">
                      <span className="accepted-label">We accept:</span>
                      <div className="card-brands">
                        <svg width="50" height="32" viewBox="0 0 50 32" className="card-brand-logo">
                          <rect width="50" height="32" rx="4" fill="#1434CB" />
                          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">VISA</text>
                        </svg>
                        <svg width="50" height="32" viewBox="0 0 50 32" className="card-brand-logo">
                          <rect width="50" height="32" rx="4" fill="#EB001B" />
                          <circle cx="18" cy="16" r="10" fill="#FF5F00" />
                          <circle cx="32" cy="16" r="10" fill="#F79E1B" />
                        </svg>
                        <svg width="50" height="32" viewBox="0 0 50 32" className="card-brand-logo">
                          <rect width="50" height="32" rx="4" fill="#006FCF" />
                          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AMEX</text>
                        </svg>
                        <svg width="50" height="32" viewBox="0 0 50 32" className="card-brand-logo">
                          <rect width="50" height="32" rx="4" fill="#FF6000" />
                          <circle cx="15" cy="16" r="8" fill="#FF9900" />
                          <text x="60%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">DISCOVER</text>
                        </svg>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group-full">
                        <label>Card Type *</label>
                        <select
                          value={paymentForm.cardType || ''}
                          onChange={(e) => setPaymentForm({ ...paymentForm, cardType: e.target.value })}
                          required
                        >
                          <option value="">Select card type</option>
                          <option value="Visa">Visa</option>
                          <option value="MasterCard">MasterCard</option>
                          <option value="American Express">American Express</option>
                          <option value="Discover">Discover</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group-full">
                        <label htmlFor="cardHolder">Name on card *</label>
                        <input
                          type="text"
                          id="cardHolder"
                          name="cardHolder"
                          value={paymentForm.cardHolder}
                          onChange={handleInputChange}
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group-full">
                        <label htmlFor="cardNumber">Card number *</label>
                        <input
                          type="text"
                          id="cardNumber"
                          name="cardNumber"
                          value={paymentForm.cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="0000 0000 0000 0000"
                          maxLength="19"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row form-row-split">
                      <div className="form-group">
                        <label htmlFor="expiryMonth">Expiration date *</label>
                        <div className="expiry-inputs">
                          <select
                            id="expiryMonth"
                            name="expiryMonth"
                            value={paymentForm.expiryMonth}
                            onChange={handleInputChange}
                            required
                          >
                            <option value="">MM</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                              <option key={month} value={month.toString().padStart(2, '0')}>
                                {month.toString().padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                          <span>/</span>
                          <select
                            id="expiryYear"
                            name="expiryYear"
                            value={paymentForm.expiryYear}
                            onChange={handleInputChange}
                            required
                          >
                            <option value="">YY</option>
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                              <option key={year} value={year.toString().slice(-2)}>
                                {year.toString().slice(-2)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="cvv">Security code *</label>
                        <input
                          type="text"
                          id="cvv"
                          name="cvv"
                          value={paymentForm.cvv}
                          onChange={handleCVVChange}
                          placeholder="CVV"
                          maxLength={paymentForm.cardType === 'American Express' ? 4 : 3}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Billing Address - Only show if using new card or no saved cards */}
                {(useNewCard || savedPaymentMethods.length === 0) && (
                  <div className="billing-address-form">
                    <h3 className="form-section-title">Billing address</h3>

                    <div className="form-row">
                      <div className="form-group-full">
                        <label htmlFor="billingAddress">Street Address *</label>
                        <input
                          type="text"
                          id="billingAddress"
                          name="billingAddress"
                          value={paymentForm.billingAddress}
                          onChange={handleInputChange}
                          placeholder="123 Main Street"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row form-row-split">
                      <div className="form-group">
                        <label htmlFor="city">City *</label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={paymentForm.city}
                          onChange={handleInputChange}
                          placeholder="San Francisco"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="zipCode">ZIP Code *</label>
                        <input
                          type="text"
                          id="zipCode"
                          name="zipCode"
                          value={paymentForm.zipCode}
                          onChange={handleInputChange}
                          placeholder="94105"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group-full">
                        <label htmlFor="country">Country *</label>
                        <select
                          id="country"
                          name="country"
                          value={paymentForm.country}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select Country</option>
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="UK">United Kingdom</option>
                          <option value="AU">Australia</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <div className="btn-spinner"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaLock /> Complete Booking - ${(totalPrice * 1.15).toFixed(2)}
                    </>
                  )}
                </button>

                <p className="security-note">
                  Your payment information is encrypted and secure. We never store your full card details.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div >
    </div >
  );
}

export default CarBookingPage;
