import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaHotel, FaUser, FaCalendarAlt, FaSearch, FaStar, FaMapMarkerAlt, FaChevronDown, FaHeart, FaRegHeart, FaTh, FaList, FaFilter } from 'react-icons/fa';
import HotelLocationAutocomplete from '../components/HotelLocationAutocomplete';
import { hotelsAPI } from '../services/api';
import './HotelSearchPage.css';

// Hotel image mapping
const getHotelImage = (hotelName) => {
  const imageMap = {
    'Nob Hill Grand Hotel': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    'Golden Gate Suites': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
    'Hilton SF': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
    'Pacific Haven Hotel': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
    'Skyline Suites': 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    'Chicago Loop Hotel': 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    'Magnificent Mile Plaza': 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&w=800&q=80',
    'Ocean View Paradise': 'https://images.unsplash.com/photo-1559599589-f9db9d348a97?auto=format&fit=crop&w=800&q=80',
    'South Beach Luxury Resort': 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80',
    'Miami Downtown Hotel': 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
    'Manhattan Grand Hotel': 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=800&q=80',
    'Times Square Plaza': 'https://images.unsplash.com/photo-1529290130-4ca3753253ae?auto=format&fit=crop&w=800&q=80',
    'Brooklyn Bridge Inn': 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80',
    'Hollywood Glamour Hotel': 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80',
    'Santa Monica Beach Resort': 'https://images.unsplash.com/photo-1561501878-aabd62634533?auto=format&fit=crop&w=800&q=80',
    'Beverly Hills Grand': 'https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&w=800&q=80',
    'Vegas Strip Resort': 'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?auto=format&fit=crop&w=800&q=80',
    'Luxor Grand Hotel': 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=800&q=80',
    'Boston Harbor Hotel': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80',
    'Beacon Hill Inn': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    'Disney Resort Hotel': 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
    'Universal Studios Hotel': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
    'Gaslamp Quarter Hotel': 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
    'La Jolla Cove Resort': 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=800&q=80',
    'Emerald Bay Resort': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    'Seattle Waterfront Inn': 'https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=800&q=80',
    'Pike Place Hotel': 'https://images.unsplash.com/photo-1517840901100-8179e982acb7?auto=format&fit=crop&w=800&q=80'
  };

  return imageMap[hotelName] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
};

const HotelSearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [savedHotels, setSavedHotels] = useState(new Set());
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(true);

  // Search parameters
  const [searchCriteria, setSearchCriteria] = useState({
    location: searchParams.get('location') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    rooms: parseInt(searchParams.get('rooms')) || 1,
    adults: parseInt(searchParams.get('adults')) || 2,
    children: parseInt(searchParams.get('children')) || 0
  });

  // Filter states
  const [filters, setFilters] = useState({
    priceRange: [0, 500],
    starRating: [],
    amenities: [],
    freebies: [],
    propertyType: [],
    neighborhood: [],
    reviewScore: []
  });

  useEffect(() => {
    // Update search criteria from URL params
    setSearchCriteria({
      location: searchParams.get('location') || '',
      checkIn: searchParams.get('checkIn') || '',
      checkOut: searchParams.get('checkOut') || '',
      rooms: parseInt(searchParams.get('rooms')) || 1,
      adults: parseInt(searchParams.get('adults')) || 2,
      children: parseInt(searchParams.get('children')) || 0
    });
    fetchHotels();
  }, [searchParams]);

  const handleSearch = () => {
    if (!searchCriteria.location || !searchCriteria.checkIn || !searchCriteria.checkOut) {
      alert('Please fill in all search fields');
      return;
    }

    const params = new URLSearchParams({
      location: searchCriteria.location,
      checkIn: searchCriteria.checkIn,
      checkOut: searchCriteria.checkOut,
      rooms: searchCriteria.rooms,
      adults: searchCriteria.adults,
      children: searchCriteria.children
    });

    navigate(`/hotels?${params.toString()}`);
  };

  const fetchHotels = async () => {
    setLoading(true);
    setError(null);

    // Get fresh values from URL params
    const location = searchParams.get('location') || '';
    const checkIn = searchParams.get('checkIn') || '';
    const checkOut = searchParams.get('checkOut') || '';
    const adults = parseInt(searchParams.get('adults')) || 2;
    const children = parseInt(searchParams.get('children')) || 0;

    try {
      const response = await hotelsAPI.search({
        location,
        checkIn,
        checkOut,
        guests: adults + children
      });

      const data = response.data;
      console.log('Hotels fetched:', data);
      setHotels(data.data || []);
    } catch (err) {
      console.error('Error fetching hotels:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveHotel = (hotelId) => {
    setSavedHotels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hotelId)) {
        newSet.delete(hotelId);
      } else {
        newSet.add(hotelId);
      }
      return newSet;
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const calculateNights = () => {
    if (!searchCriteria.checkIn || !searchCriteria.checkOut) return 1;
    const start = new Date(searchCriteria.checkIn);
    const end = new Date(searchCriteria.checkOut);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, nights);
  };

  const filteredAndSortedHotels = () => {
    let result = [...hotels];

    // Apply filters
    result = result.filter(hotel => {
      const pricePerNight = Number(hotel.price_per_night) || 100;
      const hotelAmenities = Array.isArray(hotel.amenities) ? hotel.amenities :
        (typeof hotel.amenities === 'string' ? JSON.parse(hotel.amenities) : []);

      // Price filter
      if (pricePerNight < filters.priceRange[0] || pricePerNight > filters.priceRange[1]) {
        return false;
      }

      // Star rating filter (handle both integer and decimal ratings)
      if (filters.starRating.length > 0) {
        const hotelStarRating = Number(hotel.star_rating);
        const matchesRating = filters.starRating.some(filterRating => {
          // Match if hotel rating rounds to the filter rating
          // e.g., 4.5 matches when 4 or 5 is selected
          return Math.floor(hotelStarRating) === filterRating || Math.ceil(hotelStarRating) === filterRating;
        });
        if (!matchesRating) return false;
      }

      // Amenities filter
      if (filters.amenities.length > 0) {
        const hasAllAmenities = filters.amenities.every(amenity =>
          hotelAmenities.some(ha => ha.toLowerCase().includes(amenity.toLowerCase()))
        );
        if (!hasAllAmenities) return false;
      }

      // Freebies filter (check amenities)
      if (filters.freebies.length > 0) {
        for (const freebie of filters.freebies) {
          if (freebie === 'breakfast' && !hotelAmenities.some(a => a.toLowerCase().includes('breakfast'))) {
            return false;
          }
          if (freebie === 'cancellation' && !hotelAmenities.some(a => a.toLowerCase().includes('cancellation'))) {
            return false;
          }
          if (freebie === 'wifi' && !hotelAmenities.some(a => a.toLowerCase().includes('wifi'))) {
            return false;
          }
        }
      }

      // Review score filter
      if (filters.reviewScore.length > 0) {
        const userRating = Number(hotel.user_rating) || 0;
        const matchesReview = filters.reviewScore.some(score => {
          if (score === 9 && userRating >= 9) return true;
          if (score === 8 && userRating >= 8) return true;
          if (score === 7 && userRating >= 7) return true;
          return false;
        });
        if (!matchesReview) return false;
      }

      return true;
    });

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
      case 'Price (Low to High)':
        result.sort((a, b) => (Number(a.price_per_night) || 0) - (Number(b.price_per_night) || 0));
        break;
      case 'price-high':
      case 'Price (High to Low)':
        result.sort((a, b) => (Number(b.price_per_night) || 0) - (Number(a.price_per_night) || 0));
        break;
      case 'rating':
      case 'Rating':
        result.sort((a, b) => (Number(b.user_rating) || 0) - (Number(a.user_rating) || 0));
        break;
      case 'recommended':
      case 'Recommended':
      default:
        // Sort by star rating and user rating
        result.sort((a, b) => {
          const starDiff = (Number(b.star_rating) || 0) - (Number(a.star_rating) || 0);
          if (starDiff !== 0) return starDiff;
          return (Number(b.user_rating) || 0) - (Number(a.user_rating) || 0);
        });
        break;
    }

    return result;
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <FaStar
          key={i}
          className={i < fullStars ? 'star-filled' : 'star-empty'}
        />
      );
    }
    return stars;
  };

  const renderHotelCard = (hotel) => {
    const nights = calculateNights();
    const pricePerNight = Number(hotel.price_per_night) || 100;
    const totalPrice = pricePerNight * nights;
    const isSaved = savedHotels.has(hotel.id);

    return (
      <div key={hotel.id} className="hotel-card">
        <div className="hotel-card-image-container">
          <img
            src={getHotelImage(hotel.hotel_name)}
            alt={hotel.hotel_name}
            className="hotel-card-image"
          />
          <button
            className={`save-hotel-btn ${isSaved ? 'saved' : ''}`}
            onClick={() => toggleSaveHotel(hotel.id)}
          >
            {isSaved ? <FaHeart /> : <FaRegHeart />}
          </button>
        </div>

        <div className="hotel-card-content">
          <div className="hotel-card-header">
            <div className="hotel-name-section">
              <h3 className="hotel-name">{hotel.hotel_name}</h3>
              <div className="hotel-stars">{renderStars(hotel.star_rating)}</div>
            </div>
            {hotel.user_rating > 0 && (
              <div className="hotel-rating-badge">
                <div className="rating-score">{Number(hotel.user_rating).toFixed(1)}</div>
                <div className="rating-label">
                  {hotel.user_rating >= 4.5 ? 'Excellent' : hotel.user_rating >= 4.0 ? 'Very good' : hotel.user_rating >= 3.5 ? 'Good' : 'Fair'}
                </div>
              </div>
            )}
          </div>

          <div className="hotel-location">
            <FaMapMarkerAlt className="location-icon" />
            <span>{hotel.city}, {hotel.state}</span>
          </div>

          {hotel.amenities && (
            <div className="hotel-amenities">
              {(Array.isArray(hotel.amenities) ? hotel.amenities :
                typeof hotel.amenities === 'string' ? JSON.parse(hotel.amenities) : []
              ).slice(0, 3).map((amenity, idx) => (
                <span key={idx} className="amenity-tag">{amenity}</span>
              ))}
            </div>
          )}

          <div className="hotel-card-footer">
            <div className="hotel-pricing">
              <div className="price-details">
                <div className="price-breakdown">
                  <span className="price-label">Total for {nights} night{nights !== 1 ? 's' : ''}</span>
                  <div className="price-amount">${totalPrice.toFixed(0)}</div>
                  <span className="price-per-night">${pricePerNight.toFixed(0)}/night</span>
                </div>
              </div>
            </div>

            <button
              className="view-deal-btn"
              onClick={() => {
                // Track Property Click
                import('../services/analyticsApi').then(({ analyticsPageClicksAPI }) => {
                  analyticsPageClicksAPI.track({
                    type: 'property_click',
                    property_id: hotel.id,
                    property_name: hotel.hotel_name,
                    property_type: 'hotel'
                  });
                });

                navigate(`/hotel-details/${hotel.id}?checkIn=${searchCriteria.checkIn}&checkOut=${searchCriteria.checkOut}&rooms=${searchCriteria.rooms}&adults=${searchCriteria.adults}&children=${searchCriteria.children}`);
              }}
            >
              View Deal
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFilters = () => (
    <div className="filters-sidebar">
      <div className="filters-header">
        <h3>All filters</h3>
        <button className="clear-filters-btn" onClick={() => setFilters({
          priceRange: [0, 500],
          starRating: [],
          amenities: [],
          freebies: [],
          propertyType: [],
          neighborhood: [],
          reviewScore: []
        })}>
          Clear all
        </button>
      </div>

      {/* Smart Filters */}
      <div className="filter-section">
        <h4>Smart Filters</h4>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            onChange={(e) => {
              if (e.target.checked) {
                handleFilterChange('priceRange', [0, 57]);
              } else {
                handleFilterChange('priceRange', [0, 500]);
              }
            }}
          />
          <span>Under $57</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.freebies.includes('breakfast')}
            onChange={(e) => {
              const newFreebies = e.target.checked
                ? [...filters.freebies, 'breakfast']
                : filters.freebies.filter(f => f !== 'breakfast');
              handleFilterChange('freebies', newFreebies);
            }}
          />
          <span>Free breakfast</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.starRating.includes(4) && filters.starRating.includes(5)}
            onChange={(e) => {
              if (e.target.checked) {
                handleFilterChange('starRating', [4, 4.5, 5]);
              } else {
                handleFilterChange('starRating', []);
              }
            }}
          />
          <span>Class 4+</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            onChange={(e) => {
              // This would need user_rating >= 8 logic in the filter function
            }}
          />
          <span>8+ rating</span>
        </label>
      </div>

      {/* Price Range */}
      <div className="filter-section">
        <h4>Price</h4>
        <div className="price-range-inputs">
          <input
            type="number"
            className="price-input"
            value={filters.priceRange[0]}
            onChange={(e) => handleFilterChange('priceRange', [parseInt(e.target.value), filters.priceRange[1]])}
          />
          <span>-</span>
          <input
            type="number"
            className="price-input"
            value={filters.priceRange[1]}
            onChange={(e) => handleFilterChange('priceRange', [filters.priceRange[0], parseInt(e.target.value)])}
          />
        </div>
        <input
          type="range"
          min="0"
          max="500"
          value={filters.priceRange[1]}
          onChange={(e) => handleFilterChange('priceRange', [filters.priceRange[0], parseInt(e.target.value)])}
          className="price-slider"
        />
      </div>

      {/* Freebies */}
      <div className="filter-section">
        <h4>Freebies</h4>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.freebies.includes('breakfast')}
            onChange={(e) => {
              const newFreebies = e.target.checked
                ? [...filters.freebies, 'breakfast']
                : filters.freebies.filter(f => f !== 'breakfast');
              handleFilterChange('freebies', newFreebies);
            }}
          />
          <span>Free breakfast</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.freebies.includes('cancellation')}
            onChange={(e) => {
              const newFreebies = e.target.checked
                ? [...filters.freebies, 'cancellation']
                : filters.freebies.filter(f => f !== 'cancellation');
              handleFilterChange('freebies', newFreebies);
            }}
          />
          <span>Free cancellation</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.freebies.includes('wifi')}
            onChange={(e) => {
              const newFreebies = e.target.checked
                ? [...filters.freebies, 'wifi']
                : filters.freebies.filter(f => f !== 'wifi');
              handleFilterChange('freebies', newFreebies);
            }}
          />
          <span>Free WiFi</span>
        </label>
      </div>

      {/* Amenities */}
      <div className="filter-section">
        <h4>Amenities</h4>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.amenities.includes('pool')}
            onChange={(e) => {
              const newAmenities = e.target.checked
                ? [...filters.amenities, 'pool']
                : filters.amenities.filter(a => a !== 'pool');
              handleFilterChange('amenities', newAmenities);
            }}
          />
          <span>Pool</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.amenities.includes('gym')}
            onChange={(e) => {
              const newAmenities = e.target.checked
                ? [...filters.amenities, 'gym']
                : filters.amenities.filter(a => a !== 'gym');
              handleFilterChange('amenities', newAmenities);
            }}
          />
          <span>Gym</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.amenities.includes('spa')}
            onChange={(e) => {
              const newAmenities = e.target.checked
                ? [...filters.amenities, 'spa']
                : filters.amenities.filter(a => a !== 'spa');
              handleFilterChange('amenities', newAmenities);
            }}
          />
          <span>Spa</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.amenities.includes('parking')}
            onChange={(e) => {
              const newAmenities = e.target.checked
                ? [...filters.amenities, 'parking']
                : filters.amenities.filter(a => a !== 'parking');
              handleFilterChange('amenities', newAmenities);
            }}
          />
          <span>Parking</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.amenities.includes('pet')}
            onChange={(e) => {
              const newAmenities = e.target.checked
                ? [...filters.amenities, 'pet']
                : filters.amenities.filter(a => a !== 'pet');
              handleFilterChange('amenities', newAmenities);
            }}
          />
          <span>Pet-friendly</span>
        </label>
      </div>

      {/* Hotel Class */}
      <div className="filter-section">
        <h4>Hotel class</h4>
        {[5, 4, 3, 2, 1].map(stars => (
          <label key={stars} className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.starRating.includes(stars)}
              onChange={(e) => {
                const newRatings = e.target.checked
                  ? [...filters.starRating, stars]
                  : filters.starRating.filter(r => r !== stars);
                handleFilterChange('starRating', newRatings);
              }}
            />
            <span className="star-filter">{renderStars(stars)}</span>
          </label>
        ))}
      </div>

      {/* Review Score */}
      <div className="filter-section">
        <h4>Review score</h4>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.reviewScore.includes(9)}
            onChange={(e) => {
              const newScores = e.target.checked
                ? [...filters.reviewScore, 9]
                : filters.reviewScore.filter(s => s !== 9);
              handleFilterChange('reviewScore', newScores);
            }}
          />
          <span>Wonderful 9+</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.reviewScore.includes(8)}
            onChange={(e) => {
              const newScores = e.target.checked
                ? [...filters.reviewScore, 8]
                : filters.reviewScore.filter(s => s !== 8);
              handleFilterChange('reviewScore', newScores);
            }}
          />
          <span>Very good 8+</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.reviewScore.includes(7)}
            onChange={(e) => {
              const newScores = e.target.checked
                ? [...filters.reviewScore, 7]
                : filters.reviewScore.filter(s => s !== 7);
              handleFilterChange('reviewScore', newScores);
            }}
          />
          <span>Good 7+</span>
        </label>
      </div>

      {/* Neighborhood */}
      <div className="filter-section">
        <h4>Neighborhood</h4>
        <label className="filter-checkbox">
          <input type="checkbox" />
          <span>City Center</span>
        </label>
        <label className="filter-checkbox">
          <input type="checkbox" />
          <span>Airport Area</span>
        </label>
        <label className="filter-checkbox">
          <input type="checkbox" />
          <span>Business District</span>
        </label>
      </div>
    </div>
  );

  const displayedHotels = filteredAndSortedHotels();

  return (
    <div className="hotel-search-page">
      {/* Search Bar Header */}
      <div className="search-bar-sticky">
        <div className="search-bar-content">
          <div className="search-input-group">
            <FaHotel className="search-icon" />
            <HotelLocationAutocomplete
              value={searchCriteria.location}
              onChange={(value) => setSearchCriteria(prev => ({ ...prev, location: value }))}
              placeholder="Where to?"
              name="location"
              required
            />
          </div>

          <div className="search-input-group">
            <FaCalendarAlt className="search-icon" />
            <input
              type="date"
              value={searchCriteria.checkIn}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, checkIn: e.target.value }))}
              className="search-input date-input"
            />
          </div>

          <div className="search-input-group">
            <FaCalendarAlt className="search-icon" />
            <input
              type="date"
              value={searchCriteria.checkOut}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, checkOut: e.target.value }))}
              className="search-input date-input"
              min={searchCriteria.checkIn}
            />
          </div>

          <div className="search-input-group">
            <FaUser className="search-icon" />
            <input
              type="number"
              min="1"
              value={searchCriteria.rooms}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, rooms: parseInt(e.target.value) || 1 }))}
              placeholder="Rooms"
              className="search-input number-input"
              style={{ width: '60px' }}
            />
          </div>

          <div className="search-input-group">
            <FaUser className="search-icon" />
            <input
              type="number"
              min="1"
              value={searchCriteria.adults + searchCriteria.children}
              onChange={(e) => {
                const totalGuests = parseInt(e.target.value) || 2;
                setSearchCriteria(prev => ({ ...prev, adults: totalGuests, children: 0 }));
              }}
              placeholder="Guests"
              className="search-input number-input"
              style={{ width: '70px' }}
            />
          </div>

          <button className="search-btn" onClick={handleSearch}>
            <FaSearch />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="search-results-container">
        {/* Filters Sidebar */}
        {showFilters && renderFilters()}

        {/* Results Section */}
        <div className="results-section">
          {/* Results Header */}
          <div className="results-header">
            <div className="results-info">
              <h2>{displayedHotels.length} results</h2>
              <div className="sort-controls">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Price (Low to High)</option>
                  <option value="price-high">Price (High to Low)</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            </div>

            <div className="view-controls">
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <FaList />
              </button>
              <button
                className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
                onClick={() => setViewMode('map')}
              >
                <FaTh />
              </button>
              <button
                className="filter-toggle-btn"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FaFilter /> {showFilters ? 'Hide' : 'Show'} Filters
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Searching for hotels...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="error-state">
              <p>Error: {error}</p>
              <button onClick={fetchHotels} className="retry-btn">Retry</button>
            </div>
          )}

          {/* Hotel Cards */}
          {!loading && !error && (
            <div className="hotels-list">
              {displayedHotels.length === 0 ? (
                <div className="no-results">
                  <p>No hotels found matching your criteria.</p>
                  <button onClick={() => setFilters({
                    priceRange: [0, 500],
                    starRating: [],
                    amenities: [],
                    freebies: [],
                    propertyType: [],
                    neighborhood: []
                  })} className="clear-filters-btn">
                    Clear Filters
                  </button>
                </div>
              ) : (
                displayedHotels.map(hotel => renderHotelCard(hotel))
              )}
            </div>
          )}
        </div>

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="map-container">
            <div className="map-placeholder">
              <p>Map view coming soon...</p>
              <p>Hotel locations will be displayed here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelSearchPage;
