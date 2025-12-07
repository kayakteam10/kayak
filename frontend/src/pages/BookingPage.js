import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { flightsAPI, hotelsAPI, carsAPI, bookingsAPI, authAPI } from '../services/api';
import { FaPlane, FaHotel, FaCar, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import SeatMap from '../components/SeatMap';
import './BookingPage.css';

function BookingPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ssn: '',
    cardType: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    billingAddress: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatPrice, setSeatPrice] = useState(0);
  const [errors, setErrors] = useState({});
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [useNewCard, setUseNewCard] = useState(false);

  // Multi-passenger support
  const [passengers, setPassengers] = useState([{
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ssn: '',
    passengerType: 'adult'
  }]);
  const [passengerCount, setPassengerCount] = useState(1);

  // Multi-leg flight support (round-trip and multi-city)
  const [flightLegs, setFlightLegs] = useState([]);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [legSeats, setLegSeats] = useState({}); // { 0: [...seats], 1: [...seats] }

  // Fetch user profile and auto-populate data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await authAPI.me();
          // Extract user data from correct response structure
          const userData = response.data.data || response.data;

          // Check if SSN or phone is missing
          if (!userData.ssn || !userData.phone) {
            const missingFields = [];
            if (!userData.ssn) missingFields.push('SSN');
            if (!userData.phone) missingFields.push('Phone Number');

            alert(`Please complete your profile before booking!\n\nMissing required fields: ${missingFields.join(', ')}\n\nYou will be redirected to Profile Settings.`);
            navigate('/profile?tab=profile');
            return;
          }

          // Get saved payment methods from localStorage (user-specific)
          const userId = userData.id;
          const storageKey = `savedPaymentMethods_${userId}`;
          const savedPayments = localStorage.getItem(storageKey);
          let paymentMethods = [];
          if (savedPayments) {
            try {
              paymentMethods = JSON.parse(savedPayments);
              // Filter only card payments
              paymentMethods = paymentMethods.filter(p => p.paymentType === 'card');
              setSavedPaymentMethods(paymentMethods);
            } catch (e) {
              console.error('Error parsing saved payments:', e);
            }
          }

          // Find first card payment method
          const firstCard = paymentMethods.find(p => p.paymentType === 'card');

          // If cards exist, don't auto-populate (let user choose)
          // If no cards, set useNewCard to true
          if (paymentMethods.length === 0) {
            setUseNewCard(true);
          }

          // Auto-populate booking data
          setBookingData(prevData => ({
            ...prevData,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            phone: userData.phone || '',
            ssn: userData.ssn || '',
            // Only populate payment if no saved cards
            billingAddress: userData.address || '',
            city: userData.city || '',
            state: userData.state || '',
            zipCode: userData.zipCode || ''
          }));

          // Also auto-populate the first passenger with user data
          setPassengers(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[0] = {
                ...updated[0],
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                email: userData.email || '',
                phone: userData.phone || '',
                ssn: userData.ssn || ''
              };
            }
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };

    fetchUserProfile();
  }, []);

  // Initialize passengers from URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const totalPassengers = parseInt(searchParams.get('passengers')) || 1;
    const adults = parseInt(searchParams.get('adults')) || totalPassengers;
    const children = parseInt(searchParams.get('children')) || 0;
    const infants = parseInt(searchParams.get('infants')) || 0;

    setPassengerCount(totalPassengers);

    // Initialize passengers array based on breakdown
    const passengersArray = [];

    // Add adults
    for (let i = 0; i < adults; i++) {
      passengersArray.push({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        ssn: '',
        passengerType: 'adult'
      });
    }

    // Add children
    for (let i = 0; i < children; i++) {
      passengersArray.push({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        ssn: '',
        passengerType: 'child'
      });
    }

    // Add infants
    for (let i = 0; i < infants; i++) {
      passengersArray.push({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        ssn: '',
        passengerType: 'infant'
      });
    }

    if (passengersArray.length > 0) {
      setPassengers(passengersArray);
    }
  }, []);

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

        // Extract item data from correct response structure
        const itemData = response.data.data || response.data;
        setItem(itemData);

        // For flights, detect if it's round-trip or multi-city
        if (type === 'flights') {
          const legs = [];

          // Check URL parameters for trip type
          const searchParams = new URLSearchParams(window.location.search);
          const tripType = searchParams.get('tripType') || searchParams.get('type');
          const isRoundTrip = tripType === 'roundtrip' || tripType === 'round-trip';
          const isMultiCity = tripType === 'multicity';

          console.log('BookingPage Debug:', { tripType, isMultiCity, state: location.state, itemData });

          // Check if it's a multi-city flight
          if (isMultiCity || itemData.is_multicity || itemData.legs || location.state?.isMultiCity || (location.state?.legs && location.state.legs.length > 1)) {
            // Multi-city flight
            // Prioritize legs from state as they are passed from search results
            const multiCityLegs = (location.state?.legs && location.state.legs.length > 0)
              ? location.state.legs
              : (itemData.legs || []);

            console.log('MultiCity Legs:', multiCityLegs);

            multiCityLegs.forEach((leg, index) => {
              legs.push({
                id: leg.id,
                flightNumber: leg.flight_number || leg.flightNumber,
                airline: leg.airline,
                from: leg.departure_city || leg.from || leg.origin,
                to: leg.arrival_city || leg.to || leg.destination,
                departureTime: leg.departure_time || leg.departureTime,
                arrivalTime: leg.arrival_time || leg.arrivalTime,
                legType: `Leg ${index + 1}`
              });
            });
          }
          // Check if it's a round-trip flight (from backend or URL)
          else if (itemData.is_roundtrip || itemData.return_flight || isRoundTrip) {
            // Outbound leg
            legs.push({
              id: itemData.id,
              flightNumber: itemData.flight_number,
              airline: itemData.airline,
              from: itemData.departure_city || itemData.origin || itemData.from,
              to: itemData.arrival_city || itemData.destination || itemData.to,
              departureTime: itemData.departure_time,
              arrivalTime: itemData.arrival_time,
              legType: 'Outbound'
            });

            // Return leg - use backend data if available, otherwise check state, otherwise create mock
            const returnFlight = itemData.return_flight || location.state?.returnFlight;

            if (returnFlight) {
              legs.push({
                id: returnFlight.id,
                flightNumber: returnFlight.flight_number || returnFlight.flightNumber,
                airline: returnFlight.airline,
                from: returnFlight.departure_city || returnFlight.from || returnFlight.origin,
                to: returnFlight.arrival_city || returnFlight.to || returnFlight.destination,
                departureTime: returnFlight.departure_time || returnFlight.departureTime,
                arrivalTime: returnFlight.arrival_time || returnFlight.arrivalTime,
                legType: 'Return'
              });
            } else if (isRoundTrip) {
              // Create mock return flight (swap origin/destination)
              legs.push({
                id: itemData.id, // Use same flight ID for now
                flightNumber: itemData.flight_number,
                airline: itemData.airline,
                from: itemData.arrival_city || itemData.destination, // Swapped
                to: itemData.departure_city || itemData.origin, // Swapped
                departureTime: itemData.arrival_time,
                arrivalTime: itemData.departure_time,
                legType: 'Return'
              });
            }
          }
          // One-way flight
          else {
            legs.push({
              id: itemData.id,
              flightNumber: itemData.flight_number,
              airline: itemData.airline,
              from: itemData.departure_city,
              to: itemData.arrival_city,
              departureTime: itemData.departure_time,
              arrivalTime: itemData.arrival_time,
              legType: 'Flight'
            });
          }

          console.log('🛫 Flight legs detected:', legs);
          setFlightLegs(legs);

          // Initialize leg seats object
          const initialLegSeats = {};
          legs.forEach((_, index) => {
            initialLegSeats[index] = [];
          });
          setLegSeats(initialLegSeats);
        }
      } catch (err) {
        console.error('Failed to load item');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [type, id]);

  // Helper function to update a specific passenger
  const updatePassenger = (index, field, value) => {
    setPassengers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`passenger${index}_${field}`];
      return newErrors;
    });
  };

  const validateStep1 = () => {
    const newErrors = {};

    // Validate all passengers
    passengers.forEach((passenger, index) => {
      if (!passenger.firstName) {
        newErrors[`passenger${index}_firstName`] = 'First name is required';
      }
      if (!passenger.lastName) {
        newErrors[`passenger${index}_lastName`] = 'Last name is required';
      }
      if (!passenger.email) {
        newErrors[`passenger${index}_email`] = 'Email is required';
      } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(passenger.email)) {
        newErrors[`passenger${index}_email`] = 'Please enter a valid email address';
      }
      if (!passenger.phone) {
        newErrors[`passenger${index}_phone`] = 'Phone is required';
      } else if (!/^\d{3}-\d{3}-\d{4}$/.test(passenger.phone)) {
        newErrors[`passenger${index}_phone`] = 'Phone must be in format: xxx-xxx-xxxx';
      } else if (passenger.phone.replace(/-/g, '') === '0000000000') {
        newErrors[`passenger${index}_phone`] = 'Phone number cannot be all zeros';
      }
      if (!passenger.ssn) {
        newErrors[`passenger${index}_ssn`] = 'SSN is required';
      } else if (!/^\d{3}-\d{2}-\d{4}$/.test(passenger.ssn)) {
        newErrors[`passenger${index}_ssn`] = 'SSN must be in format ###-##-####';
      }
    });

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
    } else if (!/^\d{5}(-\d{4})?$/.test(bookingData.zipCode)) {
      newErrors.zipCode = 'ZIP code must be 5 digits (e.g., 12345) or 9 digits (e.g., 12345-6789)';
    } else if (bookingData.zipCode.replace(/-/g, '') === '000000000' || bookingData.zipCode === '00000') {
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

  // Detect card type from card number
  const detectCardType = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'MasterCard';
    if (/^3[47]/.test(cleaned)) return 'American Express';
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
    return '';
  };

  // Handle selecting a saved payment method
  const handleSelectSavedCard = (card, index) => {
    setSelectedPaymentMethod(index);
    setUseNewCard(false);
    setBookingData(prevData => ({
      ...prevData,
      cardType: card.creditCardType || '',
      cardNumber: card.creditCardNumber.replace(/\s/g, ''),
      expiryDate: `${card.expiryMonth}/${card.expiryYear.toString().slice(-2)}`,
      cvv: card.cvv || '',
      billingAddress: card.billingAddress || prevData.billingAddress,
      city: card.billingCity || prevData.city,
      state: card.billingState || prevData.state,
      zipCode: card.billingZip || prevData.zipCode
    }));
  };

  // Handle using a new card
  const handleUseNewCard = () => {
    setUseNewCard(true);
    setSelectedPaymentMethod(null);
    setBookingData(prevData => ({
      ...prevData,
      cardType: '',
      cardNumber: '',
      expiryDate: '',
      cvv: ''
    }));
  };

  // Save payment method to localStorage (user-specific)
  const savePaymentMethod = () => {
    try {
      if (!user?.id) return; // Need user ID

      const storageKey = `savedPaymentMethods_${user.id}`;
      const savedPayments = localStorage.getItem(storageKey);
      let paymentMethods = [];
      if (savedPayments) {
        paymentMethods = JSON.parse(savedPayments);
      }

      const [month, year] = bookingData.expiryDate.split('/');
      const fullYear = '20' + year;

      const newPayment = {
        paymentType: 'card',
        creditCardNumber: bookingData.cardNumber.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim(),
        creditCardType: bookingData.cardType || detectCardType(bookingData.cardNumber),
        expiryMonth: month,
        expiryYear: fullYear,
        cvv: bookingData.cvv,
        billingAddress: bookingData.billingAddress,
        billingCity: bookingData.city,
        billingState: bookingData.state,
        billingZip: bookingData.zipCode
      };

      // Check if this card already exists (compare last 4 digits)
      const last4 = bookingData.cardNumber.replace(/\s/g, '').slice(-4);
      const existingIndex = paymentMethods.findIndex(p =>
        p.paymentType === 'card' && p.creditCardNumber.replace(/\s/g, '').slice(-4) === last4
      );

      if (existingIndex >= 0) {
        // Update existing card
        paymentMethods[existingIndex] = newPayment;
      } else {
        // Add new card
        paymentMethods.push(newPayment);
      }

      localStorage.setItem(storageKey, JSON.stringify(paymentMethods));
    } catch (e) {
      console.error('Error saving payment method:', e);
    }
  };

  const handleSubmit = async () => {
    if (!localStorage.getItem('token')) {
      alert('Please login to book');
      navigate('/login');
      return;
    }

    // Validate seat selection for flights
    if (type === 'flights') {
      // For multi-leg flights, validate all legs have seats
      if (flightLegs.length > 1) {
        for (let i = 0; i < flightLegs.length; i++) {
          if (!legSeats[i] || legSeats[i].length !== passengers.length) {
            alert(`Please select ${passengers.length} seat${passengers.length > 1 ? 's' : ''} for ${flightLegs[i].legType} flight`);
            return;
          }
        }
      } else {
        // Single leg flight
        if (!legSeats[0] || legSeats[0].length !== passengers.length) {
          alert(`Please select ${passengers.length} seat${passengers.length > 1 ? 's' : ''} for all passengers`);
          return;
        }
      }
    }

    try {
      let response;

      // Prepare seat assignments for all legs
      const allSeats = [];
      Object.values(legSeats).forEach(seats => {
        allSeats.push(...seats);
      });

      console.log('🔍 Booking Debug:', {
        type,
        id,
        passengersArray: passengers,
        legSeats,
        bookingData
      });

      // Calculate total amount
      const totalAmount = getPrice();
      const userIdStr = localStorage.getItem('userId') || (authAPI.getCurrentUser()?.userId);
      const userId = userIdStr ? parseInt(userIdStr) : null;

      // Construct payload for Booking Service
      // Schema: { user_id, booking_type, booking_details, total_amount, payment_method }
      const bookingPayload = {
        user_id: userId,
        booking_type: type.slice(0, -1), // 'flights' -> 'flight'
        total_amount: totalAmount,
        payment_method: 'credit_card',
        booking_details: {
          // Specific details based on type
          ...(type === 'flights' ? { flight_id: parseInt(id) } : {}),
          ...(type === 'hotels' ? { hotel_id: parseInt(id) } : {}),
          ...(type === 'cars' ? { car_id: parseInt(id) } : {}),

          // Common details
          passengers: passengers.map((p, index) => {
            // For multi-leg flights, assign seats from each leg
            const passengerSeats = {};
            flightLegs.forEach((leg, legIndex) => {
              if (legSeats[legIndex] && legSeats[legIndex][index]) {
                passengerSeats[`leg${legIndex}`] = legSeats[legIndex][index].seatNumber;
              }
            });

            return {
              firstName: p.firstName,
              lastName: p.lastName,
              email: p.email,
              phone: p.phone,
              ssn: p.ssn,
              passengerType: p.passengerType,
              seatNumber: legSeats[0]?.[index]?.seatNumber || null,
              seats: passengerSeats
            };
          }),

          payment_details: {
            cardType: bookingData.cardType,
            cardNumber: bookingData.cardNumber,
            expiryDate: bookingData.expiryDate,
            cvv: bookingData.cvv,
            billingAddress: bookingData.billingAddress,
            city: bookingData.city,
            state: bookingData.state,
            zipCode: bookingData.zipCode
          },

          // Add selected seats for flights (all legs combined)
          ...(type === 'flights' && allSeats.length > 0 ? {
            selected_seats: allSeats,
            leg_seats: legSeats
          } : {}),

          // Hotel specific
          ...(type === 'hotels' ? { guest_info: bookingData } : {}),

          // Car specific
          ...(type === 'cars' ? { rental_details: bookingData } : {})
        }
      };

      console.log('📤 Sending booking payload:', JSON.stringify(bookingPayload, null, 2));

      // Use centralized Bookings API
      response = await bookingsAPI.create(bookingPayload);

      // Extract booking ID from response (flights API returns response.data.booking.id)
      const bookingId = response.data.data?.bookingId || response.data.data?.id || response.data.booking?.id || response.data.booking_id || response.data.id;

      // Save payment method to user's profile
      savePaymentMethod();

      navigate(`/booking/confirmation/${type}/${bookingId}`);
    } catch (err) {
      console.error('❌ Booking Error:', err);
      console.error('❌ Error Response:', err.response?.data);
      console.error('❌ Error Status:', err.response?.status);

      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        alert('Session expired. Please login again.');
        navigate('/login');
      } else {
        const errorMsg = err.response?.data?.error || err.response?.data?.details || 'Booking failed';
        alert(`Booking failed: ${errorMsg}`);
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
                <p className="passenger-count-info">Please provide details for all {passengers.length} passenger{passengers.length > 1 ? 's' : ''}</p>

                {passengers.map((passenger, index) => (
                  <div key={index} className="passenger-form-section">
                    <h3>Passenger {index + 1}</h3>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          value={passenger.firstName}
                          onChange={(e) => updatePassenger(index, 'firstName', e.target.value)}
                          className={errors[`passenger${index}_firstName`] ? 'error' : ''}
                        />
                        {errors[`passenger${index}_firstName`] && <span className="error-text">{errors[`passenger${index}_firstName`]}</span>}
                      </div>
                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          value={passenger.lastName}
                          onChange={(e) => updatePassenger(index, 'lastName', e.target.value)}
                          className={errors[`passenger${index}_lastName`] ? 'error' : ''}
                        />
                        {errors[`passenger${index}_lastName`] && <span className="error-text">{errors[`passenger${index}_lastName`]}</span>}
                      </div>
                      <div className="form-group">
                        <label>Email *</label>
                        <input
                          type="email"
                          value={passenger.email}
                          onChange={(e) => updatePassenger(index, 'email', e.target.value)}
                          placeholder="example@email.com"
                          className={errors[`passenger${index}_email`] ? 'error' : ''}
                        />
                        {errors[`passenger${index}_email`] && <span className="error-text">{errors[`passenger${index}_email`]}</span>}
                      </div>
                      <div className="form-group">
                        <label>Phone *</label>
                        <input
                          type="tel"
                          value={passenger.phone}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length >= 6) {
                              value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 10);
                            } else if (value.length >= 3) {
                              value = value.slice(0, 3) + '-' + value.slice(3, 6);
                            }
                            updatePassenger(index, 'phone', value);
                          }}
                          placeholder="123-456-7890"
                          maxLength="12"
                          className={errors[`passenger${index}_phone`] ? 'error' : ''}
                        />
                        {errors[`passenger${index}_phone`] && <span className="error-text">{errors[`passenger${index}_phone`]}</span>}
                      </div>
                      <div className="form-group">
                        <label>SSN *</label>
                        <input
                          type="text"
                          value={passenger.ssn}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length >= 5) {
                              value = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5, 9);
                            } else if (value.length >= 3) {
                              value = value.slice(0, 3) + '-' + value.slice(3, 5);
                            }
                            updatePassenger(index, 'ssn', value);
                          }}
                          placeholder="123-45-6789"
                          maxLength="11"
                          className={errors[`passenger${index}_ssn`] ? 'error' : ''}
                        />
                        {errors[`passenger${index}_ssn`] && <span className="error-text">{errors[`passenger${index}_ssn`]}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentStep === 2 && type === 'flights' && (
              <div className="form-step">
                <h2>Select Your Seats</h2>

                {/* Show current leg info if multiple legs */}
                {flightLegs.length > 1 && (
                  <div className="leg-progress">
                    <p className="leg-info">
                      Selecting seats for <strong>{flightLegs[currentLegIndex]?.legType}</strong> Flight
                      ({currentLegIndex + 1} of {flightLegs.length})
                    </p>
                    <p className="route-info">
                      {flightLegs[currentLegIndex]?.airline} {flightLegs[currentLegIndex]?.flightNumber} •
                      {flightLegs[currentLegIndex]?.from} → {flightLegs[currentLegIndex]?.to}
                    </p>
                  </div>
                )}

                <p className="seat-selection-info">
                  Please select {passengers.length} seat{passengers.length > 1 ? 's' : ''} for your passengers
                </p>

                <SeatMap
                  key={`leg-${currentLegIndex}-${flightLegs[currentLegIndex]?.id}`}
                  flightId={flightLegs[currentLegIndex]?.id || id}
                  passengerCount={passengers.length}
                  onSeatsSelected={(seats, price) => {
                    // Add flight ID to each seat object
                    const seatsWithFlightId = seats.map(seat => ({
                      ...seat,
                      flightId: flightLegs[currentLegIndex]?.id || id
                    }));

                    // Store seats for current leg
                    setLegSeats(prev => ({
                      ...prev,
                      [currentLegIndex]: seatsWithFlightId
                    }));

                    // Update total seat price (sum of all legs)
                    const totalSeatPrice = Object.values({
                      ...legSeats,
                      [currentLegIndex]: seatsWithFlightId
                    }).reduce((sum, legSeatsArr) => {
                      return sum + (legSeatsArr.reduce((s, seat) => s + (seat.price || 0), 0));
                    }, 0);
                    setSeatPrice(totalSeatPrice);
                  }}
                  initialSeats={legSeats[currentLegIndex] || []}
                />

                {/* Navigation buttons for multiple legs */}
                {flightLegs.length > 1 && (
                  <div className="leg-navigation">
                    {currentLegIndex > 0 && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setCurrentLegIndex(prev => prev - 1)}
                      >
                        ← Previous Leg
                      </button>
                    )}

                    {currentLegIndex < flightLegs.length - 1 ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          // Check if seats are selected for current leg
                          if (!legSeats[currentLegIndex] || legSeats[currentLegIndex].length !== passengers.length) {
                            alert(`Please select ${passengers.length} seat${passengers.length > 1 ? 's' : ''} for this leg`);
                            return;
                          }
                          setCurrentLegIndex(prev => prev + 1);
                        }}
                      >
                        Next Leg →
                      </button>
                    ) : (
                      <div className="seats-complete-message">
                        <p>✓ All legs configured. Click Continue below to proceed to payment.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentStep === (type === 'flights' ? 3 : 2) && (
              <div className="form-step payment-step">
                <h2 className="payment-heading">Payment Information</h2>

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
                            onChange={() => handleSelectSavedCard(card, index)}
                          />
                          <div className="radio-content">
                            <div className="card-brand-icon-box">
                              {card.creditCardType === 'Visa' && (
                                <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                  <rect width="52" height="34" rx="5" fill="#1A1F71" />
                                  <text x="26" y="21" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">VISA</text>
                                </svg>
                              )}
                              {card.creditCardType === 'MasterCard' && (
                                <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                  <rect width="52" height="34" rx="5" fill="#EB001B" />
                                  <circle cx="20" cy="17" r="10" fill="#FF5F00" opacity="0.8" />
                                  <circle cx="32" cy="17" r="10" fill="#F79E1B" opacity="0.8" />
                                </svg>
                              )}
                              {card.creditCardType === 'American Express' && (
                                <svg width="52" height="34" viewBox="0 0 52 34" fill="none" className="brand-logo">
                                  <rect width="52" height="34" rx="5" fill="#006FCF" />
                                  <text x="26" y="21" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial">AMEX</text>
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
                    </div>                    <div className="form-row">
                      <div className="form-group-full">
                        <label>Card number *</label>
                        <input
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          value={bookingData.cardNumber}
                          onChange={(e) => {
                            const formatted = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                            setBookingData({ ...bookingData, cardNumber: formatted });
                            if (!bookingData.cardType) {
                              const detected = detectCardType(formatted);
                              if (detected) {
                                setBookingData(prev => ({ ...prev, cardNumber: formatted, cardType: detected }));
                              }
                            }
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
                          value={bookingData.zipCode}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length > 5) {
                              value = value.slice(0, 5) + '-' + value.slice(5, 9);
                            }
                            setBookingData({ ...bookingData, zipCode: value });
                          }}
                          maxLength="10"
                          className={errors.zipCode ? 'error' : ''}
                        />
                        {errors.zipCode && <span className="error-text">{errors.zipCode}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Billing Address */}
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
                        value={bookingData.city}
                        onChange={(e) => setBookingData({ ...bookingData, city: e.target.value })}
                        className={errors.city ? 'error' : ''}
                      />
                      {errors.city && <span className="error-text">{errors.city}</span>}
                    </div>

                    <div className="form-group">
                      <label>State *</label>
                      <select
                        value={bookingData.state}
                        onChange={(e) => setBookingData({ ...bookingData, state: e.target.value })}
                        className={errors.state ? 'error' : ''}
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
                      {errors.state && <span className="error-text">{errors.state}</span>}
                    </div>
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

          {/* Booking Summary Sidebar */}
          <div className="booking-summary-section">
            <div className="booking-summary">
              <h3>Booking Summary</h3>
              {/* Static Booking Summary */}
              <div className="summary-item">
                {type === 'flights' && (
                  <div className="summary-details">
                    {flightLegs.length > 0 ? (
                      flightLegs.map((leg, index) => (
                        <div key={index} className={`summary-leg ${index > 0 ? 'mt-4 pt-4' : ''}`} style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '1.1em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>✈️</span> {leg.airline} {leg.flightNumber} — <span style={{ color: '#555' }}>{leg.legType === 'Flight' ? 'One-way' : leg.legType}</span>
                          </h4>
                          <p style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '4px', marginLeft: '28px' }}>
                            {leg.from} → {leg.to}
                          </p>
                          <p style={{ fontSize: '1.1em', marginLeft: '28px' }}>
                            {(() => {
                              if (!leg.departureTime || !leg.arrivalTime) return '';
                              const depDate = new Date(leg.departureTime).toLocaleDateString();
                              const arrDate = new Date(leg.arrivalTime).toLocaleDateString();
                              return depDate === arrDate ? depDate : `${depDate} - ${arrDate}`;
                            })()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="summary-leg">
                        <h4 style={{ fontSize: '1.1em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>✈️</span> {item.airline} {item.flight_number}
                        </h4>
                        <p style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '4px', marginLeft: '28px' }}>
                          {item.departure_city} → {item.arrival_city}
                        </p>
                        <p style={{ fontSize: '1.1em', marginLeft: '28px' }}>
                          {(() => {
                            if (!item.departure_time || !item.arrival_time) return '';
                            const depDate = new Date(item.departure_time).toLocaleDateString();
                            const arrDate = new Date(item.arrival_time).toLocaleDateString();
                            return depDate === arrDate ? depDate : `${depDate} - ${arrDate}`;
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {type === 'hotels' && (
                  <div className="summary-details">
                    <div className="summary-leg">
                      <h4 style={{ fontSize: '1.1em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏨</span> {item.name}
                      </h4>
                      <p style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '4px', marginLeft: '28px' }}>
                        {item.location}
                      </p>
                      {item.rating && (
                        <p style={{ fontSize: '1.1em', marginLeft: '28px', color: '#f5a623' }}>
                          {'⭐'.repeat(Math.round(item.rating))} ({item.rating})
                        </p>
                      )}
                      <p style={{ fontSize: '1.1em', marginLeft: '28px', marginTop: '8px' }}>
                        {(() => {
                          const searchParams = new URLSearchParams(window.location.search);
                          const checkIn = searchParams.get('checkIn') || searchParams.get('checkin');
                          const checkOut = searchParams.get('checkOut') || searchParams.get('checkout');
                          if (!checkIn || !checkOut) return 'Dates not selected';
                          return `${new Date(checkIn).toLocaleDateString()} - ${new Date(checkOut).toLocaleDateString()}`;
                        })()}
                      </p>
                    </div>
                  </div>
                )}
                {type === 'cars' && (
                  <div className="summary-details">
                    <div className="summary-leg">
                      <h4 style={{ fontSize: '1.1em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🚗</span> {item.brand} {item.model}
                      </h4>
                      <p style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '4px', marginLeft: '28px' }}>
                        {item.provider}
                      </p>
                      <p style={{ fontSize: '1.1em', marginLeft: '28px' }}>
                        📍 {item.location}
                      </p>
                      <p style={{ fontSize: '1.1em', marginLeft: '28px', marginTop: '8px' }}>
                        {(() => {
                          const searchParams = new URLSearchParams(window.location.search);
                          const pickup = searchParams.get('pickupDate') || searchParams.get('pickup');
                          const dropoff = searchParams.get('dropoffDate') || searchParams.get('dropoff');
                          if (!pickup || !dropoff) return 'Dates not selected';
                          return `${new Date(pickup).toLocaleDateString()} - ${new Date(dropoff).toLocaleDateString()}`;
                        })()}
                      </p>
                    </div>
                  </div>
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
  );
}

export default BookingPage;
