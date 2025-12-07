import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bookingsAPI, authAPI, reviewsAPI } from '../services/api';
import { FaPlane, FaHotel, FaCar, FaTimes, FaCheckCircle, FaClock, FaStar } from 'react-icons/fa';
import CardInput from '../components/CardInput';
import SavedCardSelector from '../components/SavedCardSelector';
import StripeProvider from '../components/StripeProvider';
import './ProfilePage.css';

const USA_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

function ProfilePage() {
  const navigate = useNavigate();
  const [userRole] = useState(localStorage.getItem('userRole') || 'user');
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('userRole') === 'admin' ? 'profile' : 'bookings');
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all', 'confirmed', 'pending', 'cancelled'
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profilePicture: '',
    ssn: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    creditCardLast4: '',
    creditCardType: ''
  });
  const [paymentInfo, setPaymentInfo] = useState({
    paymentType: 'card', // 'card' or 'paypal'
    creditCardNumber: '',
    creditCardType: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    // PayPal fields
    paypalEmail: ''
  });
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    bookingId: null,
    entityType: '',
    entityId: null,
    rating: 5,
    title: '',
    reviewText: ''
  });

  // Handle URL parameter for tab switching
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['bookings', 'reviews', 'profile', 'payment'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Load saved payment methods from Stripe API
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found - user not logged in');
        return;
      }

      try {
        const response = await fetch('http://localhost:8080/api/payment-methods', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSavedPaymentMethods(data.data || []);
          }
        } else {
          console.error('Failed to fetch payment methods:', response.status);
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }
    };

    fetchPaymentMethods();
  }, []); // Run once on mount

  // Save payment methods to localStorage whenever they change
  useEffect(() => {
    if (savedPaymentMethods.length > 0) {
      localStorage.setItem('savedPaymentMethods', JSON.stringify(savedPaymentMethods));
    }
  }, [savedPaymentMethods]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get userId from localStorage
        const userId = localStorage.getItem('userId');

        if (!userId) {
          console.error('No userId found in localStorage');
          navigate('/login');
          return;
        }

        const [bookingsRes, profileRes, reviewsRes] = await Promise.all([
          bookingsAPI.getAll(userId),
          authAPI.me(),
          reviewsAPI.getMyReviews(userId).catch(() => ({ data: { reviews: [] } }))
        ]);

        setBookings(bookingsRes.data.data || bookingsRes.data.bookings || []);
        setReviews(reviewsRes.data?.reviews || []);
        // Billing feature not yet implemented
        setBillings([]);

        // Extract user data from correct response structure
        const userData = profileRes.data.data || profileRes.data;
        setProfile({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          profilePicture: userData.profilePicture || '',
          ssn: userData.ssn || '',
          address: userData.address || '',
          city: userData.city || '',
          state: userData.state || '',
          zipCode: userData.zipCode || '',
          creditCardLast4: userData.creditCardLast4 || '',
          creditCardType: userData.creditCardType || ''
        });

        if (userData.profilePicture) {
          setImagePreview(userData.profilePicture);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchData();
  }, [navigate]);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await bookingsAPI.cancel(id);
      // Update the booking status in the state instead of removing it
      setBookings(bookings.map(b =>
        b.id === id ? { ...b, status: 'cancelled' } : b
      ));
      alert('Booking cancelled successfully');
    } catch (err) {
      alert('Failed to cancel booking');
    }
  };

  const getTypeIcon = (type) => {
    if (type?.toLowerCase().includes('flight')) return <FaPlane />;
    if (type?.toLowerCase().includes('hotel')) return <FaHotel />;
    if (type?.toLowerCase().includes('car')) return <FaCar />;
    return <FaCheckCircle />;
  };

  const getStatusIcon = (status) => {
    if (status === 'confirmed') return <FaCheckCircle className="status-icon confirmed" />;
    if (status === 'pending') return <FaClock className="status-icon pending" />;
    if (status === 'cancelled') return <FaTimes className="status-icon cancelled" />;
    return null;
  };


  // Stripe Payment Method Handlers
  const handleDeleteCard = async (cardId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/payment-methods/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSavedPaymentMethods(savedPaymentMethods.filter(card => card.id !== cardId));
        alert('Card deleted successfully!');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete card');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Error deleting card');
    }
  };

  const handleSetDefaultCard = async (cardId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/payment-methods/${cardId}/set-default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const updated = savedPaymentMethods.map(card => ({
          ...card,
          is_default: card.id === cardId
        }));
        setSavedPaymentMethods(updated);
        alert('Default card updated!');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to set default card');
      }
    } catch (error) {
      console.error('Error setting default card:', error);
      alert('Error setting default card');
    }
  };

  const handleCardAdded = async () => {
    // Refresh payment methods after adding new card
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/payment-methods', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSavedPaymentMethods(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error refreshing payment methods:', error);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setProfile({ ...profile, profilePicture: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePicture = () => {
    setImagePreview(null);
    setProfile({ ...profile, profilePicture: '' });
  };

  const validateForm = () => {
    const newErrors = {};

    // SSN validation (###-##-####) - MANDATORY
    if (!profile.ssn) {
      newErrors.ssn = 'SSN is required';
    } else if (!/^\d{3}-\d{2}-\d{4}$/.test(profile.ssn)) {
      newErrors.ssn = 'SSN must be in format ###-##-####';
    }

    // Phone validation - MANDATORY
    if (!profile.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/.test(profile.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    // ZIP code validation (##### or #####-####)
    if (profile.zipCode && !/^\d{5}(-\d{4})?$/.test(profile.zipCode)) {
      newErrors.zipCode = 'ZIP code must be in format ##### or #####-####';
    }

    // State validation (2-letter abbreviation)
    const validStates = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
      'DC'
    ];
    if (profile.state && !validStates.includes(profile.state.toUpperCase())) {
      newErrors.state = 'Invalid state abbreviation';
    }

    // Phone validation
    if (profile.phone && !/^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/.test(profile.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    // Credit card last 4 validation
    if (profile.creditCardLast4 && !/^\d{4}$/.test(profile.creditCardLast4)) {
      newErrors.creditCardLast4 = 'Must be exactly 4 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      alert('Please fix validation errors before saving');
      return;
    }

    setSaving(true);
    try {
      const res = await authAPI.updateMe(profile);

      // Check if response is successful
      if (res.data) {
        // Extract updated user from correct response structure
        const updatedUser = res.data.data || res.data;
        setProfile({
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          email: updatedUser.email || profile.email,
          phone: updatedUser.phone || '',
          profilePicture: updatedUser.profilePicture || '',
          ssn: updatedUser.ssn || '',
          address: updatedUser.address || '',
          city: updatedUser.city || '',
          state: updatedUser.state || '',
          zipCode: updatedUser.zipCode || '',
          creditCardLast4: updatedUser.creditCardLast4 || '',
          creditCardType: updatedUser.creditCardType || ''
        });

        // Update localStorage for header to display
        if (updatedUser.profilePicture) {
          localStorage.setItem('profilePicture', updatedUser.profilePicture);
        } else {
          localStorage.removeItem('profilePicture');
        }

        // Trigger header update
        window.dispatchEvent(new Event('login'));
        alert('Profile updated successfully!');
        setErrors({});
      }
    } catch (e) {
      console.error('Profile update error:', e);
      if (e.response?.data?.validationErrors) {
        setErrors(e.response.data.validationErrors);
        alert('Validation failed. Please check the form.');
      } else {
        alert(e.response?.data?.error || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const openReviewModal = (booking) => {
    console.log('🔍 Opening review modal for booking:', booking);

    // Handle booking_details - it might be a string or already parsed object
    let details = {};
    try {
      if (typeof booking.booking_details === 'string') {
        details = JSON.parse(booking.booking_details);
      } else if (typeof booking.booking_details === 'object' && booking.booking_details !== null) {
        details = booking.booking_details;
      }
    } catch (e) {
      console.error('Error parsing booking details:', e);
      details = {};
    }

    console.log('📋 Parsed booking details:', details);

    const entityType = booking.booking_type === 'flight' ? 'flight' : booking.booking_type === 'hotel' ? 'hotel' : 'car';
    // Try to get entity ID from various possible fields in booking details
    let entityId = details.flightId || details.hotelId || details.carId ||
      details.flight_id || details.hotel_id || details.car_id;

    // If no entity ID found in details, use the booking ID itself as fallback
    if (!entityId) {
      entityId = booking.id;
    }

    const formData = {
      bookingId: booking.id,
      entityType,
      entityId: parseInt(entityId), // Ensure it's a number
      rating: 5,
      title: '',
      reviewText: ''
    };

    console.log('📝 Review form initialized:', formData);

    setReviewForm(formData);
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    try {
      console.log('Submitting review:', reviewForm);
      const response = await reviewsAPI.create(reviewForm);
      console.log('Review response:', response);

      // Add the new review to the reviews list
      setReviews([response.data.review, ...reviews]);

      // Close modal and show success message
      setShowReviewModal(false);
      alert('Review submitted successfully!');

      // Fetch updated reviews list to ensure we have the latest data
      try {
        const userId = localStorage.getItem('userId');
        const reviewsRes = await reviewsAPI.getMyReviews(userId);
        setReviews(reviewsRes.data?.reviews || []);
        console.log('✅ Reviews refreshed after submission');
      } catch (fetchError) {
        console.error('Error refreshing reviews:', fetchError);
      }

      // Reset form
      setReviewForm({
        bookingId: null,
        entityType: '',
        entityId: null,
        rating: 5,
        title: '',
        reviewText: ''
      });
    } catch (error) {
      console.error('Review submission error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to submit review';
      const errorDetails = error.response?.data?.details;

      let displayMsg = `Failed to submit review: ${errorMsg}`;
      if (errorDetails && typeof errorDetails === 'object') {
        const detailsArray = Object.entries(errorDetails)
          .filter(([_, value]) => value !== null)
          .map(([key, value]) => `${key}: ${value}`);
        if (detailsArray.length > 0) {
          displayMsg += '\n\nDetails:\n' + detailsArray.join('\n');
        }
      } else if (errorDetails) {
        displayMsg += '\n\nDetails: ' + errorDetails;
      }

      alert(displayMsg);
    }
  };

  const handleStatClick = (status) => {
    setActiveTab('bookings');
    setBookingFilter(status);
  };

  const getFilteredBookings = () => {
    if (bookingFilter === 'all') return bookings;
    return bookings.filter(b => b.status === bookingFilter);
  };

  if (loading) return <div className="profile-loading">Loading your bookings...</div>;

  return (
    <div className="profile-page">
      <div className="profile-banner"></div>

      <div className="profile-container">
        <div className="profile-card-header">
          <div className="profile-avatar-section">
            <div className="profile-picture-wrapper">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="profile-picture" />
              ) : (
                <div className="profile-picture-placeholder">
                  <span className="placeholder-icon">👤</span>
                </div>
              )}
            </div>
            <div className="profile-picture-controls">
              <label htmlFor="profile-upload" className="upload-photo-btn">
                <input
                  type="file"
                  id="profile-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                Upload Photo
              </label>
              {imagePreview && (
                <button onClick={removeProfilePicture} className="remove-photo-btn">
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="profile-info-section">
            <h1 className="profile-name">{profile.firstName || 'User'} {profile.lastName || ''}</h1>
            <p className="profile-email">{profile.email}</p>
            {userRole !== 'admin' && (
              <div className="profile-stats">
                <div className="profile-stat stat-clickable" onClick={() => handleStatClick('all')}>
                  <span className="stat-value">{bookings.length}</span>
                  <span className="stat-label">Total Bookings</span>
                </div>
                <div className="profile-stat stat-clickable stat-confirmed" onClick={() => handleStatClick('confirmed')}>
                  <span className="stat-value">{bookings.filter(b => b.status === 'confirmed').length}</span>
                  <span className="stat-label">Confirmed</span>
                </div>
                <div className="profile-stat stat-clickable stat-pending" onClick={() => handleStatClick('pending')}>
                  <span className="stat-value">{bookings.filter(b => b.status === 'pending').length}</span>
                  <span className="stat-label">Pending</span>
                </div>
                <div className="profile-stat stat-clickable stat-cancelled" onClick={() => handleStatClick('cancelled')}>
                  <span className="stat-value">{bookings.filter(b => b.status === 'cancelled').length}</span>
                  <span className="stat-label">Cancelled</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="profile-tabs">
          {userRole !== 'admin' && (
            <>
              <button
                className={`tab ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookings')}
              >
                My Bookings ({bookings.length})
              </button>
              <button
                className={`tab ${activeTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                My Reviews ({reviews.length})
              </button>
            </>
          )}
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile Settings
          </button>
          {userRole !== 'admin' && (
            <button
              className={`tab ${activeTab === 'payment' ? 'active' : ''}`}
              onClick={() => setActiveTab('payment')}
            >
              Payment Methods
            </button>
          )}
        </div>

        {activeTab === 'bookings' && (
          <div className="bookings-section">
            {bookingFilter !== 'all' && (
              <div className="filter-indicator">
                <span>Showing: <strong>{bookingFilter.charAt(0).toUpperCase() + bookingFilter.slice(1)}</strong> bookings</span>
                <button className="clear-filter-btn" onClick={() => setBookingFilter('all')}>Show All</button>
              </div>
            )}
            {bookings.length === 0 ? (
              <div className="no-bookings">
                <div className="empty-icon">📋</div>
                <h3>No bookings yet</h3>
                <p>Start exploring and book your next trip!</p>
                <button onClick={() => navigate('/')} className="explore-btn">
                  Start Searching
                </button>
              </div>
            ) : getFilteredBookings().length === 0 ? (
              <div className="no-bookings">
                <div className="empty-icon">🔍</div>
                <h3>No {bookingFilter} bookings</h3>
                <p>You don't have any {bookingFilter} bookings at the moment.</p>
                <button onClick={() => setBookingFilter('all')} className="explore-btn">
                  Show All Bookings
                </button>
              </div>
            ) : (
              <div className="bookings-list">
                {getFilteredBookings().map((booking) => (
                  <div key={booking.id} className="booking-card">
                    <div className="booking-header">
                      <div className="booking-type-icon">
                        {getTypeIcon(booking.booking_type)}
                      </div>
                      <div className="booking-title-section">
                        <h3>Booking #{booking.booking_reference || booking.id}</h3>
                        <p className="booking-type">{booking.booking_type || 'Booking'}</p>
                      </div>
                      <div className={`status-badge ${booking.status}`}>
                        {getStatusIcon(booking.status)}
                        <span>{booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}</span>
                      </div>
                    </div>

                    <div className="booking-details">
                      <div className="detail-row">
                        <span className="detail-label">Total Amount:</span>
                        <span className="detail-value">
                          ${Number.isFinite(parseFloat(booking.total_amount)) ? parseFloat(booking.total_amount).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Booking Date:</span>
                        <span className="detail-value">
                          {(() => {
                            // Try to get date from created_at or use current date
                            let dateToUse = booking.created_at || booking.createdAt || new Date().toISOString();

                            // Handle MySQL timestamp format (YYYY-MM-DD HH:MM:SS)
                            if (typeof dateToUse === 'string' && dateToUse.includes(' ')) {
                              dateToUse = dateToUse.replace(' ', 'T');
                            }

                            const date = new Date(dateToUse);

                            // If still invalid, use current date
                            if (isNaN(date.getTime())) {
                              return new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            }

                            return date.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });
                          })()}
                        </span>
                      </div>
                      {booking.departure_date && (
                        <div className="detail-row">
                          <span className="detail-label">Departure:</span>
                          <span className="detail-value">
                            {new Date(booking.departure_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="booking-actions">
                      <button
                        onClick={() => {
                          const typeSeg = (booking.booking_type || '').toLowerCase().includes('hotel')
                            ? 'hotels'
                            : (booking.booking_type || '').toLowerCase().includes('car')
                              ? 'cars'
                              : 'flights';
                          navigate(`/booking/confirmation/${typeSeg}/${booking.id}`);
                        }}
                        className="action-btn view-details-btn"
                      >
                        View Details
                      </button>
                      {booking.status === 'confirmed' && !reviews.find(r => r.bookingId === booking.id) && (
                        <button
                          onClick={() => openReviewModal(booking)}
                          className="action-btn review-btn"
                        >
                          <FaStar /> Write Review
                        </button>
                      )}
                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="action-btn cancel-btn"
                        >
                          <FaTimes /> Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="reviews-section">
            {reviews.length === 0 ? (
              <div className="no-reviews">
                <div className="empty-icon">⭐</div>
                <h3>No reviews yet</h3>
                <p>Share your experiences by reviewing your bookings!</p>
              </div>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review._id} className="review-card">
                    <div className="review-header">
                      <div className="review-rating">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} className={i < review.rating ? 'star-filled' : 'star-empty'} />
                        ))}
                      </div>
                      <span className="review-date">
                        {new Date(review.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <h4 className="review-title">{review.title}</h4>
                    <p className="review-text">{review.comment}</p>
                    <div className="review-meta">
                      <span className="review-entity">{review.target_type?.toUpperCase() || 'UNKNOWN'}</span>
                      {review.verified && <span className="verified-badge">✓ Verified</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="profile-info-card">
              <h3>Personal Information</h3>

              <div className="profile-form-grid">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    placeholder="Enter your first name"
                    className={errors.firstName ? 'error' : ''}
                  />
                  {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                </div>

                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    placeholder="Enter your last name"
                    className={errors.lastName ? 'error' : ''}
                  />
                  {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                </div>

                <div className="form-group full-width">
                  <label>Email Address *</label>
                  <input type="email" value={profile.email} readOnly className="readonly-field" />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => {
                      // Remove all non-digits
                      let value = e.target.value.replace(/\D/g, '');

                      // Format as xxx-xxx-xxxx
                      if (value.length >= 6) {
                        value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 10);
                      } else if (value.length >= 3) {
                        value = value.slice(0, 3) + '-' + value.slice(3, 6);
                      }

                      setProfile({ ...profile, phone: value });
                    }}
                    placeholder="123-456-7890"
                    maxLength="12"
                    className={errors.phone ? 'error' : ''}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label>SSN * (###-##-####)</label>
                  <input
                    type="text"
                    value={profile.ssn}
                    onChange={(e) => {
                      // Remove all non-digits
                      const digits = e.target.value.replace(/\D/g, '');

                      // Format as ###-##-####
                      let formatted = '';
                      if (digits.length > 0) {
                        formatted = digits.substring(0, 3);
                        if (digits.length > 3) {
                          formatted += '-' + digits.substring(3, 5);
                          if (digits.length > 5) {
                            formatted += '-' + digits.substring(5, 9);
                          }
                        }
                      }

                      setProfile({ ...profile, ssn: formatted });
                    }}
                    placeholder="123-45-6789"
                    maxLength="11"
                    className={errors.ssn ? 'error' : ''}
                  />
                  {errors.ssn && <span className="error-text">{errors.ssn}</span>}
                </div>

                <div className="form-group full-width">
                  <label>Street Address</label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    placeholder="New York"
                  />
                </div>

                <div className="form-group">
                  <label>State</label>
                  <select
                    value={profile.state}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                    className={errors.state ? 'error' : ''}
                  >
                    <option value="">Select state</option>
                    {USA_STATES.map(state => (
                      <option key={state.code} value={state.code}>
                        {state.code} - {state.name}
                      </option>
                    ))}
                  </select>
                  {errors.state && <span className="error-text">{errors.state}</span>}
                </div>

                <div className="form-group">
                  <label>ZIP Code (##### or #####-####)</label>
                  <input
                    type="text"
                    value={profile.zipCode}
                    onChange={(e) => {
                      // Remove all non-digits
                      const digits = e.target.value.replace(/\D/g, '');

                      // Format as ##### or #####-####
                      let formatted = '';
                      if (digits.length > 0) {
                        formatted = digits.substring(0, 5);
                        if (digits.length > 5) {
                          formatted += '-' + digits.substring(5, 9);
                        }
                      }

                      setProfile({ ...profile, zipCode: formatted });
                    }}
                    placeholder="12345 or 12345-6789"
                    maxLength="10"
                    className={errors.zipCode ? 'error' : ''}
                  />
                  {errors.zipCode && <span className="error-text">{errors.zipCode}</span>}
                </div>
              </div>

              <div className="profile-actions">
                <button
                  className="save-profile-btn"
                  disabled={saving}
                  onClick={handleSaveProfile}
                >
                  {saving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="payment-section">
            <StripeProvider>
              <div className="payment-info-card">
                <div className="payment-header-section">
                  <div>
                    <h3>Payment Methods</h3>
                    <p className="section-description">Manage your payment cards securely with Stripe</p>
                  </div>
                </div>

                {/* Saved Cards List */}
                <SavedCardSelector
                  cards={savedPaymentMethods}
                  onDelete={handleDeleteCard}
                  onSetDefault={handleSetDefaultCard}
                  showActions={true}
                />

                {/* Add New Card Form */}
                <div style={{ marginTop: '24px' }}>
                  <h4>Add New Card</h4>
                  <CardInput
                    onSuccess={handleCardAdded}
                    onError={(error) => console.error('Card error:', error)}
                    buttonText="Save Card"
                  />
                </div>
              </div>
            </StripeProvider>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && (
          <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Write a Review</h3>
                <button onClick={() => setShowReviewModal(false)} className="modal-close">×</button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label>Rating</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={star <= reviewForm.rating ? 'star-filled clickable' : 'star-empty clickable'}
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Review Title</label>
                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                    placeholder="Summarize your experience"
                  />
                </div>

                <div className="form-group">
                  <label>Your Review</label>
                  <textarea
                    value={reviewForm.reviewText}
                    onChange={(e) => setReviewForm({ ...reviewForm, reviewText: e.target.value })}
                    placeholder="Share your experience..."
                    rows="5"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={() => setShowReviewModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  className="btn-primary"
                  disabled={!reviewForm.title || !reviewForm.reviewText}
                >
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
