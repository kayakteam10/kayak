import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { flightsAPI, hotelsAPI, carsAPI, bookingsAPI } from '../services/api';
import { FaPlane, FaHotel, FaCar, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import SeatMap from '../components/SeatMap';
import './BookingPage.css';

function BookingPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    billingAddress: '',
    city: '',
    zipCode: ''
  });
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatPrice, setSeatPrice] = useState(0);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchItem = async () => {
      try {
        let response;
        if (type === 'flights') {
          response = await flightsAPI.getDetails(id);
        } else if (type === 'hotels') {
          response = await hotelsAPI.getDetails(id);
        } else {
          response = await carsAPI.getDetails(id);
        }
        setItem(response.data);
      } catch (err) {
        console.error('Failed to load item');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [type, id]);

  const validateStep1 = () => {
    const newErrors = {};
    if (!bookingData.firstName) newErrors.firstName = 'First name is required';
    if (!bookingData.lastName) newErrors.lastName = 'Last name is required';
    if (!bookingData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(bookingData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!bookingData.phone) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\d{3}-\d{3}-\d{4}$/.test(bookingData.phone)) {
      newErrors.phone = 'Phone must be in format: xxx-xxx-xxxx';
    } else if (bookingData.phone.replace(/-/g, '') === '0000000000') {
      newErrors.phone = 'Phone number cannot be all zeros';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!bookingData.cardNumber) {
      newErrors.cardNumber = 'Card number is required';
    } else if (!/^\d{16}$/.test(bookingData.cardNumber.replace(/\s/g, ''))) {
      newErrors.cardNumber = 'Card number must be 16 digits';
    }
    if (!bookingData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else if (!/^\d{2}\/\d{2}$/.test(bookingData.expiryDate)) {
      newErrors.expiryDate = 'Format: MM/YY';
    } else {
      // Check if card has expired (must be after 12/25)
      const [month, year] = bookingData.expiryDate.split('/');
      const expMonth = parseInt(month);
      const expYear = parseInt(year);

      // Validate month range
      if (expMonth < 1 || expMonth > 12) {
        newErrors.expiryDate = 'Invalid month';
      } else {
        // Compare with 12/25 (minimum)
        if (expYear < 25 || (expYear === 25 && expMonth < 12)) {
          newErrors.expiryDate = 'Card has expired. Please enter a valid card';
        }
        // Compare with 12/35 (maximum - 10 years from 12/25)
        else if (expYear > 35 || (expYear === 35 && expMonth > 12)) {
          newErrors.expiryDate = 'Invalid expiry date. Please enter a valid card';
        }
      }
    }
    if (!bookingData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (!/^\d{3}$/.test(bookingData.cvv)) {
      newErrors.cvv = 'CVV must be exactly 3 digits';
    } else if (bookingData.cvv === '000') {
      newErrors.cvv = 'CVV cannot be all zeros';
    }
    if (!bookingData.billingAddress) newErrors.billingAddress = 'Address is required';
    if (!bookingData.city) newErrors.city = 'City is required';
    if (!bookingData.zipCode) {
      newErrors.zipCode = 'ZIP code is required';
    } else if (!/^\d{6}$/.test(bookingData.zipCode)) {
      newErrors.zipCode = 'ZIP code must be exactly 6 digits';
    } else if (bookingData.zipCode === '000000') {
      newErrors.zipCode = 'ZIP code cannot be all zeros';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      // For flights, go to seat selection; for others, go to payment
      if (type === 'flights') {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }
    } else if (currentStep === 2 && type === 'flights') {
      // Seat selection -> Payment
      setCurrentStep(3);
    } else if (currentStep === 3 && validateStep2()) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!localStorage.getItem('token')) {
      alert('Please login to book');
      navigate('/login');
      return;
    }

    try {
      let response;
      const bookingPayload = {
        // Use correct key names per type
        ...(type === 'flights' ? { flight_id: parseInt(id) } : {}),
        ...(type === 'hotels' ? { hotel_id: parseInt(id) } : {}),
        ...(type === 'cars' ? { car_id: parseInt(id) } : {}),
        passenger_details: {
          firstName: bookingData.firstName,
          lastName: bookingData.lastName,
          email: bookingData.email,
          phone: bookingData.phone
        },
        payment_details: {
          cardNumber: bookingData.cardNumber,
          expiryDate: bookingData.expiryDate,
          cvv: bookingData.cvv,
          billingAddress: bookingData.billingAddress,
          city: bookingData.city,
          zipCode: bookingData.zipCode
        }
      };

      // Add selected seats for flights
      if (type === 'flights' && selectedSeats.length > 0) {
        bookingPayload.selected_seats = selectedSeats;
      }

      if (type === 'flights') {
        response = await flightsAPI.book(bookingPayload);
      } else if (type === 'hotels') {
        response = await hotelsAPI.book({ hotel_id: parseInt(id), guest_info: bookingData });
      } else {
        response = await carsAPI.book({ car_id: parseInt(id), rental_details: bookingData });
      }

      // Extract booking ID from response (flights API returns response.data.booking.id)
      const bookingId = response.data.booking?.id || response.data.booking_id || response.data.id;
      navigate(`/booking/confirmation/${type}/${bookingId}`);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        alert('Session expired. Please login again.');
        navigate('/login');
      } else {
        alert(err.response?.data?.error || 'Booking failed');
      }
    }
  };

  const parsePrice = (value) => {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : 0;
  };

  const getPrice = () => {
    if (!item) return 0;
    let basePrice = 0;
    if (type === 'flights') {
      // Prefer total price if provided (e.g., roundtrip), fall back to base price
      basePrice = parsePrice(item.total_price ?? item.price);
      // Add seat selection fee for flights
      basePrice += seatPrice;
    } else if (type === 'hotels') {
      basePrice = parsePrice(item.price_per_night);
    } else {
      basePrice = parsePrice(item.price_per_day);
    }
    return basePrice;
  };

  const getTypeIcon = () => {
    if (type === 'flights') return <FaPlane />;
    if (type === 'hotels') return <FaHotel />;
    return <FaCar />;
  };

  if (loading) return <div className="booking-loading">Loading...</div>;
  if (!item) return <div className="booking-error">Item not found</div>;

  return (
    <div className="booking-page">
      <div className="booking-container">
        <div className="booking-steps">
          <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-number">{currentStep > 1 ? <FaCheckCircle /> : '1'}</div>
            <span>Passenger Details</span>
          </div>
          <div className="step-connector"></div>
          {type === 'flights' && (
            <>
              <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                <div className="step-number">{currentStep > 2 ? <FaCheckCircle /> : '2'}</div>
                <span>Seat Selection</span>
              </div>
              <div className="step-connector"></div>
            </>
          )}
          <div className={`step ${currentStep >= (type === 'flights' ? 3 : 2) ? 'active' : ''} ${currentStep > (type === 'flights' ? 3 : 2) ? 'completed' : ''}`}>
            <div className="step-number">{currentStep > (type === 'flights' ? 3 : 2) ? <FaCheckCircle /> : (type === 'flights' ? '3' : '2')}</div>
            <span>Payment</span>
          </div>
          <div className="step-connector"></div>
          <div className={`step ${currentStep >= (type === 'flights' ? 4 : 3) ? 'active' : ''}`}>
            <div className="step-number">{type === 'flights' ? '4' : '3'}</div>
            <span>Confirmation</span>
          </div>
        </div>

        <div className="booking-content">
          <div className="booking-form-section">
            {currentStep === 1 && (
              <div className="form-step">
                <h2>Passenger Information</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      value={bookingData.firstName}
                      onChange={(e) => setBookingData({ ...bookingData, firstName: e.target.value })}
                      className={errors.firstName ? 'error' : ''}
                    />
                    {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      value={bookingData.lastName}
                      onChange={(e) => setBookingData({ ...bookingData, lastName: e.target.value })}
                      className={errors.lastName ? 'error' : ''}
                    />
                    {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                  </div>
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
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 6) {
                          value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 10);
                        } else if (value.length >= 3) {
                          value = value.slice(0, 3) + '-' + value.slice(3, 6);
                        }
                        setBookingData({ ...bookingData, phone: value });
                      }}
                      placeholder="123-456-7890"
                      maxLength="12"
                      className={errors.phone ? 'error' : ''}
                    />
                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && type === 'flights' && (
              <div className="form-step">
                <h2>Select Your Seats</h2>
                <SeatMap
                  flightId={id}
                  passengerCount={1}
                  onSeatsSelected={(seats, price) => {
                    setSelectedSeats(seats);
                    setSeatPrice(price || 0);
                  }}
                />
              </div>
            )}

            {currentStep === (type === 'flights' ? 3 : 2) && (
              <div className="form-step">
                <h2>Payment Information</h2>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Card Number *</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={bookingData.cardNumber}
                      onChange={(e) => setBookingData({ ...bookingData, cardNumber: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() })}
                      maxLength="19"
                      className={errors.cardNumber ? 'error' : ''}
                    />
                    {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
                  </div>
                  <div className="form-group">
                    <label>Expiry Date *</label>
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
                    <label>CVV *</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={bookingData.cvv}
                      onChange={(e) => setBookingData({ ...bookingData, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      maxLength="3"
                      className={errors.cvv ? 'error' : ''}
                    />
                    {errors.cvv && <span className="error-text">{errors.cvv}</span>}
                  </div>
                  <div className="form-group full-width">
                    <label>Billing Address *</label>
                    <input
                      type="text"
                      value={bookingData.billingAddress}
                      onChange={(e) => setBookingData({ ...bookingData, billingAddress: e.target.value })}
                      className={errors.billingAddress ? 'error' : ''}
                    />
                    {errors.billingAddress && <span className="error-text">{errors.billingAddress}</span>}
                  </div>
                  <div className="form-group">
                    <label>City *</label>
                    <input
                      type="text"
                      value={bookingData.city}
                      onChange={(e) => setBookingData({ ...bookingData, city: e.target.value })}
                      className={errors.city ? 'error' : ''}
                    />
                    {errors.city && <span className="error-text">{errors.city}</span>}
                  </div>
                  <div className="form-group">
                    <label>ZIP Code *</label>
                    <input
                      type="text"
                      value={bookingData.zipCode}
                      onChange={(e) => setBookingData({ ...bookingData, zipCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      maxLength="6"
                      placeholder="123456"
                      className={errors.zipCode ? 'error' : ''}
                    />
                    {errors.zipCode && <span className="error-text">{errors.zipCode}</span>}
                  </div>
                </div>
              </div>
            )}

            <div className="form-actions">
              {currentStep > 1 && (
                <button className="btn-secondary" onClick={() => setCurrentStep(currentStep - 1)}>
                  Back
                </button>
              )}
              <button className="btn-primary" onClick={handleNext}>
                {currentStep === (type === 'flights' ? 3 : 2) ? 'Complete Booking' : 'Continue'} <FaArrowRight />
              </button>
            </div>
          </div>

          <div className="booking-summary-section">
            <div className="booking-summary">
              <h3>Booking Summary</h3>
              <div className="summary-item">
                <div className="summary-icon">{getTypeIcon()}</div>
                <div className="summary-content">
                  {type === 'flights' && (
                    <>
                      <h4>{item.airline} {item.flight_number}</h4>
                      <p>{item.departure_city} → {item.arrival_city}</p>
                      <p className="summary-time">{item.departure_time?.slice(0, 5)} - {item.arrival_time?.slice(0, 5)}</p>
                    </>
                  )}
                  {type === 'hotels' && (
                    <>
                      <h4>{item.name}</h4>
                      <p>{item.location}</p>
                      {item.rating && <p className="summary-rating">⭐ {item.rating}</p>}
                    </>
                  )}
                  {type === 'cars' && (
                    <>
                      <h4>{item.model}</h4>
                      <p>{item.provider || item.brand}</p>
                      <p className="summary-location">{item.location}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="price-breakdown">
                <div className="price-row">
                  <span>Flight Price</span>
                  <span>${(type === 'flights' ? parsePrice(item.total_price ?? item.price) : getPrice()).toFixed(2)}</span>
                </div>
                {type === 'flights' && seatPrice > 0 && (
                  <div className="price-row">
                    <span>Seat Selection</span>
                    <span>${seatPrice.toFixed(2)}</span>
                  </div>
                )}
                <div className="price-row">
                  <span>Taxes & Fees</span>
                  <span>${(getPrice() * 0.1).toFixed(2)}</span>
                </div>
                <div className="price-row total">
                  <span>Total</span>
                  <span>${(getPrice() * 1.1).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingPage;
