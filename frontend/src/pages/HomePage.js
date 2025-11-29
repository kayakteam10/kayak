import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FaPlane, FaHotel, FaCar, FaUmbrellaBeach, FaMagic, FaSearch, FaExchangeAlt, FaCalendarAlt, FaUser } from 'react-icons/fa';
import AirportAutocomplete from '../components/AirportAutocomplete';
import './HomePage.css';

const heroImages = [
  {
    src: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80',
    alt: 'Airplane wing in sky',
    variant: 'square'
  },
  {
    src: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=600&q=80',
    alt: 'Travel destination',
    variant: 'square'
  },
  {
    src: 'https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=600&q=80',
    alt: 'Airport terminal',
    variant: 'square'
  },
  {
    src: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80',
    alt: 'Scenic mountain view from plane',
    variant: 'square'
  }
];

const featuredHotels = [
  {
    id: 'emerald-bay',
    name: 'Emerald Bay Resort',
    location: 'Seattle, WA',
    rating: 4.8,
    price: 189,
    discount: '15% OFF',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pacific-haven',
    name: 'Pacific Haven Hotel',
    location: 'San Francisco, CA',
    rating: 4.6,
    price: 214,
    discount: 'Free breakfast',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'skyline-suites',
    name: 'Skyline Suites',
    location: 'Chicago, IL',
    rating: 4.7,
    price: 172,
    discount: 'Member deal',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'ocean-view',
    name: 'Ocean View Paradise',
    location: 'Miami, FL',
    rating: 4.9,
    price: 245,
    discount: '20% OFF',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80'
  }
];

const HERO_NAV_ITEMS = [
  { key: 'flights', label: 'Flights', icon: FaPlane, disabled: false },
  { key: 'hotels', label: 'Stays', icon: FaHotel, disabled: false },
  { key: 'cars', label: 'Cars', icon: FaCar, disabled: false },
  { key: 'packages', label: 'Packages', icon: FaUmbrellaBeach, disabled: true },
  { key: 'ai-mode', label: 'AI Mode', icon: FaMagic, disabled: true }
];

const SEARCH_TABS = [
  { key: 'flights', label: 'Flights', icon: FaPlane },
  { key: 'hotels', label: 'Hotels', icon: FaHotel },
  { key: 'cars', label: 'Cars', icon: FaCar }
];

const heroMessages = {
  flights: 'Compare flight deals from 100s of sites',
  hotels: 'Compare hotel deals from 100s of sites',
  cars: 'Compare rental cars from 100s of sites'
};

const createLeg = () => ({ from: '', to: '', departDate: '' });

const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split('T')[0];
};

const normalizeCityName = (cityName) => {
  if (!cityName) return '';
  let normalized = cityName.trim();
  normalized = normalized.replace(/\s*\([A-Z]{3,4}\)\s*$/i, '');
  normalized = normalized.replace(/\s*,\s*[A-Z]{2,3}(\s*\([^)]+\))?\s*$/i, '');
  normalized = normalized.replace(/\s*,\s*(USA|United States|US)\s*$/i, '');
  return normalized.trim();
};

const mapTabToType = (tabKey) => {
  if (tabKey === 'hotels') return 'hotels';
  if (tabKey === 'cars') return 'cars';
  return 'flights';
};

