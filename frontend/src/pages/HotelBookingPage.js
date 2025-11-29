import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FaLock, FaCheckCircle, FaWifi, FaParking, FaSwimmingPool, FaDumbbell, FaSpa, FaUtensils, FaCoffee, FaBed } from 'react-icons/fa';
import './HotelBookingPage.css';

const HotelBookingPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('card');
  
  const [bookingData, setBookingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    billingZip: ''
  });

  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const rooms = searchParams.get('rooms') || 1;
  const adults = searchParams.get('adults') || 2;
  const children = searchParams.get('children') || 0;

  useEffect(() => {
    fetchHotelDetails();
  }, [id]);

  const fetchHotelDetails = async () => {
    try {
      const response = await fetch(`http://localhost:8089/api/hotels/${id}`);
      if (!response.ok) throw new Error('Hotel not found');
      const data = await response.json();
      setHotel(data);
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

    if (paymentMethod === 'card') {
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

      const response = await fetch('http://localhost:8089/api/bookings/hotel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
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
          payment_details: {
            method: paymentMethod,
            cardNumber: bookingData.cardNumber,
            expiryDate: bookingData.expiryDate,
            cvv: bookingData.cvv,
            billingZip: bookingData.billingZip
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Booking failed');
      }
      
      const result = await response.json();
      navigate(`/hotel-confirmation/${result.booking_id}`);
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
              <h2>Pay with</h2>
              <div className="payment-methods">
                <label className={`payment-option ${paymentMethod === 'card' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>New card</span>
                  <div className="card-icon">💳</div>
                </label>
                <label className={`payment-option ${paymentMethod === 'paypal' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>PayPal</span>
                  <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" alt="PayPal" />
                </label>
                <label className={`payment-option ${paymentMethod === 'affirm' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="affirm"
                    checked={paymentMethod === 'affirm'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Affirm</span>
                  <div className="affirm-logo">affirm</div>
                </label>
              </div>

              {paymentMethod === 'card' && (
                <div className="card-details">
                  <h3>Card details</h3>
                  <div className="card-logos">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" height="20" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" height="20" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="Amex" height="20" />
                  </div>
                  <div className="form-group">
                    <label>Name on card *</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="form-group">
                    <label>Card number *</label>
                    <input
                      type="text"
                      value={bookingData.cardNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 16);
                        const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                        setBookingData({ ...bookingData, cardNumber: formatted });
                      }}
                      placeholder="0000 0000 0000 0000"
                      maxLength="19"
                      className={errors.cardNumber ? 'error' : ''}
                    />
                    {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Expiration date *</label>
                      <input
                        type="text"
                        value={bookingData.expiryDate}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 2) {
                            value = value.slice(0, 2) + '/' + value.slice(2, 4);
                          }
                          setBookingData({ ...bookingData, expiryDate: value });
                        }}
                        placeholder="MM/YY"
                        maxLength="5"
                        className={errors.expiryDate ? 'error' : ''}
                      />
                      {errors.expiryDate && <span className="error-text">{errors.expiryDate}</span>}
                    </div>
                    <div className="form-group">
                      <label>Security code *</label>
                      <input
                        type="text"
                        value={bookingData.cvv}
                        onChange={(e) => setBookingData({ ...bookingData, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                        placeholder="CVV"
                        maxLength="3"
                        className={errors.cvv ? 'error' : ''}
                      />
                      {errors.cvv && <span className="error-text">{errors.cvv}</span>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Billing ZIP code *</label>
                    <input
                      type="text"
                      value={bookingData.billingZip}
                      onChange={(e) => setBookingData({ ...bookingData, billingZip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                      placeholder="12345"
                      maxLength="5"
                      className={errors.billingZip ? 'error' : ''}
                    />
                    {errors.billingZip && <span className="error-text">{errors.billingZip}</span>}
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
