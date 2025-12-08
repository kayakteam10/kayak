import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { flightsAPI, hotelsAPI, carsAPI, bookingsAPI } from '../services/api';
import FiltersSidebar from '../components/FiltersSidebar';
import FlightDetailsSlideOver from '../components/FlightDetailsSlideOver';
import MissingLegBanner from '../components/MissingLegBanner';
import PriceMatrix from '../components/PriceMatrix';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { FaPlane, FaHotel, FaCar, FaStar, FaMapMarkerAlt, FaClock, FaUsers, FaSuitcase } from 'react-icons/fa';
import { trackPageView, trackPropertyClick, trackSectionView } from '../utils/analytics';
import './SearchResultsPage.css';

function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 10000,
    rating: 0,
    amenities: [],
    airline: '',
    stops: '',
    vehicleType: '',
    seats: '',
    timeWindows: [], // morning, afternoon, evening
  });
  const [sortBy, setSortBy] = useState('price_asc');
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showDetailsSlideOver, setShowDetailsSlideOver] = useState(false);
  const [missingLeg, setMissingLeg] = useState(null);

  // Ensure filteredResults is always an array
  const safeFilteredResults = Array.isArray(filteredResults) ? filteredResults : [];

  const type = searchParams.get('type') || 'flights';
  const tripType = searchParams.get('tripType');
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const returnDate = searchParams.get('return_date');

  // Debug: Log search params
  useEffect(() => {
    console.log('🔍 Search Results Page - Search Params:', {
      type,
      origin,
      destination,
      returnDate,
      departure_date: searchParams.get('departure_date'),
      passengers: searchParams.get('passengers'),
      allParams: Object.fromEntries(searchParams)
    });
  }, [searchParams, type, origin, destination, returnDate]);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError('');
      
      // Track page view
      trackPageView(`search-${type}`, 'results');
      trackSectionView(`search-${type}`, 'results-list', 90);
      
      try {
        let response;
        const params = Object.fromEntries(searchParams);

        console.log('🔍 Search params:', params);
        console.log('🔍 Search type:', type);

        if (type === 'flights') {
          // Map frontend parameters to backend expected format
          const flightParams = {
            from: params.origin,
            to: params.destination,
            date: params.departure_date,
            passengers: params.passengers || '1',
            type: params.tripType || 'oneway'
          };

          // Add return date for roundtrip
          if (params.tripType === 'roundtrip' && params.return_date) {
            flightParams.return_date = params.return_date;
          }

          console.log('✈️ Mapped flight params:', flightParams);
          response = await flightsAPI.search(flightParams);
        } else if (type === 'hotels') {
          response = await hotelsAPI.search(params);
        } else {
          response = await carsAPI.search(params);
        }

        console.log('📦 API Response:', response);
        console.log('📦 Response data:', response.data);

        // Handle different response structures
        let data = [];
        if (type === 'flights') {
          data = response.data.data || response.data.flights || response.data[type] || response.data.results || [];
          console.log('✈️ Flight data extracted:', data);
          console.log('✈️ Number of flights:', data.length);
        } else if (type === 'hotels') {
          data = response.data.data || response.data.hotels || response.data[type] || response.data.results || [];
        } else {
          data = response.data.data || response.data.cars || response.data[type] || response.data.results || [];
        }

        // Ensure data is always an array
        if (!Array.isArray(data)) {
          console.warn('⚠️ Data is not an array, converting to empty array:', data);
          data = [];
        }

        console.log('✅ Setting results:', data.length, 'items');
        if (data.length > 0) {
          console.log('✅ First result sample:', {
            id: data[0].id,
            airline: data[0].airline,
            total_price: data[0].total_price,
            price: data[0].price,
            has_return_flight: !!data[0].return_flight,
            is_roundtrip: data[0].is_roundtrip
          });
        }
        // Check for missing leg in roundtrip searches
        if (type === 'flights' && tripType === 'roundtrip' && response.data) {
          if (response.data.missingLeg) {
            setMissingLeg(response.data.missingLeg);
          } else {
            setMissingLeg(null);
          }
        } else {
          setMissingLeg(null);
        }

        setResults(data);
        setFilteredResults(data);
      } catch (err) {
        console.error('❌ Search error:', err);
        console.error('❌ Error response:', err.response);
        setError('Failed to load results. Please try again.');
        setMissingLeg(null);
        // Ensure we set empty arrays on error
        setResults([]);
        setFilteredResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchParams, type, tripType]);

  useEffect(() => {
    // Ensure results is an array before filtering
    if (!Array.isArray(results)) {
      console.warn('⚠️ Results is not an array in filter useEffect, using empty array');
      setFilteredResults([]);
      return;
    }

    let filtered = [...results];

    // Apply filters
    filtered = filtered.filter(item => {
      // Price filter
      let price;
      if (type === 'flights') {
        // Handle multi-city, roundtrip, and one-way flights
        if (item.is_multicity || item.legs) {
          // Multi-city: use total_price
          price = item.total_price || 0;
        } else if (item.is_roundtrip || item.return_flight) {
          // Roundtrip: use total_price
          price = item.total_price || (parseFloat(item.price || 0) + parseFloat(item.return_flight?.price || 0));
        } else {
          // One-way: use price
          price = item.price || 0;
        }
      } else if (type === 'hotels') {
        price = item.price_per_night || 0;
      } else {
        price = item.price_per_day || 0;
      }

      // Parse price as number (handle string values from database)
      const priceNum = parseFloat(price) || 0;

      if (priceNum < filters.minPrice || priceNum > filters.maxPrice) {
        return false;
      }

      // Rating filter (hotels)
      if (type === 'hotels' && filters.rating > 0 && item.rating < filters.rating) {
        return false;
      }

      // Airline filter (flights)
      if (type === 'flights' && filters.airline) {
        if (item.is_multicity || item.legs) {
          // Multi-city: check if any leg matches the airline
          const matchesAirline = (item.legs || []).some(leg =>
            leg.airline === filters.airline ||
            leg.airline?.includes(filters.airline) ||
            filters.airline === 'Delta' && leg.airline === 'Delta Airlines' ||
            filters.airline === 'United' && leg.airline === 'United Airlines' ||
            filters.airline === 'American Airlines' && leg.airline === 'American Airlines'
          );
          if (!matchesAirline) return false;
        } else {
          // Roundtrip and one-way: check main airline
          const matchesAirline = item.airline === filters.airline ||
            item.airline?.includes(filters.airline) ||
            filters.airline === 'Delta' && item.airline === 'Delta Airlines' ||
            filters.airline === 'United' && item.airline === 'United Airlines' ||
            filters.airline === 'American Airlines' && item.airline === 'American Airlines';
          if (!matchesAirline) return false;
        }
      }

      // Amenities filter (hotels)
      if (type === 'hotels' && filters.amenities.length > 0) {
        const itemAmenities = item.amenities || [];
        const hasAllAmenities = filters.amenities.every(amenity =>
          itemAmenities.includes(amenity)
        );
        if (!hasAllAmenities) return false;
      }

      // Stops filter (flights)
      if (type === 'flights' && filters.stops) {
        // For now, all flights are non-stop, so filter accordingly
        if (filters.stops === 'Non-stop') {
          // All flights are non-stop, so this passes
        } else if (filters.stops === '1 Stop') {
          // If we had stop information, we'd filter here
          // For now, since all flights are non-stop, this would filter out all
          return false;
        } else if (filters.stops === '2+ Stops') {
          // If we had stop information, we'd filter here
          // For now, since all flights are non-stop, this would filter out all
          return false;
        }
      }

      // Vehicle type filter (cars)
      if (type === 'cars' && filters.vehicleType && item.car_type) {
        const filterType = filters.vehicleType.toLowerCase();
        const carType = item.car_type.toLowerCase();
        if (carType !== filterType) {
          return false;
        }
      }

      // Seats filter (cars)
      if (type === 'cars' && filters.seats) {
        const filterSeats = filters.seats;
        const carSeats = item.num_seats;

        if (filterSeats === '7+') {
          if (carSeats < 7) return false;
        } else {
          const seatsNum = parseInt(filterSeats);
          if (carSeats !== seatsNum) return false;
        }
      }

      // Departure time windows (flights)
      if (type === 'flights' && (filters.timeWindows || []).length > 0) {
        // Helper to pick the relevant departure time string
        const pickDepartureTime = (flight) => {
          if (flight.is_multicity || flight.legs) {
            return flight.legs?.[0]?.departure_time || flight.departure_time;
          } else if (flight.is_roundtrip || flight.return_flight) {
            return flight.departure_time;
          }
          return flight.departure_time;
        };
        const depStr = pickDepartureTime(item);
        if (!depStr) return false;
        const isoLike = depStr.includes('T') ? depStr : depStr.replace(' ', 'T');
        const depDate = new Date(isoLike);
        if (isNaN(depDate.getTime())) return false;
        const hour = depDate.getHours();
        const inMorning = hour >= 5 && hour < 12;
        const inAfternoon = hour >= 12 && hour < 17;
        const inEvening = hour >= 17 && hour < 22;
        const windows = filters.timeWindows || [];
        const matches =
          (windows.includes('morning') && inMorning) ||
          (windows.includes('afternoon') && inAfternoon) ||
          (windows.includes('evening') && inEvening);
        if (!matches) return false;
      }

      return true;
    });

    console.log('🔍 After filtering:', {
      filteredCount: filtered.length,
      removedByFilters: results.length - filtered.length
    });

    // Apply sorting
    const currentSortBy = sortBy || 'price_asc';
    console.log('🔍 Applying sort:', currentSortBy, 'to', filtered.length, 'items');

    // Helper: robust date parsing for 'YYYY-MM-DD HH:mm:ss' (Safari-safe)
    const toSafeDate = (value) => {
      if (!value) return null;
      const str = typeof value === 'string' ? value : String(value);
      const isoLike = str.includes('T') ? str : str.replace(' ', 'T');
      const d = new Date(isoLike);
      return isNaN(d.getTime()) ? null : d;
    };

    filtered.sort((a, b) => {
      switch (currentSortBy) {
        case 'price_asc':
          if (type === 'flights') {
            // Handle multi-city, roundtrip, and one-way flights
            let priceA = 0;
            if (a.is_multicity || a.legs) {
              // Multi-city: use total_price
              priceA = parseFloat(a.total_price || 0);
            } else if (a.is_roundtrip || a.return_flight) {
              // Roundtrip: use total_price
              priceA = parseFloat(a.total_price || (parseFloat(a.price || 0) + parseFloat(a.return_flight?.price || 0)));
            } else {
              // One-way: use price
              priceA = parseFloat(a.price || 0);
            }

            let priceB = 0;
            if (b.is_multicity || b.legs) {
              // Multi-city: use total_price
              priceB = parseFloat(b.total_price || 0);
            } else if (b.is_roundtrip || b.return_flight) {
              // Roundtrip: use total_price
              priceB = parseFloat(b.total_price || (parseFloat(b.price || 0) + parseFloat(b.return_flight?.price || 0)));
            } else {
              // One-way: use price
              priceB = parseFloat(b.price || 0);
            }

            return priceA - priceB;
          } else if (type === 'hotels') {
            return (parseFloat(a.price_per_night || 0)) - (parseFloat(b.price_per_night || 0));
          } else if (type === 'cars') {
            const priceA = parseFloat(a.total_price || a.daily_rental_price || 0);
            const priceB = parseFloat(b.total_price || b.daily_rental_price || 0);
            return priceA - priceB;
          } else {
            return (parseFloat(a.price_per_day || 0)) - (parseFloat(b.price_per_day || 0));
          }
        case 'price_desc':
          if (type === 'flights') {
            // Handle multi-city, roundtrip, and one-way flights
            let priceA = 0;
            if (a.is_multicity || a.legs) {
              // Multi-city: use total_price
              priceA = parseFloat(a.total_price || 0);
            } else if (a.is_roundtrip || a.return_flight) {
              // Roundtrip: use total_price
              priceA = parseFloat(a.total_price || (parseFloat(a.price || 0) + parseFloat(a.return_flight?.price || 0)));
            } else {
              // One-way: use price
              priceA = parseFloat(a.price || 0);
            }

            let priceB = 0;
            if (b.is_multicity || b.legs) {
              // Multi-city: use total_price
              priceB = parseFloat(b.total_price || 0);
            } else if (b.is_roundtrip || b.return_flight) {
              // Roundtrip: use total_price
              priceB = parseFloat(b.total_price || (parseFloat(b.price || 0) + parseFloat(b.return_flight?.price || 0)));
            } else {
              // One-way: use price
              priceB = parseFloat(b.price || 0);
            }

            return priceB - priceA;
          } else if (type === 'hotels') {
            return (parseFloat(b.price_per_night || 0)) - (parseFloat(a.price_per_night || 0));
          } else if (type === 'cars') {
            const priceA = parseFloat(a.total_price || a.daily_rental_price || 0);
            const priceB = parseFloat(b.total_price || b.daily_rental_price || 0);
            return priceB - priceA;
          } else {
            return (parseFloat(b.price_per_day || 0)) - (parseFloat(a.price_per_day || 0));
          }
        case 'rating_desc':
          if (type === 'cars') {
            return parseFloat(b.average_rating || 0) - parseFloat(a.average_rating || 0);
          } else {
            return (b.rating || 0) - (a.rating || 0);
          }
        case 'duration_asc':
          if (type === 'flights') {
            // Helper function to calculate duration from times
            const calculateDurationFromTimes = (departure, arrival) => {
              if (!departure || !arrival) return 0;
              const dep = toSafeDate(departure);
              const arr = toSafeDate(arrival);
              if (!dep || !arr) return 0;
              return (arr - dep) / (1000 * 60 * 60); // Convert to hours
            };

            // Calculate duration for multi-city, roundtrip, and one-way flights
            let durationA = 0;
            if (a.is_multicity || a.legs) {
              // Multi-city: sum of all leg durations (calculate from times if duration not available)
              durationA = (a.legs || []).reduce((sum, leg) => {
                const legDuration = parseFloat(leg.duration) || calculateDurationFromTimes(leg.departure_time, leg.arrival_time);
                return sum + legDuration;
              }, 0);
            } else if (a.is_roundtrip || a.return_flight) {
              // Roundtrip: sum of outbound and return durations
              const outboundDuration = parseFloat(a.duration) || calculateDurationFromTimes(a.departure_time, a.arrival_time);
              const returnDuration = parseFloat(a.return_flight?.duration) || calculateDurationFromTimes(a.return_flight?.departure_time, a.return_flight?.arrival_time);
              durationA = outboundDuration + returnDuration;
            } else {
              // One-way: use duration or calculate from times
              durationA = parseFloat(a.duration) || calculateDurationFromTimes(a.departure_time, a.arrival_time);
            }

            let durationB = 0;
            if (b.is_multicity || b.legs) {
              // Multi-city: sum of all leg durations (calculate from times if duration not available)
              durationB = (b.legs || []).reduce((sum, leg) => {
                const legDuration = parseFloat(leg.duration) || calculateDurationFromTimes(leg.departure_time, leg.arrival_time);
                return sum + legDuration;
              }, 0);
            } else if (b.is_roundtrip || b.return_flight) {
              // Roundtrip: sum of outbound and return durations
              const outboundDuration = parseFloat(b.duration) || calculateDurationFromTimes(b.departure_time, b.arrival_time);
              const returnDuration = parseFloat(b.return_flight?.duration) || calculateDurationFromTimes(b.return_flight?.departure_time, b.return_flight?.arrival_time);
              durationB = outboundDuration + returnDuration;
            } else {
              // One-way: use duration or calculate from times
              durationB = parseFloat(b.duration) || calculateDurationFromTimes(b.departure_time, b.arrival_time);
            }

            return durationA - durationB;
          } else {
            return (a.duration || 0) - (b.duration || 0);
          }
        case 'departure_asc':
          if (type === 'flights') {
            // Sort by earliest departure time
            // For multi-city, use first leg's departure time
            // For roundtrip, use outbound departure time
            // For one-way, use departure time
            const getDepartureTime = (flight) => {
              if (flight.is_multicity || flight.legs) {
                // Multi-city: use first leg's departure time
                return flight.legs?.[0]?.departure_time || flight.departure_time;
              } else if (flight.is_roundtrip || flight.return_flight) {
                // Roundtrip: use outbound departure time
                return flight.departure_time;
              } else {
                // One-way: use departure time
                return flight.departure_time;
              }
            };

            const da = toSafeDate(getDepartureTime(a));
            const db = toSafeDate(getDepartureTime(b));
            const timeA = da ? da.getTime() : 0;
            const timeB = db ? db.getTime() : 0;
            return timeA - timeB;
          } else {
            return 0;
          }
        default:
          return 0;
      }
    });

    console.log('🔍 After filtering and sorting:', {
      filteredCount: filtered.length,
      sortBy: sortBy,
      removedByFilters: results.length - filtered.length
    });
    setFilteredResults(filtered);
  }, [results, filters, sortBy, type]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSortChange = (sort) => {
    console.log('🔍 Sort changed to:', sort);
    setSortBy(sort);
  };

  const handleBook = async (itemId, explicitLegs = null) => {
    try {
      console.log('handleBook called with:', { itemId, explicitLegs, type });

      // Track property click
      if (type === 'flights') {
        const flight = itemId;
        trackPropertyClick(flight.id, flight.airline || 'Unknown', 'flight');
      } else if (type === 'hotels') {
        const hotel = results.find(h => h.id === itemId);
        if (hotel) {
          trackPropertyClick(hotel.id, hotel.name || 'Unknown Hotel', 'hotel');
        }
      } else if (type === 'cars') {
        const car = results.find(c => c.id === itemId);
        if (car) {
          trackPropertyClick(car.id, car.model || 'Unknown Car', 'car');
        }
      }

      // Handle car bookings differently
      if (type === 'cars') {
        const pickupLocation = searchParams.get('pickupLocation') || '';
        const dropoffLocation = searchParams.get('dropoffLocation') || '';
        const pickupDate = searchParams.get('pickupDate') || '';
        const dropoffDate = searchParams.get('dropoffDate') || '';
        const pickupTime = searchParams.get('pickupTime') || '10:00';
        const dropoffTime = searchParams.get('dropoffTime') || '10:00';

        const carParams = `pickupLocation=${pickupLocation}&dropoffLocation=${dropoffLocation}&pickupDate=${pickupDate}&dropoffDate=${dropoffDate}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}`;
        navigate(`/booking/cars/${itemId}?${carParams}`);
        return;
      }

      // Handle flight bookings
      const flight = itemId;
      // Extract passenger info from search params
      const passengers = searchParams.get('passengers') || '1';
      const adults = searchParams.get('adults') || passengers;
      const children = searchParams.get('children') || '0';
      const infants = searchParams.get('infants') || '0';
      const tripType = searchParams.get('tripType') || searchParams.get('type') || 'oneway';

      // Build passenger query string
      const passengerParams = `passengers=${passengers}&adults=${adults}&children=${children}&infants=${infants}&tripType=${tripType}`;

      // For roundtrip flights, create a hold with both legs
      if (flight.is_roundtrip || flight.return_flight || tripType === 'roundtrip') {
        const holdData = {
          flight_id: flight.id,
          return_flight_id: flight.return_flight?.id,
          passengers: parseInt(passengers),
          trip_type: 'roundtrip'
        };

        const response = await bookingsAPI.hold(holdData);

        if (response.data && response.data.booking_reference) {
          // Navigate to booking page with flight ID and pass booking reference via state
          navigate(`/booking/flights/${flight.id}?${passengerParams}`, {
            state: {
              bookingReference: response.data.booking_reference,
              holdExpiry: response.data.expires_at,
              isRoundtrip: true,
              returnFlight: flight.return_flight
            }
          });
        } else {
          // Fallback to booking page
          navigate(`/booking/flights/${flight.id}?${passengerParams}`, {
            state: {
              isRoundtrip: true,
              returnFlight: flight.return_flight
            }
          });
        }
      }
      // For multi-city flights
      else if (tripType === 'multicity' || flight.is_multicity || (flight.legs && flight.legs.length > 0) || (explicitLegs && explicitLegs.length > 0)) {
        const legsToPass = explicitLegs || flight.legs || [flight];
        // Use the ID of the first leg if the top-level flight object doesn't have an ID
        const flightId = flight.id || (legsToPass.length > 0 ? legsToPass[0].id : null);

        console.log('Navigating to multi-city booking:', { flightId, legsCount: legsToPass.length });

        navigate(`/booking/flights/${flightId}?${passengerParams}`, {
          state: {
            isMultiCity: true,
            legs: legsToPass
          }
        });
      }
      else {
        // For one-way, navigate to booking page
        navigate(`/booking/flights/${flight.id || flight}?${passengerParams}`);
      }
    } catch (error) {
      console.error('Error creating hold:', error);
      // Fallback to booking page with passenger params
      const passengers = searchParams.get('passengers') || '1';
      const adults = searchParams.get('adults') || passengers;
      const children = searchParams.get('children') || '0';
      const infants = searchParams.get('infants') || '0';
      const passengerParams = `passengers=${passengers}&adults=${adults}&children=${children}&infants=${infants}`;
      const flightId = itemId?.id || itemId;
      if (flightId) {
        navigate(`/booking/flights/${flightId}?${passengerParams}`);
      }
    }
  };

  const handleViewDetails = async (flight) => {
    // Use slide-over for both roundtrip and one-way for consistent UX
    setSelectedFlight(flight);
    setShowDetailsSlideOver(true);
  };

  const handleDateAdjust = (field, value) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(field, value);
    navigate(`/search?${newParams.toString()}`);
  };

  // Helper function to format time
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Helper function to format date
  const formatDate = (timeStr) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper function to calculate duration
  const calculateDuration = (departure, arrival) => {
    if (!departure || !arrival) return 'N/A';
    const dep = new Date(departure);
    const arr = new Date(arrival);
    const diffMs = arr - dep;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMins}m`;
  };

  const renderFlightCard = (flight) => {
    // Handle multi-city flights
    const isMultiCity = flight.is_multicity || flight.legs;
    const isRoundtrip = flight.is_roundtrip || flight.return_flight;
    const returnFlight = flight.return_flight;

    // Calculate display price and ensure it's always a number
    let displayPrice;
    if (isMultiCity) {
      displayPrice = flight.total_price || 0;
    } else if (isRoundtrip) {
      displayPrice = flight.total_price || (parseFloat(flight.price || 0) + parseFloat(returnFlight?.price || 0));
    } else {
      displayPrice = flight.price || 0;
    }
    // Ensure displayPrice is always a number
    displayPrice = parseFloat(displayPrice) || 0;

    // Generate unique key
    const flightKey = isMultiCity
      ? `multicity-${flight.legs?.map((leg, i) => leg.id || i).join('-')}`
      : (isRoundtrip && returnFlight
        ? `${flight.id || `outbound-${flight.flight_number || 'unknown'}`}-${returnFlight.id || `return-${returnFlight.flight_number || 'unknown'}`}`
        : (flight.id || `flight-${flight.flight_number || 'unknown'}`));

    // Multi-city: render with roundtrip look/feel and one row per leg
    if (isMultiCity && Array.isArray(flight.legs) && flight.legs.length > 0) {
      const legs = flight.legs;
      const minSeats = legs.reduce((min, leg) => {
        const seats = parseInt(leg.available_seats || 0);
        return Math.min(min, Number.isFinite(seats) ? seats : 0);
      }, Number.POSITIVE_INFINITY);
      return (
        <div key={flightKey} className="result-card flight-card roundtrip-card">
          <div className="roundtrip-card-content">
            <div className="roundtrip-legs">
              {legs.map((leg, idx) => (
                <div key={leg.id || idx} className="roundtrip-leg-row">
                  <div className="leg-label">Leg {idx + 1}</div>
                  <div className="leg-details">
                    <div className="leg-airline">{leg.airline} {leg.flight_number}</div>
                    <div className="leg-route">{leg.departure_city} → {leg.arrival_city}</div>
                    <div className="leg-time">
                      {formatTime(leg.departure_time)} - {formatTime(leg.arrival_time)}
                      <span className="leg-date"> {formatDate(leg.departure_time)}</span>
                    </div>
                    <div className="leg-meta">
                      <span className="leg-duration">{calculateDuration(leg.departure_time, leg.arrival_time)}</span>
                      <span className="leg-stops">Non-stop</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Right Side: Price, Cabin, Seats */}
            <div className="roundtrip-card-right">
              <div className="roundtrip-price-section">
                <div className="roundtrip-price">${displayPrice.toFixed(2)}</div>
                <div className="roundtrip-price-label">multi-city</div>
              </div>
              <div className="roundtrip-cabin">Economy</div>
              {(flight.checked_bag_fee === 0 || flight.checked_bag_fee === "0.00") && (
                <div className="roundtrip-baggage" style={{ fontSize: '0.8rem', color: '#2c3e50', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaSuitcase size={12} /> Bag included
                </div>
              )}
              <div className="roundtrip-seats">
                {Number.isFinite(minSeats) ? `${minSeats} seats left` : `${legs[0]?.available_seats || 0} seats left`}
              </div>
              <div className="roundtrip-actions">
                <button
                  className="details-btn"
                  onClick={() => handleViewDetails({ ...flight, legs })}
                  aria-label="View flight details"
                >
                  View Details
                </button>
                <button
                  className="book-btn"
                  onClick={() => handleBook(legs[0] || { ...flight, id: legs[0]?.id }, legs)}
                  aria-label="Book this flight now"
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // For roundtrip flights, render improved card with Outbound and Return rows
    if (isRoundtrip && returnFlight && !isMultiCity) {
      return (
        <div key={flightKey} className="result-card flight-card roundtrip-card">
          <div className="roundtrip-card-content">
            <div className="roundtrip-legs">
              {/* Outbound Row */}
              <div className="roundtrip-leg-row">
                <div className="leg-label">Outbound</div>
                <div className="leg-details">
                  <div className="leg-airline">{flight.airline} {flight.flight_number}</div>
                  <div className="leg-route">{flight.departure_city} → {flight.arrival_city}</div>
                  <div className="leg-time">
                    {formatTime(flight.departure_time)} - {formatTime(flight.arrival_time)}
                    <span className="leg-date"> {formatDate(flight.departure_time)}</span>
                  </div>
                  <div className="leg-meta">
                    <span className="leg-duration">{calculateDuration(flight.departure_time, flight.arrival_time)}</span>
                    <span className="leg-stops">Non-stop</span>
                  </div>
                </div>
              </div>

              {/* Return Row */}
              <div className="roundtrip-leg-row">
                <div className="leg-label">Return</div>
                <div className="leg-details">
                  <div className="leg-airline">{returnFlight.airline} {returnFlight.flight_number}</div>
                  <div className="leg-route">{returnFlight.departure_city} → {returnFlight.arrival_city}</div>
                  <div className="leg-time">
                    {formatTime(returnFlight.departure_time)} - {formatTime(returnFlight.arrival_time)}
                    <span className="leg-date"> {formatDate(returnFlight.departure_time)}</span>
                  </div>
                  <div className="leg-meta">
                    <span className="leg-duration">{calculateDuration(returnFlight.departure_time, returnFlight.arrival_time)}</span>
                    <span className="leg-stops">Non-stop</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Price, Cabin, Seats */}
            <div className="roundtrip-card-right">
              <div className="roundtrip-price-section">
                <div className="roundtrip-price">${displayPrice.toFixed(2)}</div>
                <div className="roundtrip-price-label">roundtrip</div>
              </div>
              <div className="roundtrip-cabin">Economy</div>
              {(flight.checked_bag_fee === 0 || flight.checked_bag_fee === "0.00") && (
                <div className="roundtrip-baggage" style={{ fontSize: '0.8rem', color: '#2c3e50', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaSuitcase size={12} /> Bag included
                </div>
              )}
              <div className="roundtrip-seats">
                {Math.min(flight.available_seats || 0, returnFlight?.available_seats || 0)} seats left
              </div>
              <div className="roundtrip-actions">
                <button
                  className="details-btn"
                  onClick={() => handleViewDetails(flight)}
                  aria-label="View flight details"
                >
                  View Details
                </button>
                <button
                  className="book-btn"
                  onClick={() => handleBook(flight)}
                  aria-label="Book this flight now"
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // For one-way and multi-city, use appropriate card formats
    // Build route display
    let routeDisplay = '';
    if (isMultiCity && flight.legs) {
      routeDisplay = flight.legs.map((leg, i) =>
        `${leg.departure_city}${i < flight.legs.length - 1 ? ' → ' : ''}`
      ).join('') + flight.legs[flight.legs.length - 1].arrival_city;
    } else {
      routeDisplay = `${flight.departure_city} → ${flight.arrival_city}`;
    }

    // Build airline/flight number display
    let airlineDisplay = '';
    if (isMultiCity && flight.legs && flight.legs.length > 0) {
      airlineDisplay = flight.legs.map(leg => `${leg.airline} ${leg.flight_number}`).join(' / ');
    } else {
      airlineDisplay = `${flight.airline} ${flight.flight_number}`;
    }

    // Build time display
    let timeDisplay = '';
    if (isMultiCity && flight.legs) {
      timeDisplay = flight.legs.map((leg, i) =>
        `Leg ${i + 1}: ${leg.departure_time?.slice(0, 5)} - ${leg.arrival_time?.slice(0, 5)}`
      ).join(' | ');
    } else {
      timeDisplay = `${flight.departure_time?.slice(0, 5)} - ${flight.arrival_time?.slice(0, 5)}`;
    }

    // One-way: render with same look/feel as roundtrip card
    if (!isMultiCity && !isRoundtrip) {
      return (
        <div key={flightKey} className="result-card flight-card roundtrip-card">
          <div className="roundtrip-card-content">
            <div className="roundtrip-legs">
              {/* Outbound Row (single leg) */}
              <div className="roundtrip-leg-row">
                <div className="leg-label">Flight</div>
                <div className="leg-details">
                  <div className="leg-airline">{flight.airline} {flight.flight_number}</div>
                  <div className="leg-route">{flight.departure_city} → {flight.arrival_city}</div>
                  <div className="leg-time">
                    {formatTime(flight.departure_time)} - {formatTime(flight.arrival_time)}
                    <span className="leg-date"> {formatDate(flight.departure_time)}</span>
                  </div>
                  <div className="leg-meta">
                    <span className="leg-duration">{calculateDuration(flight.departure_time, flight.arrival_time)}</span>
                    <span className="leg-stops">Non-stop</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Right Side: Price, Cabin, Seats */}
            <div className="roundtrip-card-right">
              <div className="roundtrip-price-section">
                <div className="roundtrip-price">${displayPrice.toFixed(2)}</div>
                <div className="roundtrip-price-label">one-way</div>
              </div>
              <div className="roundtrip-cabin">Economy</div>
              {(flight.checked_bag_fee === 0 || flight.checked_bag_fee === "0.00") && (
                <div className="roundtrip-baggage" style={{ fontSize: '0.8rem', color: '#2c3e50', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaSuitcase size={12} /> Bag included
                </div>
              )}
              <div className="roundtrip-seats">
                {(flight.available_seats || 0)} seats left
              </div>
              <div className="roundtrip-actions">
                <button
                  className="details-btn"
                  onClick={() => handleViewDetails(flight)}
                  aria-label="View flight details"
                >
                  View Details
                </button>
                <button
                  className="book-btn"
                  onClick={() => handleBook(flight)}
                  aria-label="Book this flight now"
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={flightKey} className="result-card flight-card">
        <div className="card-header">
          <div className="card-icon"><FaPlane /></div>
          <div className="card-title-section">
            <h3>{airlineDisplay}</h3>
            <p className="card-subtitle">
              {routeDisplay}
            </p>
          </div>
        </div>
        <div className="card-body">
          <div className="card-info-row">
            <div className="info-item">
              <FaClock className="info-icon" />
              <span>{timeDisplay}</span>
            </div>
            <div className="info-item">
              <FaUsers className="info-icon" />
              <span>
                {isMultiCity && flight.legs
                  ? `${flight.legs[0]?.available_seats || 'N/A'} seats`
                  : `${flight.available_seats} seats`
                }
              </span>
            </div>
          </div>
          {isMultiCity && (
            <div className="card-info-row">
              <span className="duration-badge">Multi-city ({flight.leg_count || flight.legs?.length || 0} legs)</span>
            </div>
          )}
          {flight.duration && !isMultiCity && (
            <div className="card-info-row">
              <span className="duration-badge">Duration: {flight.duration}h</span>
            </div>
          )}
        </div>
        <div className="card-footer">
          <div className="price-section">
            <span className="price">${displayPrice.toFixed(2)}</span>
            <span className="price-label">
              {isMultiCity ? 'total' : 'per person'}
            </span>
          </div>
          <div className="card-actions">
            <button
              className="details-btn"
              onClick={() => handleViewDetails(isMultiCity ? flight.legs?.[0] : flight)}
              aria-label="View flight details"
            >
              View Details
            </button>
            <button
              className="book-btn"
              onClick={() => handleBook(isMultiCity ? flight.legs?.[0] : flight, isMultiCity ? flight.legs : null)}
              aria-label="Select this flight"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHotelCard = (hotel) => (
    <div key={hotel.id} className="result-card hotel-card">
      {hotel.image && (
        <div className="card-image">
          <img src={hotel.image} alt={hotel.name} />
        </div>
      )}
      <div className="card-content">
        <div className="card-header">
          <div className="card-title-section">
            <h3>{hotel.name}</h3>
            <p className="card-subtitle">
              <FaMapMarkerAlt className="location-icon" />
              {hotel.location}
            </p>
          </div>
          {hotel.rating && (
            <div className="rating-badge">
              <FaStar className="star-icon" />
              <span>{hotel.rating}</span>
            </div>
          )}
        </div>
        <div className="card-body">
          {hotel.amenities && hotel.amenities.length > 0 && (
            <div className="amenities-list">
              {hotel.amenities.slice(0, 3).map((amenity, idx) => (
                <span key={idx} className="amenity-tag">{amenity}</span>
              ))}
            </div>
          )}
          {hotel.available_rooms && (
            <p className="availability">{hotel.available_rooms} rooms available</p>
          )}
        </div>
        <div className="card-footer">
          <div className="price-section">
            <span className="price">${hotel.price_per_night}</span>
            <span className="price-label">/night</span>
          </div>
          <button className="book-btn" onClick={() => handleBook(hotel.id)}>
            Book Now
          </button>
        </div>
      </div>
    </div>
  );

  const renderCarCard = (car) => (
    <div key={car.id} className="result-card car-card">
      {/* Car Image */}
      {car.image_url && (
        <div className="car-image-container">
          <img
            src={car.image_url}
            alt={car.model}
            className="car-image"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          {car.car_type && (
            <span className="car-type-badge">{car.car_type}</span>
          )}
        </div>
      )}

      {/* Car Details */}
      <div className="car-card-content">
        <div className="card-header">
          <div className="card-title-section">
            <h3>{car.model}</h3>
            <p className="card-subtitle">{car.company} • {car.year}</p>
          </div>
        </div>

        <div className="card-body">
          <div className="card-info-row">
            <div className="info-item">
              <FaMapMarkerAlt className="info-icon" />
              <span>{car.location_city}{car.airport_code ? ` (${car.airport_code})` : ''}</span>
            </div>
            <div className="info-item">
              <FaUsers className="info-icon" />
              <span>{car.num_seats} seats</span>
            </div>
          </div>

          <div className="card-info-row">
            <div className="info-item">
              <FaSuitcase className="info-icon" />
              <span>{car.transmission}</span>
            </div>
            {car.average_rating && parseFloat(car.average_rating) > 0 && (
              <div className="info-item rating-item">
                <FaStar className="info-icon star-icon" />
                <span>{parseFloat(car.average_rating).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="card-footer">
          <div className="price-section">
            {car.rental_days && car.rental_days > 1 ? (
              <>
                <span className="price">${parseFloat(car.total_price).toFixed(2)}</span>
                <span className="price-label">for {car.rental_days} days</span>
              </>
            ) : (
              <>
                <span className="price">${car.daily_rental_price}</span>
                <span className="price-label">/day</span>
              </>
            )}
          </div>
          <button className="book-btn" onClick={() => handleBook(car.id)}>
            Reserve
          </button>
        </div>
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <div className="results-grid" role="status" aria-label="Loading flight results">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="result-card skeleton-card">
          <Skeleton height={24} width="40%" style={{ marginBottom: 15 }} />
          <Skeleton height={16} width="60%" style={{ marginBottom: 20 }} />
          <Skeleton height={80} style={{ marginBottom: 15 }} />
          <Skeleton height={80} style={{ marginBottom: 20 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton height={32} width="120px" />
            <div style={{ display: 'flex', gap: '10px' }}>
              <Skeleton height={36} width="100px" />
              <Skeleton height={36} width="100px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="results-page">
      <div className="results-container">
        <div className="results-header">
          <h2>
            {type === 'flights' && <FaPlane className="header-icon" />}
            {type === 'hotels' && <FaHotel className="header-icon" />}
            {type === 'cars' && <FaCar className="header-icon" />}
            {type.charAt(0).toUpperCase() + type.slice(1)} Search Results
          </h2>
          {(origin && destination) || tripType === 'multicity' ? (
            <p className="search-route">
              {tripType === 'multicity' ? (
                (() => {
                  const legs = [];
                  let legIndex = 1;
                  while (searchParams.get(`leg${legIndex}_from`)) {
                    legs.push({
                      from: searchParams.get(`leg${legIndex}_from`),
                      to: searchParams.get(`leg${legIndex}_to`),
                      date: searchParams.get(`leg${legIndex}_date`)
                    });
                    legIndex++;
                  }
                  return legs.length > 0
                    ? legs.map((leg, i) => `${leg.from} → ${leg.to}`).join(' → ')
                    : 'Multi-city';
                })()
              ) : (
                <>
                  {origin} → {destination}
                  {returnDate && ` (Roundtrip)`}
                </>
              )}
            </p>
          ) : null}
          <p className="results-count">{filteredResults.length} results found</p>
        </div>

        <div className="results-content">
          <div className="filters-section">
            <FiltersSidebar
              type={type}
              filters={filters}
              onFilterChange={handleFilterChange}
              onSortChange={handleSortChange}
              sortBy={sortBy}
            />
          </div>

          <div className="results-section">
            {loading ? (
              renderSkeleton()
            ) : error ? (
              <div className="error-state">
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="retry-btn">
                  Retry
                </button>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="empty-state">
                <p>No results found. Try adjusting your filters or dates.</p>
                <div className="empty-state-actions">
                  {results.length > 0 && (
                    <button
                      onClick={() => setFilters({
                        minPrice: 0, maxPrice: 10000, rating: 0, amenities: [], airline: '', stops: '', vehicleType: '', seats: '', timeWindows: []
                      })}
                      className="clear-filters-link"
                      aria-label="Clear all filters"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    onClick={() => {
                      // Try flexible dates - adjust by +1 day safely
                      const newParams = new URLSearchParams(searchParams);
                      const departDate = newParams.get('departure_date');

                      if (departDate) {
                        // Append time to force local parsing or avoid UTC shift issues
                        const current = new Date(departDate + 'T12:00:00');
                        current.setDate(current.getDate() + 1);

                        const year = current.getFullYear();
                        const month = String(current.getMonth() + 1).padStart(2, '0');
                        const day = String(current.getDate()).padStart(2, '0');
                        const nextDateStr = `${year}-${month}-${day}`;

                        newParams.set('departure_date', nextDateStr);

                        if (newParams.get('return_date')) {
                          const returnDate = new Date(newParams.get('return_date') + 'T12:00:00');
                          returnDate.setDate(returnDate.getDate() + 1);

                          const rYear = returnDate.getFullYear();
                          const rMonth = String(returnDate.getMonth() + 1).padStart(2, '0');
                          const rDay = String(returnDate.getDate()).padStart(2, '0');
                          newParams.set('return_date', `${rYear}-${rMonth}-${rDay}`);
                        }
                        navigate(`/search?${newParams.toString()}`);
                      }
                    }}
                    className="flexible-dates-link"
                    aria-label="Try flexible dates"
                  >
                    Try Flexible Dates (+1 Day)
                  </button>
                </div>
              </div>
            ) : (
              <>
                {missingLeg && (
                  <MissingLegBanner
                    missingLeg={missingLeg}
                    onDateAdjust={handleDateAdjust}
                    departureDate={searchParams.get('departure_date')}
                    returnDate={searchParams.get('return_date')}
                  />
                )}

                {type === 'flights' && results.length > 0 && (
                  <PriceMatrix
                    results={results}
                    selectedAirline={filters.airline}
                    onSelectAirline={(airline) => handleFilterChange({ airline })}
                  />
                )}

                <div className="results-grid">
                  {safeFilteredResults.map(item =>
                    type === 'flights' ? renderFlightCard(item) :
                      type === 'hotels' ? renderHotelCard(item) :
                        renderCarCard(item)
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div >

      {/* Flight Details Slide-Over */}
      < FlightDetailsSlideOver
        flight={selectedFlight}
        isOpen={showDetailsSlideOver}
        onClose={() => {
          setShowDetailsSlideOver(false);
          setSelectedFlight(null);
        }
        }
      />
    </div >
  );
}

export default SearchResultsPage;
