import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FaLock, FaCheckCircle, FaWifi, FaParking, FaSwimmingPool, FaDumbbell, FaSpa, FaUtensils, FaCoffee, FaBed } from 'react-icons/fa';
import { authAPI, hotelsAPI, bookingsAPI } from '../services/api';
import { getPaymentMethods, addPaymentMethod, markPaymentMethodUsed } from '../services/paymentMethodsAPI';
import './HotelBookingPage.css';

const HotelBookingPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [useNewCard, setUseNewCard] = useState(false);

  const [bookingData, setBookingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cardType: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    billingZip: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    cardholderName: ''
  });

  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const rooms = searchParams.get('rooms') || 1;
  const adults = searchParams.get('adults') || 2;
  const children = searchParams.get('children') || 0;

  // Fetch user profile and auto-populate data (like BookingPage)
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await authAPI.me();
          const userData = response.data.data || response.data;

          // Get saved payment methods from API
          try {
            const result = await getPaymentMethods();
            console.log('HotelBookingPage - API Response:', result);
            
            if (result.success) {
              const paymentMethods = result.data || [];
              console.log('HotelBookingPage - Loaded payment methods:', paymentMethods);
              setSavedPaymentMethods(paymentMethods);
              
              // If no cards, set useNewCard to true
              if (paymentMethods.length === 0) {
                console.log('HotelBookingPage - No saved cards, using new card');
                setUseNewCard(true);
              } else {
                console.log('HotelBookingPage - Found', paymentMethods.length, 'saved cards');
                setUseNewCard(false);
              }
            } else {
              console.log('HotelBookingPage - API returned success: false');
              setSavedPaymentMethods([]);
              setUseNewCard(true);
            }
          } catch (error) {
            console.error('HotelBookingPage - Error fetching payment methods:', error);
            setSavedPaymentMethods([]);
            setUseNewCard(true);
          }

          // Auto-populate booking data
          setBookingData(prevData => ({
            ...prevData,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            phone: userData.phone || '',
            billingAddress: userData.address || '',
            city: userData.city || '',
            state: userData.state || '',
            zipCode: userData.zipCode || ''
          }));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    fetchHotelDetails();
    fetchUserProfile();
  }, [id]);

  const fetchHotelDetails = async () => {
    try {
      const response = await hotelsAPI.getDetails(id);
      // API returns { success: true, data: { ... } }
      setHotel(response.data.data || response.data);
    } catch (err) {
      alert('Failed to load hotel details');
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  };

  const getHotelImage = (hotelName) => {
    const imageMap = {
      'Nob Hill Grand Hotel': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80',
      'Golden Gate Suites': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=400&q=80',
      'Hilton SF': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80'
    };
    return imageMap[hotelName] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80';
  };

  const getAmenityIcon = (amenity) => {
    const lower = amenity?.toLowerCase() || '';
    if (lower.includes('wifi')) return <FaWifi />;
    if (lower.includes('pool')) return <FaSwimmingPool />;
    if (lower.includes('gym')) return <FaDumbbell />;
    if (lower.includes('spa')) return <FaSpa />;
    if (lower.includes('parking')) return <FaParking />;
    if (lower.includes('breakfast')) return <FaUtensils />;
    return <FaCoffee />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getCancellationDate = () => {
    if (!checkIn) return '';
    const date = new Date(checkIn);
    date.setDate(date.getDate() - 1);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!bookingData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!bookingData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!bookingData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!bookingData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\d{10}$/.test(bookingData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be 10 digits';
    }

    // Only validate card details if using new card
    if (paymentMethod === 'card' && useNewCard) {
      if (!bookingData.cardType.trim()) {
        newErrors.cardType = 'Card type is required';
      }

      if (!bookingData.cardholderName.trim()) {
        newErrors.cardholderName = 'Cardholder name is required';
      }

      if (!bookingData.cardNumber.trim()) {
        newErrors.cardNumber = 'Card number is required';
      } else if (!/^\d{16}$/.test(bookingData.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Card number must be 16 digits';
      }

      if (!bookingData.expiryDate.trim()) {
        newErrors.expiryDate = 'Expiry date is required';
      } else if (!/^\d{2}\/\d{2}$/.test(bookingData.expiryDate)) {
        newErrors.expiryDate = 'Format must be MM/YY';
      }

      if (!bookingData.cvv.trim()) {
        newErrors.cvv = 'CVV is required';
      } else if (!/^\d{3}$/.test(bookingData.cvv)) {
        newErrors.cvv = 'CVV must be 3 digits';
      }

      if (!bookingData.billingZip.trim()) {
        newErrors.billingZip = 'ZIP code is required';
      } else if (!/^\d{5}$/.test(bookingData.billingZip)) {
        newErrors.billingZip = 'ZIP code must be 5 digits';
      }

      if (!bookingData.billingAddress.trim()) {
        newErrors.billingAddress = 'Billing address is required';
      }

      if (!bookingData.billingCity.trim()) {
        newErrors.billingCity = 'City is required';
      }

      if (!bookingData.billingState.trim()) {
        newErrors.billingState = 'State is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to complete booking');
        navigate('/login');
        return;
      }

      // Determine payment details based on whether using saved card or new card
      let paymentDetails = {
        method: paymentMethod
      };

      if (paymentMethod === 'card') {
        if (useNewCard || savedPaymentMethods.length === 0) {
          // Using new card - save to database via API
          const expiryParts = bookingData.expiryDate.split('/');
          const expiryMonth = expiryParts[0] || '';
          const expiryYear = expiryParts[1] || '';

          paymentDetails = {
            ...paymentDetails,
            cardNumber: bookingData.cardNumber,
            expiryDate: bookingData.expiryDate,
            cvv: bookingData.cvv,
            billingZip: bookingData.billingZip
          };

          // Save new payment method to database
          try {
            const cardData = {
              creditCardNumber: bookingData.cardNumber.replace(/\s/g, ''),
              cardExpMonth: parseInt(expiryMonth),
              cardExpYear: parseInt('20' + expiryYear),
              cvv: bookingData.cvv,
              billingName: `${bookingData.firstName} ${bookingData.lastName}`,
              billingAddress: bookingData.billingAddress,
              billingCity: bookingData.billingCity,
              billingState: bookingData.billingState,
              billingZip: bookingData.billingZip,
              billingCountry: 'US',
              cardBrand: bookingData.cardType,
              setAsDefault: savedPaymentMethods.length === 0
            };

            await addPaymentMethod(cardData);
            console.log('Payment method saved to database');
          } catch (error) {
            console.error('Error saving payment method:', error);
            // Don't block booking if save fails
          }
        } else if (selectedPaymentMethod !== null) {
          // Using saved card - mark as used
          const selectedCard = savedPaymentMethods[selectedPaymentMethod];
          if (selectedCard && selectedCard.id) {
            try {
              await markPaymentMethodUsed(selectedCard.id);
            } catch (error) {
              console.error('Error marking payment method as used:', error);
            }
          }
          
          paymentDetails = {
            ...paymentDetails,
            cardNumber: `************${selectedCard.card_last4}`,
            cardType: selectedCard.card_brand,
            expiryMonth: selectedCard.card_exp_month,
            expiryYear: selectedCard.card_exp_year
          };
        }
      }

      const response = await bookingsAPI.create({
        user_id: parseInt(localStorage.getItem('userId') || authAPI.getCurrentUser()?.userId),
        booking_type: 'hotel',
        total_amount: total,
        payment_method: 'credit_card',
        booking_details: {
          hotel_id: parseInt(id),
          check_in: checkIn,
          check_out: checkOut,
          rooms: parseInt(rooms),
          adults: parseInt(adults),
          children: parseInt(children),
          guest_details: {
            firstName: bookingData.firstName,
            lastName: bookingData.lastName,
            email: bookingData.email,
            phone: bookingData.phone
          },
          payment_details: paymentDetails
        }
      });

      // Extract booking ID from response
      const bookingId = response.data.data?.bookingId || response.data.data?.id || response.data.booking?.id || response.data.booking_id || response.data.id;
      navigate(`/hotel-confirmation/${bookingId}`);
    } catch (err) {
      alert(err.message || 'Booking failed. Please try again.');
      console.error(err);
    }
  };

  if (loading) return <div className="booking-loading">Loading...</div>;
  if (!hotel) return <div className="booking-error">Hotel not found</div>;

  const nights = calculateNights();
  const pricePerNight = Number(hotel.price_per_night) || 100;
  const subtotal = pricePerNight * nights * Number(rooms);
  const taxes = subtotal * 0.15;
  const total = subtotal + taxes;

  const amenities = Array.isArray(hotel.amenities)
    ? hotel.amenities
    : (typeof hotel.amenities === 'string' ? JSON.parse(hotel.amenities) : []);

  return (
    <div className="hotel-booking-page">
      <div className="booking-container">
        {/* Left Column - Booking Form */}
        <div className="booking-form-section">
          <div className="security-badge">
            <FaLock />
            <span>Safe, secure transactions. Your personal information is protected.</span>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Guest Information */}
            <section className="form-section">
              <h2>Guest information</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>First name *</label>
                  <input
                    type="text"
                    value={bookingData.firstName}
                    onChange={(e) => setBookingData({ ...bookingData, firstName: e.target.value })}
                    className={errors.firstName ? 'error' : ''}
                  />
                  {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                </div>
                <div className="form-group">
                  <label>Last name *</label>
                  <input
                    type="text"
                    value={bookingData.lastName}
                    onChange={(e) => setBookingData({ ...bookingData, lastName: e.target.value })}
                    className={errors.lastName ? 'error' : ''}
                  />
                  {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={bookingData.email}
                    onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                    placeholder="example@email.com"
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    value={bookingData.phone}
                    onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="1234567890"
                    maxLength="10"
                    className={errors.phone ? 'error' : ''}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="form-section">
              <h2>Payment Information</h2>
              
              {/* Debug: Show saved payment methods count */}
              {console.log('HotelBookingPage - Rendering payment section. Saved cards:', savedPaymentMethods.length, 'useNewCard:', useNewCard)}

              {/* Saved Payment Methods */}
              {savedPaymentMethods.length > 0 && (
                <div className="saved-cards-section">
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
                          onChange={() => {
                            setSelectedPaymentMethod(index);
                            setUseNewCard(false);
                            setPaymentMethod('card');
                          }}
                        />
                        <div className="radio-content">
                          <div className="card-brand-icon-box">
                            {card.card_brand === 'Visa' && (
                              <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                <rect width="52" height="34" rx="5" fill="#1A1F71" />
                                <text x="26" y="21" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">VISA</text>
                              </svg>
                            )}
                            {(card.card_brand === 'MasterCard' || card.card_brand === 'Mastercard') && (
                              <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                <rect width="52" height="34" rx="5" fill="#EB001B" />
                                <circle cx="20" cy="17" r="10" fill="#FF5F00" opacity="0.8" />
                                <circle cx="32" cy="17" r="10" fill="#F79E1B" opacity="0.8" />
                              </svg>
                            )}
                            {(card.card_brand === 'American Express' || card.card_brand === 'Amex') && (
                              <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                <rect width="52" height="34" rx="5" fill="#006FCF" />
                                <text x="26" y="21" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial">AMEX</text>
                              </svg>
                            )}
                            {card.card_brand === 'Discover' && (
                              <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                <rect width="52" height="34" rx="5" fill="#FF6000" />
                                <circle cx="15" cy="17" r="8" fill="#FF9900" />
                                <text x="35" y="21" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">DISCOVER</text>
                              </svg>
                            )}
                            {!['Visa', 'MasterCard', 'Mastercard', 'American Express', 'Amex', 'Discover'].includes(card.card_brand) && (
                              <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                <rect width="52" height="34" rx="5" fill="#6B7280" />
                                <rect x="8" y="10" width="36" height="6" rx="2" fill="white" opacity="0.3" />
                                <rect x="8" y="20" width="20" height="4" rx="1" fill="white" opacity="0.5" />
                              </svg>
                            )}
                          </div>
                          <div className="card-info">
                            <span className="card-label">{card.card_brand}</span>
                            <span className="card-ending">•••• •••• •••• {card.card_last4}</span>
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
                        onChange={() => {
                          setUseNewCard(true);
                          setSelectedPaymentMethod(null);
                          setPaymentMethod('card');
                        }}
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
                        value={bookingData.cardType || ''}
                        onChange={(e) => setBookingData({ ...bookingData, cardType: e.target.value })}
                        className={errors.cardType ? 'error' : ''}
                      >
                        <option value="">Select card type</option>
                        <option value="Visa">Visa</option>
                        <option value="MasterCard">MasterCard</option>
                        <option value="American Express">American Express</option>
                        <option value="Discover">Discover</option>
                      </select>
                      {errors.cardType && <span className="error-text">{errors.cardType}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group-full">
                      <label>Name on card *</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={bookingData.cardholderName || ''}
                        onChange={(e) => setBookingData({ ...bookingData, cardholderName: e.target.value })}
                        className={errors.cardholderName ? 'error' : ''}
                      />
                      {errors.cardholderName && <span className="error-text">{errors.cardholderName}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group-full">
                      <label>Card number *</label>
                      <input
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        value={bookingData.cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 16);
                          const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                          setBookingData({ ...bookingData, cardNumber: formatted });
                        }}
                        maxLength="19"
                        className={errors.cardNumber ? 'error' : ''}
                      />
                      {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
                    </div>
                  </div>

                  <div className="form-row form-row-split">
                    <div className="form-group">
                      <label>Expiration date *</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={bookingData.expiryDate}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 2) {
                            value = value.slice(0, 2) + '/' + value.slice(2, 4);
                          }
                          setBookingData({ ...bookingData, expiryDate: value });
                        }}
                        maxLength="5"
                        className={errors.expiryDate ? 'error' : ''}
                      />
                      {errors.expiryDate && <span className="error-text">{errors.expiryDate}</span>}
                    </div>
                    <div className="form-group">
                      <label>Security code *</label>
                      <input
                        type="text"
                        placeholder="CVV"
                        value={bookingData.cvv}
                        onChange={(e) => setBookingData({ ...bookingData, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                        maxLength="3"
                        className={errors.cvv ? 'error' : ''}
                      />
                      {errors.cvv && <span className="error-text">{errors.cvv}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group-full">
                      <label>Billing ZIP code *</label>
                      <input
                        type="text"
                        placeholder="12345"
                        value={bookingData.billingZip}
                        onChange={(e) => setBookingData({ ...bookingData, billingZip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                        maxLength="5"
                        className={errors.billingZip ? 'error' : ''}
                      />
                      {errors.billingZip && <span className="error-text">{errors.billingZip}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Address Section */}
              {(useNewCard || savedPaymentMethods.length === 0) && (
                <div className="billing-address-section">
                  <h3 className="form-section-title">Billing Address</h3>

                  <div className="form-row">
                    <div className="form-group-full">
                      <label>Street Address *</label>
                      <input
                        type="text"
                        placeholder="123 Main Street"
                        value={bookingData.billingAddress}
                        onChange={(e) => setBookingData({ ...bookingData, billingAddress: e.target.value })}
                        className={errors.billingAddress ? 'error' : ''}
                      />
                      {errors.billingAddress && <span className="error-text">{errors.billingAddress}</span>}
                    </div>
                  </div>

                  <div className="form-row form-row-split">
                    <div className="form-group">
                      <label>City *</label>
                      <input
                        type="text"
                        placeholder="New York"
                        value={bookingData.billingCity}
                        onChange={(e) => setBookingData({ ...bookingData, billingCity: e.target.value })}
                        className={errors.billingCity ? 'error' : ''}
                      />
                      {errors.billingCity && <span className="error-text">{errors.billingCity}</span>}
                    </div>

                    <div className="form-group">
                      <label>State *</label>
                      <select
                        value={bookingData.billingState}
                        onChange={(e) => setBookingData({ ...bookingData, billingState: e.target.value })}
                        className={errors.billingState ? 'error' : ''}
                      >
                        <option value="">Select state</option>
                        <option value="AL">AL - Alabama</option>
                        <option value="AK">AK - Alaska</option>
                        <option value="AZ">AZ - Arizona</option>
                        <option value="AR">AR - Arkansas</option>
                        <option value="CA">CA - California</option>
                        <option value="CO">CO - Colorado</option>
                        <option value="CT">CT - Connecticut</option>
                        <option value="DE">DE - Delaware</option>
                        <option value="FL">FL - Florida</option>
                        <option value="GA">GA - Georgia</option>
                        <option value="HI">HI - Hawaii</option>
                        <option value="ID">ID - Idaho</option>
                        <option value="IL">IL - Illinois</option>
                        <option value="IN">IN - Indiana</option>
                        <option value="IA">IA - Iowa</option>
                        <option value="KS">KS - Kansas</option>
                        <option value="KY">KY - Kentucky</option>
                        <option value="LA">LA - Louisiana</option>
                        <option value="ME">ME - Maine</option>
                        <option value="MD">MD - Maryland</option>
                        <option value="MA">MA - Massachusetts</option>
                        <option value="MI">MI - Michigan</option>
                        <option value="MN">MN - Minnesota</option>
                        <option value="MS">MS - Mississippi</option>
                        <option value="MO">MO - Missouri</option>
                        <option value="MT">MT - Montana</option>
                        <option value="NE">NE - Nebraska</option>
                        <option value="NV">NV - Nevada</option>
                        <option value="NH">NH - New Hampshire</option>
                        <option value="NJ">NJ - New Jersey</option>
                        <option value="NM">NM - New Mexico</option>
                        <option value="NY">NY - New York</option>
                        <option value="NC">NC - North Carolina</option>
                        <option value="ND">ND - North Dakota</option>
                        <option value="OH">OH - Ohio</option>
                        <option value="OK">OK - Oklahoma</option>
                        <option value="OR">OR - Oregon</option>
                        <option value="PA">PA - Pennsylvania</option>
                        <option value="RI">RI - Rhode Island</option>
                        <option value="SC">SC - South Carolina</option>
                        <option value="SD">SD - South Dakota</option>
                        <option value="TN">TN - Tennessee</option>
                        <option value="TX">TX - Texas</option>
                        <option value="UT">UT - Utah</option>
                        <option value="VT">VT - Vermont</option>
                        <option value="VA">VA - Virginia</option>
                        <option value="WA">WA - Washington</option>
                        <option value="WV">WV - West Virginia</option>
                        <option value="WI">WI - Wisconsin</option>
                        <option value="WY">WY - Wyoming</option>
                        <option value="DC">DC - District of Columbia</option>
                      </select>
                      {errors.billingState && <span className="error-text">{errors.billingState}</span>}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Cancellation Policy */}
            <section className="form-section">
              <h2>Cancellation policy</h2>
              <div className="cancellation-badge">
                <FaCheckCircle className="success-icon" />
                <strong>Fully refundable before {getCancellationDate()}</strong>
              </div>
              <p className="policy-text">
                Cancellations or changes made after 11:59pm (property local time) on {getCancellationDate()} or no-shows are subject to a property fee equal to the first night's rate plus taxes and fees.
              </p>
            </section>

            <div className="terms-section">
              <p>
                By clicking on the button below, I confirm I have read the <a href="#">Privacy Statement</a> and <a href="#">Government Travel Advice</a>, and have read and accept the <a href="#">Rules & Restrictions</a> and <a href="#">Terms of Service</a>.
              </p>
            </div>

            <button type="submit" className="book-now-button">
              <FaLock /> Book now
            </button>
          </form>
        </div>

        {/* Right Column - Summary */}
        <div className="booking-summary-section">
          <div className="summary-card">
            <div className="hotel-summary">
              <img src={getHotelImage(hotel.hotel_name)} alt={hotel.hotel_name} />
              <div className="hotel-info">
                <h3>{hotel.hotel_name}</h3>
                <p>{hotel.city}, {hotel.state}</p>
              </div>
            </div>

            <div className="dates-summary">
              <div className="date-row">
                <strong>Check-in</strong>
                <span>{formatDate(checkIn)}</span>
              </div>
              <div className="date-row">
                <strong>Check-out</strong>
                <span>{formatDate(checkOut)}</span>
              </div>
              <div className="date-row nights-badge">
                <strong>{nights} nights, {rooms} room</strong>
              </div>
            </div>

            <div className="property-highlights">
              <h4>Property highlights</h4>
              <div className="highlights-grid">
                {amenities.slice(0, 4).map((amenity, idx) => (
                  <div key={idx} className="highlight-item">
                    {getAmenityIcon(amenity)}
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="room-info">
              <h4>Room, 1 King Bed, Pool View</h4>
              <div className="room-features">
                <div className="feature-item">
                  <FaCoffee />
                  <span>Breakfast buffet</span>
                </div>
                <div className="feature-item">
                  <FaWifi />
                  <span>Free WiFi</span>
                </div>
                <div className="feature-item">
                  <FaParking />
                  <span>Free self parking</span>
                </div>
              </div>
            </div>

            <div className="special-requests">
              <h4>Any special/accessibility requests?</h4>
              <button className="link-button">→</button>
            </div>

            <div className="taste-message">
              <FaCheckCircle className="check-icon" />
              <p>You have good taste! Book now before someone else grabs it.</p>
            </div>

            <div className="price-details">
              <h4>Price details</h4>
              <div className="price-row">
                <span>{nights} nights x {rooms} room x ${pricePerNight.toFixed(2)}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="price-row">
                <span>Taxes</span>
                <span>${taxes.toFixed(2)}</span>
              </div>
              <div className="price-row total">
                <strong>Total</strong>
                <strong>${total.toFixed(2)}</strong>
              </div>
              <p className="currency-note">Rates are quoted in USD ($).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelBookingPage;