const HomePage = () => {
  const navigate = useNavigate();
  const travelersTriggerRef = useRef(null);
  const travelersDropdownRef = useRef(null);
  const hotelGuestsTriggerRef = useRef(null);

  const [activeTab, setActiveTab] = useState('flights');
  const [tripType, setTripType] = useState('roundtrip');
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    departure_date: '',
    return_date: '',
    passengers: 1
  });
  const [hotelData, setHotelData] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: { rooms: 1, adults: 2, children: 0 }
  });
  const [carData, setCarData] = useState({
    sameDropoff: true,
    pickupLocation: '',
    dropoffLocation: '',
    pickupDate: '',
    pickupTime: '10:00',
    dropoffDate: '',
    dropoffTime: '10:00'
  });
  const [showPickupTimeDropdown, setShowPickupTimeDropdown] = useState(false);
  const [showDropoffTimeDropdown, setShowDropoffTimeDropdown] = useState(false);
  const [multiCityLegs, setMultiCityLegs] = useState([createLeg(), createLeg()]);
  const [travelers, setTravelers] = useState({ adults: 1, children: 0, infants: 0 });
  const [cabinClass, setCabinClass] = useState('economy');
  const [showTravelersDropdown, setShowTravelersDropdown] = useState(false);
  const [showHotelGuestsDropdown, setShowHotelGuestsDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const updateHotelGuests = (type, delta) => {
    setHotelData((prev) => {
      const currentVal = prev.guests[type];
      const nextVal = Math.max(0, currentVal + delta);
      if (type === 'rooms' && nextVal < 1) return prev; // Min 1 room
      if (type === 'adults' && nextVal < 1) return prev; // Min 1 adult

      return {
        ...prev,
        guests: {
          ...prev.guests,
          [type]: nextVal
        }
      };
    });
  };
  const [multiCityDropdownPosition, setMultiCityDropdownPosition] = useState({ position: 'below', maxHeight: '320px' });
  const [isMounted, setIsMounted] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!showTravelersDropdown && !showHotelGuestsDropdown) return;

    const updateDropdownMetrics = () => {
      const triggerRef = showHotelGuestsDropdown ? hotelGuestsTriggerRef : travelersTriggerRef;
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: rect.width
      });

      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldFlip = spaceBelow < 320 && spaceAbove > spaceBelow;
      const availableSpace = shouldFlip ? spaceAbove : spaceBelow;
      setMultiCityDropdownPosition({
        position: shouldFlip ? 'above' : 'below',
        maxHeight: `${Math.max(240, availableSpace - 24)}px`
      });
    };

    const handleClickOutside = (event) => {
      if (
        travelersDropdownRef.current &&
        !travelersDropdownRef.current.contains(event.target) &&
        travelersTriggerRef.current &&
        !travelersTriggerRef.current.contains(event.target)
      ) {
        setShowTravelersDropdown(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowTravelersDropdown(false);
      }
    };

    updateDropdownMetrics();
    window.addEventListener('resize', updateDropdownMetrics);
    window.addEventListener('scroll', updateDropdownMetrics, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('resize', updateDropdownMetrics);
      window.removeEventListener('scroll', updateDropdownMetrics, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showTravelersDropdown]);

  const updateTravelerCount = (type, delta) => {
    setTravelers((prev) => {
      const nextValue = type === 'adults' ? Math.max(1, prev[type] + delta) : Math.max(0, prev[type] + delta);
      const updated = { ...prev, [type]: nextValue };
      const totalPassengers = updated.adults + updated.children + updated.infants;
      setFormData((current) => ({ ...current, passengers: Math.max(1, totalPassengers) }));
      return updated;
    });
  };

  const getTravelersSummary = () => {
    const parts = [`${travelers.adults} ${travelers.adults === 1 ? 'adult' : 'adults'}`];
    if (travelers.children > 0) parts.push(`${travelers.children} ${travelers.children === 1 ? 'child' : 'children'}`);
    if (travelers.infants > 0) parts.push(`${travelers.infants} ${travelers.infants === 1 ? 'infant' : 'infants'}`);
    const summary = parts.join(', ');
    return `${summary || '1 adult'}, ${cabinClass.charAt(0).toUpperCase()}${cabinClass.slice(1)}`;
  };

  const getMinReturnDate = () => formData.departure_date || getTodayDate();

  const addLeg = () => {
    if (multiCityLegs.length >= 6) return;
    setMultiCityLegs((prev) => [...prev, createLeg()]);
  };

  const removeLeg = (index) => {
    if (multiCityLegs.length <= 2) return;
    setMultiCityLegs((prev) => prev.filter((_, legIndex) => legIndex !== index));
  };

  const updateLeg = (index, field, value) => {
    setMultiCityLegs((prev) => {
      const nextLegs = [...prev];
      nextLegs[index] = { ...nextLegs[index], [field]: value };

      // Auto-fill next leg's origin if we're updating destination
      if (field === 'to' && index + 1 < nextLegs.length) {
        nextLegs[index + 1] = { ...nextLegs[index + 1], from: value };
      }

      return nextLegs;
    });
  };

  const handleTripTypeChange = (nextTripType) => {
    setTripType(nextTripType);
    setValidationError('');
    setShowTravelersDropdown(false);
    if (nextTripType !== 'roundtrip') {
      setFormData((prev) => ({ ...prev, return_date: '' }));
    }
    if (nextTripType !== 'multicity') {
      setMultiCityLegs([createLeg(), createLeg()]);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setValidationError('');

    // Handle hotel search
    if (activeTab === 'hotels') {
      if (!hotelData.location.trim()) {
        setValidationError('Enter a location.');
        return;
      }
      if (!hotelData.checkIn || !hotelData.checkOut) {
        setValidationError('Select check-in and check-out dates.');
        return;
      }

      const params = new URLSearchParams();
      params.set('location', hotelData.location);
      params.set('checkIn', hotelData.checkIn);
      params.set('checkOut', hotelData.checkOut);
      params.set('rooms', String(hotelData.guests.rooms));
      params.set('adults', String(hotelData.guests.adults));
      params.set('children', String(hotelData.guests.children));

      setShowHotelGuestsDropdown(false);
      navigate(`/hotels?${params.toString()}`);
      return;
    }

    // Handle car search
    if (activeTab === 'cars') {
      if (!carData.pickupLocation.trim()) {
        setValidationError('Enter a pickup location.');
        return;
      }
      if (!carData.sameDropoff && !carData.dropoffLocation.trim()) {
        setValidationError('Enter a drop-off location.');
        return;
      }
      if (!carData.pickupDate || !carData.dropoffDate) {
        setValidationError('Select pickup and drop-off dates.');
        return;
      }

      const params = new URLSearchParams();
      params.set('type', 'cars');
      params.set('pickupLocation', carData.pickupLocation);
      params.set('dropoffLocation', carData.sameDropoff ? carData.pickupLocation : carData.dropoffLocation);
      params.set('pickupDate', carData.pickupDate);
      params.set('pickupTime', carData.pickupTime);
      params.set('dropoffDate', carData.dropoffDate);
      params.set('dropoffTime', carData.dropoffTime);

      navigate(`/search?${params.toString()}`);
      return;
    }

    // Handle flight search
    if (tripType === 'multicity') {
      const hasIncompleteLeg = multiCityLegs.some((leg) => !leg.from.trim() || !leg.to.trim() || !leg.departDate);
      if (hasIncompleteLeg) {
        setValidationError('Please fill out every multi-city leg.');
        return;
      }
    } else {
      if (!formData.origin.trim() || !formData.destination.trim()) {
        setValidationError('Enter both origin and destination.');
        return;
      }
      if (normalizeCityName(formData.origin) === normalizeCityName(formData.destination)) {
        setValidationError('Origin and destination must be different.');
        return;
      }
      if (!formData.departure_date) {
        setValidationError('Select a departure date.');
        return;
      }
      if (tripType === 'roundtrip' && !formData.return_date) {
        setValidationError('Select a return date.');
        return;
      }
    }

    const params = new URLSearchParams();
    params.set('type', mapTabToType(activeTab));
    params.set('tripType', tripType);
    params.set('passengers', String(formData.passengers));
    params.set('cabinClass', cabinClass);

    if (tripType === 'multicity') {
      params.set('legs', JSON.stringify(multiCityLegs));
      params.set('origin', multiCityLegs[0].from);
      params.set('destination', multiCityLegs[multiCityLegs.length - 1].to);
      params.set('departure_date', multiCityLegs[0].departDate);
    } else {
      params.set('origin', formData.origin);
      params.set('destination', formData.destination);
      params.set('departure_date', formData.departure_date);
      if (tripType === 'roundtrip') {
        params.set('return_date', formData.return_date);
      }
    }

    setShowTravelersDropdown(false);
    navigate(`/search?${params.toString()}`);
  };

  const handleDepartureChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, departure_date: value }));
    setValidationError('');
  };

  const handleReturnChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, return_date: value }));
    setValidationError('');
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationError('');
  };

  const renderTravelersDropdown = () => (
    <div className="travelers-section">
      <h3 className="travelers-section-title">Travelers</h3>
      {[
        { key: 'adults', label: 'Adults', age: '18-64', min: 1 },
        { key: 'children', label: 'Children', age: '2-11', min: 0 },
        { key: 'infants', label: 'Infants', age: 'Under 2', min: 0 }
      ].map(({ key, label, age, min }) => (
        <div className="traveler-category" key={key}>
          <div className="traveler-category-label">
            <span className="traveler-type">{label}</span>
            <span className="traveler-age">{age}</span>
          </div>
          <div className="traveler-counter">
            <button
              type="button"
              className="counter-btn"
              onClick={() => updateTravelerCount(key, -1)}
              disabled={travelers[key] <= min}
            >
              −
            </button>
            <span className="counter-value">{travelers[key]}</span>
            <button
              type="button"
              className="counter-btn"
              onClick={() => updateTravelerCount(key, 1)}
            >
              +
            </button>
          </div>
        </div>
      ))}
      <div className="cabin-class-section">
        <h3 className="travelers-section-title">Cabin Class</h3>
        <div className="cabin-class-grid">
          {['economy', 'premium', 'business', 'first'].map((option) => (
            <button
              type="button"
              key={option}
              className={`cabin-class-btn ${cabinClass === option ? 'selected' : ''}`}
              onClick={() => setCabinClass(option)}
            >
              {option === 'premium' ? 'Premium Economy' : option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTravelersControl = (extraClass = '') => (
    <div className={`search-segment travelers-segment ${extraClass}`.trim()} style={{ padding: 0, height: 'auto', border: 'none' }}>
      <div className="segment-icon-wrapper">
        <FaUser className="segment-icon" />
      </div>
      <div className="segment-content">
        <label className="segment-label">Travelers</label>
        <div className="travelers-dropdown-wrapper">
          <button
            ref={travelersTriggerRef}
            type="button"
            className="travelers-trigger-clean"
            style={{ padding: 0, height: 'auto', width: '100%', textAlign: 'left' }}
            onClick={() => setShowTravelersDropdown((prev) => !prev)}
          >
            <span className="travelers-text">{getTravelersSummary()}</span>
            <span className="dropdown-arrow">{showTravelersDropdown ? '▲' : '▼'}</span>
          </button>
          {showTravelersDropdown && (
            <div
              ref={travelersDropdownRef}
              className="travelers-dropdown-menu multi-city-dropdown"
            >
              {renderTravelersDropdown()}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const heroMessage = heroMessages[activeTab] || heroMessages.flights;

  const generateTimeSlots = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        times.push(`${h}:${m}`);
      }
    }
    return times;
  };

  const handleCarInputChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setCarData((prev) => {
      const updates = { ...prev, [field]: value };

      // If same dropoff is enabled, sync dropoff location with pickup
      if (field === 'sameDropoff' && value === true) {
        updates.dropoffLocation = prev.pickupLocation;
      }
      if (field === 'pickupLocation' && prev.sameDropoff) {
        updates.dropoffLocation = value;
      }

      // Handle date logic similar to hotels
      if (field === 'pickupDate') {
        if (prev.dropoffDate && value > prev.dropoffDate) {
          updates.dropoffDate = value;
        } else if (!prev.dropoffDate && value) {
          updates.dropoffDate = value;
        }
      } else if (field === 'dropoffDate') {
        if (prev.pickupDate && value < prev.pickupDate) {
          updates.pickupDate = value;
        }
      }

      return updates;
    });
  };

  const hotelImages = [
    {
      src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
      alt: 'Luxury hotel pool',
      variant: 'square'
    },
    {
      src: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
      alt: 'Resort relaxation',
      variant: 'square'
    },
    {
      src: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
      alt: 'Hotel room interior',
      variant: 'square'
    },
    {
      src: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
      alt: 'City hotel view',
      variant: 'square'
    }
  ];

  const carImages = [
    {
      src: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80',
      alt: 'Scenic road trip',
      variant: 'square'
    },
    {
      src: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
      alt: 'Luxury car rental',
      variant: 'square'
    },
    {
      src: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=600&q=80',
      alt: 'Convertible driving',
      variant: 'square'
    },
    {
      src: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
      alt: 'Road adventure',
      variant: 'square'
    }
  ];

  const handleHotelInputChange = (field) => (e) => {
    const value = e.target.value;
    setHotelData((prev) => {
      const updates = { ...prev, [field]: value };

      if (field === 'checkIn') {
        // Push check-out if it's before or same as new check-in
        if (prev.checkOut && value >= prev.checkOut) {
          const nextDay = new Date(value);
          nextDay.setDate(nextDay.getDate() + 1);
          updates.checkOut = nextDay.toISOString().split('T')[0];
        } else if (!prev.checkOut && value) {
          const nextDay = new Date(value);
          nextDay.setDate(nextDay.getDate() + 1);
          updates.checkOut = nextDay.toISOString().split('T')[0];
        }
      } else if (field === 'checkOut') {
        // Pull check-in if it's after or same as new check-out
        if (prev.checkIn && value <= prev.checkIn) {
          const prevDay = new Date(value);
          prevDay.setDate(prevDay.getDate() - 1);
          updates.checkIn = prevDay.toISOString().split('T')[0];
        }
      }
      return updates;
    });
  };

  const renderHotelGuestsDropdown = () => (
    <div className="travelers-dropdown-content">
      {[
        { key: 'rooms', label: 'Rooms', min: 1 },
        { key: 'adults', label: 'Adults', min: 1 },
        { key: 'children', label: 'Children', min: 0 }
      ].map(({ key, label, min }) => (
        <div className="traveler-type-row" key={key}>
          <div className="traveler-type-info">
            <span className="traveler-type-label">{label}</span>
          </div>
          <div className="traveler-counter">
            <button
              type="button"
              className="counter-btn"
              onClick={() => updateHotelGuests(key, -1)}
              disabled={hotelData.guests[key] <= min}
            >
              −
            </button>
            <span className="counter-value">{hotelData.guests[key]}</span>
            <button
              type="button"
              className="counter-btn"
              onClick={() => updateHotelGuests(key, 1)}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderHotelSearchFields = () => (
    <div className="hero-search-bar-container hotel-search-container">
      {/* Location Segment */}
      <div className="search-segment location-segment" style={{ flex: 2 }}>
        <div className="segment-icon-wrapper">
          <FaHotel className="segment-icon" />
        </div>
        <div className="segment-content">
          <label className="segment-label">Location</label>
          <input
            type="text"
            className="segment-input"
            placeholder="Enter a city, hotel, airport, address or landmark"
            value={hotelData.location}
            onChange={handleHotelInputChange('location')}
            required
          />
        </div>
      </div>

      <div className="vertical-separator"></div>

      {/* Dates Segment */}
      <div className="search-segment dates-segment" style={{ flex: 1.5 }}>
        <div className="segment-icon-wrapper">
          <FaCalendarAlt className="segment-icon" />
        </div>
        <div className="segment-content">
          <div className="dates-row">
            <div className="date-field">
              <label className="segment-label">Check-in</label>
              <input
                type="date"
                className="segment-input date-input"
                min={getTodayDate()}
                value={hotelData.checkIn}
                onChange={handleHotelInputChange('checkIn')}
                required
              />
            </div>
            <div className="date-divider"></div>
            <div className="date-field">
              <label className="segment-label">Check-out</label>
              <input
                type="date"
                className="segment-input date-input"
                min={hotelData.checkIn || getTodayDate()}
                value={hotelData.checkOut}
                onChange={handleHotelInputChange('checkOut')}
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="vertical-separator"></div>

      {/* Guests Segment */}
      <div className="search-segment guests-segment" style={{ flex: 1 }}>
        <div className="segment-icon-wrapper">
          <FaUser className="segment-icon" />
        </div>
        <div className="segment-content">
          <label className="segment-label">Guests</label>
          <button
            ref={hotelGuestsTriggerRef}
            type="button"
            className="travelers-trigger-clean"
            style={{ textAlign: 'left' }}
            onClick={() => setShowHotelGuestsDropdown((prev) => !prev)}
          >
            <span className="travelers-text">
              {hotelData.guests.rooms} room, {hotelData.guests.adults + hotelData.guests.children} guests
            </span>
            <span className="dropdown-arrow">{showHotelGuestsDropdown ? '▲' : '▼'}</span>
          </button>

          {showHotelGuestsDropdown && (
            <div
              className="travelers-dropdown-menu"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                width: '100%',
                minWidth: '280px',
                zIndex: 99999
              }}
            >
              {renderHotelGuestsDropdown()}
            </div>
          )}
        </div>
      </div>

      {/* Search Button */}
      <div className="search-segment button-segment">
        <button type="submit" className="main-search-btn">
          <FaSearch />
        </button>
      </div>
    </div>
  );

  const renderCarSearchFields = () => {
    const timeSlots = generateTimeSlots();

    return (
      <div className="hero-search-bar-container car-search-container">
        {/* Same Drop-off Toggle */}
        <div className="car-toggle-section">
          <label className="car-toggle-label">
            <input
              type="checkbox"
              checked={carData.sameDropoff}
              onChange={handleCarInputChange('sameDropoff')}
              className="car-toggle-checkbox"
            />
            <span className="car-toggle-text">Same drop-off</span>
          </label>
        </div>

        {/* Pickup Location */}
        <div className="search-segment location-segment" style={{ flex: 2 }}>
          <div className="segment-icon-wrapper">
            <FaCar className="segment-icon" />
          </div>
          <div className="segment-content">
            <label className="segment-label">Pick-up Location</label>
            <input
              type="text"
              className="segment-input"
              placeholder="From?"
              value={carData.pickupLocation}
              onChange={handleCarInputChange('pickupLocation')}
              required
            />
          </div>
        </div>

        {!carData.sameDropoff && (
          <>
            <div className="vertical-separator"></div>

            {/* Drop-off Location */}
            <div className="search-segment location-segment" style={{ flex: 2 }}>
              <div className="segment-icon-wrapper">
                <FaCar className="segment-icon" />
              </div>
              <div className="segment-content">
                <label className="segment-label">Drop-off Location</label>
                <input
                  type="text"
                  className="segment-input"
                  placeholder="To?"
                  value={carData.dropoffLocation}
                  onChange={handleCarInputChange('dropoffLocation')}
                  required
                />
              </div>
            </div>
          </>
        )}

        <div className="vertical-separator"></div>

        {/* Pickup Date & Time */}
        <div className="search-segment datetime-segment" style={{ flex: 1.5 }}>
          <div className="segment-icon-wrapper">
            <FaCalendarAlt className="segment-icon" />
          </div>
          <div className="segment-content">
            <label className="segment-label">Pick-up</label>
            <div className="datetime-row">
              <input
                type="date"
                className="segment-input date-input"
                value={carData.pickupDate}
                min={getTodayDate()}
                onChange={handleCarInputChange('pickupDate')}
                required
                style={{ flex: 1 }}
              />
              <div className="time-selector-wrapper">
                <button
                  type="button"
                  className="time-selector-trigger"
                  onClick={() => setShowPickupTimeDropdown(!showPickupTimeDropdown)}
                >
                  {carData.pickupTime}
                  <span className="dropdown-arrow">{showPickupTimeDropdown ? '▲' : '▼'}</span>
                </button>
                {showPickupTimeDropdown && (
                  <div className="time-dropdown-menu">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={`time-option ${carData.pickupTime === time ? 'selected' : ''}`}
                        onClick={() => {
                          handleCarInputChange('pickupTime')({ target: { value: time } });
                          setShowPickupTimeDropdown(false);
                        }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="vertical-separator"></div>

        {/* Drop-off Date & Time */}
        <div className="search-segment datetime-segment" style={{ flex: 1.5 }}>
          <div className="segment-icon-wrapper">
            <FaCalendarAlt className="segment-icon" />
          </div>
          <div className="segment-content">
            <label className="segment-label">Drop-off</label>
            <div className="datetime-row">
              <input
                type="date"
                className="segment-input date-input"
                value={carData.dropoffDate}
                min={carData.pickupDate || getTodayDate()}
                onChange={handleCarInputChange('dropoffDate')}
                required
                style={{ flex: 1 }}
              />
              <div className="time-selector-wrapper">
                <button
                  type="button"
                  className="time-selector-trigger"
                  onClick={() => setShowDropoffTimeDropdown(!showDropoffTimeDropdown)}
                >
                  {carData.dropoffTime}
                  <span className="dropdown-arrow">{showDropoffTimeDropdown ? '▲' : '▼'}</span>
                </button>
                {showDropoffTimeDropdown && (
                  <div className="time-dropdown-menu">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={`time-option ${carData.dropoffTime === time ? 'selected' : ''}`}
                        onClick={() => {
                          handleCarInputChange('dropoffTime')({ target: { value: time } });
                          setShowDropoffTimeDropdown(false);
                        }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Button */}
        <div className="search-segment button-segment">
          <button type="submit" className="main-search-btn">
            <FaSearch />
          </button>
        </div>
      </div>
    );
  };

  const renderHeroSearchFields = () => (
    <div className="hero-search-bar-container">
      {/* Segment 1: Origin */}
      <div className="search-segment origin-segment">
        <div className="segment-icon-wrapper">
          <FaPlane className="segment-icon" />
        </div>
        <div className="segment-content">
          <label className="segment-label">From</label>
          <AirportAutocomplete
            value={formData.origin}
            onChange={(city) => setFormData(prev => ({ ...prev, origin: city }))}
            placeholder="Country, city or airport"
            name="origin"
            required
          />
        </div>
      </div>

      <div className="vertical-separator"></div>

      {/* Segment 2: Swap */}
      <div className="search-segment swap-segment">
        <button
          type="button"
          className="swap-btn-clean"
          onClick={() => {
            setFormData(prev => ({
              ...prev,
              origin: prev.destination,
              destination: prev.origin
            }));
          }}
          title="Swap origin and destination"
        >
          <FaExchangeAlt />
        </button>
      </div>

      <div className="vertical-separator"></div>

      {/* Segment 3: Destination */}
      <div className="search-segment destination-segment">
        <div className="segment-icon-wrapper">
          <FaPlane className="segment-icon" />
        </div>
        <div className="segment-content">
          <label className="segment-label">To</label>
          <AirportAutocomplete
            value={formData.destination}
            onChange={(city) => setFormData(prev => ({ ...prev, destination: city }))}
            placeholder="Country, city or airport"
            name="destination"
            required
          />
        </div>
      </div>

      <div className="vertical-separator"></div>

      {/* Segment 4: Dates */}
      <div className="search-segment dates-segment">
        <div className="segment-icon-wrapper">
          <FaCalendarAlt className="segment-icon" />
        </div>
        <div className="segment-content">
          <div className="dates-row">
            <div className="date-field">
              <label className="segment-label">Depart</label>
              <input
                type="date"
                name="departure_date"
                className="segment-input date-input"
                value={formData.departure_date}
                min={getTodayDate()}
                onChange={handleDepartureChange}
                required
              />
            </div>
            {tripType === 'roundtrip' && (
              <>
                <div className="date-divider"></div>
                <div className="date-field">
                  <label className="segment-label">Return</label>
                  <input
                    type="date"
                    name="return_date"
                    className="segment-input date-input"
                    value={formData.return_date}
                    min={getMinReturnDate()}
                    onChange={handleReturnChange}
                    required
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="vertical-separator"></div>

      {/* Segment 5: Travelers */}
      <div className="search-segment travelers-segment">
        <div className="segment-icon-wrapper">
          <FaUser className="segment-icon" />
        </div>
        <div className="segment-content">
          <label className="segment-label">Travelers</label>
          <button
            ref={travelersTriggerRef}
            type="button"
            className="travelers-trigger-clean"
            onClick={() => setShowTravelersDropdown((prev) => !prev)}
          >
            <span className="travelers-text">{getTravelersSummary()}</span>
            <span className="dropdown-arrow">{showTravelersDropdown ? '▲' : '▼'}</span>
          </button>

          {/* Dropdown Portal Logic */}
          {tripType === 'multicity' ? (
            showTravelersDropdown && (
              <div
                ref={travelersDropdownRef}
                className={`travelers-dropdown-menu multi-city-dropdown ${multiCityDropdownPosition.position === 'above' ? 'position-above' : 'position-below'}`}
                style={{ maxHeight: multiCityDropdownPosition.maxHeight, overflowY: 'auto' }}
              >
                {renderTravelersDropdown()}
              </div>
            )
          ) : (
            isMounted &&
            showTravelersDropdown &&
            createPortal(
              <div
                ref={travelersDropdownRef}
                className="travelers-dropdown-menu"
                style={{
                  position: 'fixed',
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${Math.max(dropdownPosition.width, 384)}px`,
                  zIndex: 99999
                }}
              >
                {renderTravelersDropdown()}
              </div>,
              document.body
            )
          )}
        </div>
      </div>

      {/* Segment 6: Search Button */}
      <div className="search-segment button-segment">
        <button type="submit" className="main-search-btn">
          <FaSearch />
        </button>
      </div>
    </div>
  );

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-headline">
              {heroMessage}
              <span className="hero-headline-dot">.</span>
            </div>



            <div className="search-tabs">
              {SEARCH_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  className={`tab-button ${activeTab === key ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(key);
                    setValidationError('');
                  }}
                >
                  <Icon className="tab-icon" />
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'flights' && (
              <div className="trip-pills">
                {[
                  { key: 'roundtrip', label: 'Roundtrip' },
                  { key: 'oneway', label: 'One-way' },
                  { key: 'multicity', label: 'Multi-city' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`trip-pill ${tripType === key ? 'active' : ''}`}
                    onClick={() => handleTripTypeChange(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <form
              className={`search-form ${activeTab === 'flights' && tripType === 'oneway' ? 'one-way' : activeTab === 'flights' && tripType === 'multicity' ? 'multi-city' : ''}`}
              onSubmit={handleSubmit}
            >
              {activeTab === 'cars' ? (
                <div className="hero-search-bar">{renderCarSearchFields()}</div>
              ) : activeTab === 'hotels' ? (
                <div className="hero-search-bar">{renderHotelSearchFields()}</div>
              ) : tripType === 'multicity' ? (
                <>
                  <div className="multi-city-legs">
                    {multiCityLegs.map((leg, index) => (
                      <div className="multi-city-leg-card" key={`leg-${index}`}>
                        <div className="leg-card-header">
                          <span className="leg-title">Leg {index + 1}</span>
                          {multiCityLegs.length > 2 && (
                            <button
                              type="button"
                              className="remove-leg-btn-clean"
                              onClick={() => removeLeg(index)}
                              aria-label={`Remove leg ${index + 1}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <div className="leg-card-content">
                          {/* From Segment */}
                          <div className="leg-segment origin-segment">
                            <div className="segment-icon-wrapper">
                              <FaPlane className="segment-icon" />
                            </div>
                            <div className="segment-content">
                              <label className="segment-label">From</label>
                              <AirportAutocomplete
                                value={leg.from}
                                onChange={(city) => {
                                  updateLeg(index, 'from', city);
                                  setValidationError('');
                                }}
                                placeholder="Country, city or airport"
                                name={`leg-${index}-from`}
                                required
                              />
                            </div>
                          </div>

                          <div className="vertical-separator"></div>

                          {/* To Segment */}
                          <div className="leg-segment destination-segment">
                            <div className="segment-icon-wrapper">
                              <FaPlane className="segment-icon" />
                            </div>
                            <div className="segment-content">
                              <label className="segment-label">To</label>
                              <AirportAutocomplete
                                value={leg.to}
                                onChange={(city) => {
                                  updateLeg(index, 'to', city);
                                  setValidationError('');
                                }}
                                placeholder="Country, city or airport"
                                name={`leg-${index}-to`}
                                required
                              />
                            </div>
                          </div>

                          <div className="vertical-separator"></div>

                          {/* Depart Segment */}
                          <div className="leg-segment date-segment">
                            <div className="segment-icon-wrapper">
                              <FaCalendarAlt className="segment-icon" />
                            </div>
                            <div className="segment-content">
                              <label className="segment-label">Depart</label>
                              <input
                                type="date"
                                className="segment-input date-input"
                                value={leg.departDate}
                                min={index > 0 ? multiCityLegs[index - 1].departDate || getTodayDate() : getTodayDate()}
                                onChange={(event) => {
                                  updateLeg(index, 'departDate', event.target.value);
                                  setValidationError('');
                                }}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="multi-city-divider"></div>

                  {multiCityLegs.length < 6 && (
                    <button type="button" className="add-leg-btn" onClick={addLeg}>
                      <span>+</span> Add another flight
                    </button>
                  )}
                  <div className="hero-search-actions">
                    {renderTravelersControl('hero-search-travelers stacked')}
                    <button type="submit" className="search-btn hero-search-submit">
                      <FaSearch />
                    </button>
                  </div>
                </>
              ) : (
                <div className="hero-search-bar">{renderHeroSearchFields()}</div>
              )}
            </form>

            {validationError && (
              <div className="validation-error" role="alert">
                {validationError}
              </div>
            )}
          </div>

          <div className="hero-media">
            <div className="hero-media-grid">
              {(activeTab === 'cars' ? carImages : activeTab === 'hotels' ? hotelImages : heroImages).map((image, index) => (
                <img
                  key={`${image.src}-${index}`}
                  src={image.src}
                  alt={image.alt}
                  className="hero-media-img"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="featured-section">
        <h2 className="section-title">Featured Hotel Deals</h2>
        <div className="hotel-deals-grid">
          {featuredHotels.map((hotel) => (
            <div
              key={hotel.id}
              className="hotel-tile"
              onClick={() => navigate(`/hotels/${hotel.id}`)}
            >
              <img src={hotel.image} alt={hotel.name} className="hotel-tile-image" />
              <div className="hotel-tile-overlay">
                <div className="hotel-tile-badge">{hotel.discount}</div>
                <div className="hotel-tile-content">
                  <h3 className="hotel-tile-title">{hotel.name}</h3>
                  <p className="hotel-tile-location">📍 {hotel.location}</p>
                  <div className="hotel-tile-footer">
                    <div className="hotel-tile-rating">
                      <span className="rating-stars">⭐</span>
                      <span className="rating-value">{hotel.rating.toFixed(1)}</span>
                    </div>
                    <div className="hotel-tile-price">
                      <span className="price-amount">${hotel.price}</span>
                      <span className="price-label">/night</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
