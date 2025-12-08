import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FaStar, FaMapMarkerAlt, FaWifi, FaParking, FaSwimmingPool, FaDumbbell, FaSpa, FaHeart, FaRegHeart, FaShare } from 'react-icons/fa';
import { hotelsAPI } from '../services/api';
import './HotelDetailsPage.css';

const HotelDetailsPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

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
      const response = await hotelsAPI.getDetails(id);
      // API returns { success: true, data: { ... } }
      setHotel(response.data.data || response.data);
    } catch (err) {
      setError(err.message || 'Failed to load hotel details');
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

  const getHotelImages = (hotelName) => {
    const imageMap = {
      'Nob Hill Grand Hotel': [
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'
      ],
      'Golden Gate Suites': [
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80'
      ],
      'Hilton SF': [
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517840901100-8179e982acb7?auto=format&fit=crop&w=800&q=80'
      ]
    };

    return imageMap[hotelName] || [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80'
    ];
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    for (let i = 0; i < 5; i++) {
      stars.push(<FaStar key={i} className={i < fullStars ? 'star-filled' : 'star-empty'} />);
    }
    return stars;
  };

  const getAmenityIcon = (amenity) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi')) return <FaWifi />;
    if (lower.includes('pool')) return <FaSwimmingPool />;
    if (lower.includes('gym')) return <FaDumbbell />;
    if (lower.includes('spa')) return <FaSpa />;
    if (lower.includes('parking')) return <FaParking />;
    return null;
  };

  const scrollToSection = (sectionId) => {
    setActiveTab(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  if (loading) return <div className="loading">Loading hotel details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!hotel) return <div className="error">Hotel not found</div>;

  const images = getHotelImages(hotel.hotel_name);
  const nights = calculateNights();
  const pricePerNight = Number(hotel.price_per_night) || 100;
  const totalPrice = pricePerNight * nights;
  const amenities = Array.isArray(hotel.amenities) ? hotel.amenities :
    (typeof hotel.amenities === 'string' ? JSON.parse(hotel.amenities) : []);

  return (
    <div className="hotel-details-page">
      {/* Header */}
      <div className="details-header">
        <div className="header-content">
          <div className="hotel-title-section">
            <h1>{hotel.hotel_name}</h1>
            <div className="hotel-stars">{renderStars(hotel.star_rating)}</div>
          </div>
          <div className="hotel-location">
            <FaMapMarkerAlt />
            <span>{hotel.address}, {hotel.city}, {hotel.state} {hotel.zip_code}</span>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setSaved(!saved)}>
              {saved ? <FaHeart className="saved" /> : <FaRegHeart />}
            </button>
            <button className="icon-btn">
              <FaShare />
            </button>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="image-gallery">
        <div className="main-image">
          <img src={images[selectedImage]} alt={hotel.hotel_name} />
          <button className="view-all-photos" onClick={() => { }}>
            All photos ({images.length})
          </button>
        </div>
        <div className="thumbnail-grid">
          {images.slice(1, 5).map((img, idx) => (
            <div
              key={idx}
              className="thumbnail"
              onClick={() => setSelectedImage(idx + 1)}
            >
              <img src={img} alt={`View ${idx + 2}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="details-content">
        {/* Left Column - Overview */}
        <div className="details-left">
          {/* Tabs */}
          <div className="details-tabs">
            <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => scrollToSection('overview')}>Overview</button>
            <button className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`} onClick={() => scrollToSection('about')}>About</button>
            <button className={`tab-btn ${activeTab === 'rooms' ? 'active' : ''}`} onClick={() => scrollToSection('rooms')}>Rooms</button>
            <button className={`tab-btn ${activeTab === 'policies' ? 'active' : ''}`} onClick={() => scrollToSection('policies')}>Policies</button>
          </div>

          <section id="overview" className="overview-section">
            <div className="luxury-badge">
              <span className="badge-label">Luxury</span>
              <div className="stars-display">{renderStars(hotel.star_rating)}</div>
            </div>

            <h1 className="property-name">{hotel.hotel_name}</h1>

            <div className="rating-banner">
              <div className="rating-score">{Number(hotel.user_rating).toFixed(1)}</div>
              <div className="rating-info">
                <div className="rating-label">
                  {hotel.user_rating >= 9 ? 'Exceptional' : hotel.user_rating >= 8 ? 'Very good' : hotel.user_rating >= 7 ? 'Good' : 'Fair'}
                </div>
                <div className="review-count">{hotel.review_count || 273} reviews →</div>
              </div>
            </div>

            <div className="property-description">
              <h3>Serene escape in vibrant {hotel.city}</h3>
              <p>
                {hotel.description || `Grand and elegant, this property offers a serene escape amidst ${hotel.city}'s vibrant cityscape. Transformative amenities and a well-maintained facility elevate your stay to unparalleled relaxation.`}
              </p>
            </div>

            {/* Highlights */}
            <div className="highlights-section">
              <h3>Highlights</h3>
              <div className="highlights-grid">
                <div className="highlight-item">
                  <div className="highlight-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                    </svg>
                  </div>
                  <div className="highlight-content">
                    <h4>Exceptional service & staff</h4>
                    <p>The top-rated staff and service will ensure you feel welcome and pampered.</p>
                  </div>
                </div>

                <div className="highlight-item">
                  <div className="highlight-icon">
                    <FaSwimmingPool />
                  </div>
                  <div className="highlight-content">
                    <h4>Poolside bar</h4>
                    <p>A rare find - enjoy refreshing drinks by the pool.</p>
                  </div>
                </div>

                <div className="highlight-item">
                  <div className="highlight-icon">
                    <FaMapMarkerAlt />
                  </div>
                  <div className="highlight-content">
                    <h4>Discover nearby landmarks</h4>
                    <p>Near top attractions in {hotel.city}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Popular Amenities */}
          <section className="amenities-section">
            <h2>Popular amenities</h2>
            <div className="amenities-grid">
              {amenities.map((amenity, idx) => (
                <div key={idx} className="amenity-item">
                  {getAmenityIcon(amenity)}
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="about" className="about-this-property">
            <h2>About This Property</h2>
            <p className="property-type">
              {hotel.star_rating >= 4 ? 'Luxury' : 'Comfortable'} hotel with {amenities.length}+ amenities and full-service experience
            </p>
            <div className="property-features-grid">
              {amenities.map((amenity, idx) => (
                <div key={idx} className="feature-item">
                  {getAmenityIcon(amenity)}
                  <span>{amenity}</span>
                </div>
              ))}
              {hotel.free_breakfast && (
                <div className="feature-item">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3z" />
                  </svg>
                  <span>Buffet breakfast available</span>
                </div>
              )}
              <div className="feature-item">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                </svg>
                <span>24-hour airport shuttle available</span>
              </div>
              <div className="feature-item">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                </svg>
                <span>International cuisine restaurant</span>
              </div>
            </div>
          </section>

          {/* Policies Section */}
          <section id="policies" className="policies-section">
            <h2>Policies</h2>

            <div className="policy-group">
              <h3>Check-in</h3>
              <p><strong>Check-in start time: 3 PM</strong>; Check-in end time: midnight</p>
              <p>Express check-in available</p>
            </div>

            <div className="policy-group">
              <h3>Check-out</h3>
              <p><strong>Check-out before noon</strong></p>
              <p>Contactless check-out available</p>
              <p>Express check-out available</p>
            </div>

            <div className="policy-group">
              <h3>Special check-in instructions</h3>
              <p>This property offers transfers from the airport (surcharges may apply); to arrange pick-up, guests must contact the property 48 hours prior to arrival, using the contact information on the booking confirmation</p>
              <p>Front desk staff will greet guests on arrival at the property</p>
              <p>Guests are recommended to download the property's mobile app before check-in</p>
              <p>Information provided by the property may be translated using automated translation tools</p>
            </div>

            <div className="policy-group">
              <h3>Access methods</h3>
              <p>Staffed front desk</p>
            </div>

            <div className="policy-group">
              <h3>Pets</h3>
              <p>No pets or service animals allowed</p>
            </div>

            <div className="policy-group">
              <h3>Children and extra beds</h3>
              <p><strong>Children are welcome</strong></p>
              <p>2 children, up to the age of 6 years, can stay for free if using existing beds when occupying the parent or guardian's room</p>
              <p>Rollaway/extra beds are available for $60 per night</p>
              <p>Free cribs are available on request at the property</p>
            </div>

            <div className="policy-group">
              <h3>Property payment types</h3>
              <div className="payment-cards">
                <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" height="30" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" height="30" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="Amex" height="30" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/40/JCB_logo.svg" alt="JCB" height="30" />
              </div>
            </div>
          </section>

          <section id="rooms" className="rooms-section">
            <h2>Latest deals for {hotel.hotel_name}</h2>
            <div className="search-summary">
              <span>{new Date(checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</span>
              <span> - </span>
              <span>{new Date(checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</span>
              <span> | {rooms} room, {Number(adults) + Number(children)} guests</span>
            </div>

            {/* Room Options */}
            <div className="room-options">
              <div className="room-option">
                <div className="room-image">
                  <img src={images[1]} alt="Room" />
                </div>
                <div className="room-details">
                  <h3>Standard Room, 1 King Bed</h3>
                  <div className="room-features">
                    <span>1 king bed</span>
                    <span>269 sq ft</span>
                  </div>
                  <div className="room-amenities">
                    {amenities.slice(0, 3).map((a, i) => (
                      <span key={i} className="room-amenity-tag">{a}</span>
                    ))}
                  </div>
                </div>
                <div className="room-pricing">
                  <div className="price-amount">${pricePerNight}</div>
                  <div className="price-label">Before taxes</div>
                  <button className="view-deal-btn" onClick={() => navigate(`/booking/hotel/${id}?checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}&adults=${adults}&children=${children}`)}>
                    View deal
                  </button>
                </div>
              </div>

              <div className="room-option">
                <div className="room-image">
                  <img src={images[2]} alt="Room" />
                </div>
                <div className="room-details">
                  <h3>Deluxe Room, 2 Twin Beds</h3>
                  <div className="room-features">
                    <span>2 twin beds</span>
                    <span>269 sq ft</span>
                  </div>
                  <div className="room-amenities">
                    {amenities.slice(0, 3).map((a, i) => (
                      <span key={i} className="room-amenity-tag">{a}</span>
                    ))}
                  </div>
                </div>
                <div className="room-pricing">
                  <div className="price-amount">${pricePerNight + 10}</div>
                  <div className="price-label">Before taxes</div>
                  <button className="view-deal-btn" onClick={() => navigate(`/booking/hotel/${id}?checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}&adults=${adults}&children=${children}`)}>
                    View deal
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column - Booking Card */}
        <div className="details-right">
          <div className="booking-card sticky">
            <div className="booking-price">
              <div className="price-large">${pricePerNight}</div>
              <div className="price-label">per night</div>
            </div>
            <div className="total-price">
              <span>Total for {nights} night{nights > 1 ? 's' : ''}</span>
              <span className="total-amount">${totalPrice}</span>
            </div>
            <button
              className="book-now-btn"
              onClick={() => navigate(`/booking/hotel/${id}?checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}&adults=${adults}&children=${children}`)}
            >
              Book now
            </button>
            <div className="booking-details">
              <div className="detail-row">
                <span>Check-in</span>
                <span>{new Date(checkIn).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span>Check-out</span>
                <span>{new Date(checkOut).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span>Guests</span>
                <span>{Number(adults) + Number(children)} guests</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetailsPage;
