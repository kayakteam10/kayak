import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bookingsAPI, authAPI, reviewsAPI } from '../services/api';
import { FaPlane, FaHotel, FaCar, FaTimes, FaCheckCircle, FaClock, FaStar, FaSpinner } from 'react-icons/fa';
import SimpleCardInput from '../components/SimpleCardInput';
import SavedCardSelector from '../components/SavedCardSelector';
import { getPaymentMethods, addPaymentMethod, setDefaultPaymentMethod, deletePaymentMethod } from '../services/paymentMethodsAPI';
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
  const [notification, setNotification] = useState(null); // { message, type: 'success' | 'error' | 'info' }

  // Handle URL parameter for tab switching
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['bookings', 'reviews', 'profile', 'payment'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Load saved payment methods from database
  const loadPaymentMethods = async () => {
    try {
      const result = await getPaymentMethods();
      if (result.success) {
        setSavedPaymentMethods(result.data || []);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      // Don't show error to user, just log it
    }
  };

  useEffect(() => {
    loadPaymentMethods();
  }, []);

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
          reviewsAPI.getMyReviews(userId).catch(() => ({ data: { data: [] } }))
        ]);

        setBookings(bookingsRes.data.data || bookingsRes.data.bookings || []);

        // Parse reviews array - handle multiple possible response formats
        let reviewsArray = [];
        if (Array.isArray(reviewsRes.data?.data)) {
          reviewsArray = reviewsRes.data.data;
        } else if (Array.isArray(reviewsRes.data?.reviews)) {
          reviewsArray = reviewsRes.data.reviews;
        } else if (Array.isArray(reviewsRes.data)) {
          reviewsArray = reviewsRes.data;
        } else if (reviewsRes.data?.data && typeof reviewsRes.data.data === 'object') {
          reviewsArray = Object.values(reviewsRes.data.data);
        }

        setReviews(reviewsArray);
        console.log('📋 Initial reviews loaded:', reviewsArray.length, 'reviews');
        console.log('📋 Reviews data:', reviewsArray);

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


  // Payment Method Handlers (Database API)
  const handleDeleteCard = async (cardId) => {
    try {
      const result = await deletePaymentMethod(cardId);
      if (result.success) {
        await loadPaymentMethods(); // Refresh list
        showNotification('Card deleted successfully!', 'success');
      } else {
        showNotification('Error deleting card', 'error');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      showNotification('Error deleting card', 'error');
    }
  };

  const handleSetDefaultCard = async (cardId) => {
    try {
      const result = await setDefaultPaymentMethod(cardId);
      if (result.success) {
        await loadPaymentMethods(); // Refresh list
        showNotification('Default card updated!', 'success');
      } else {
        showNotification('Error setting default card', 'error');
      }
    } catch (error) {
      console.error('Error setting default card:', error);
      showNotification('Error setting default card', 'error');
    }
  };

  const handleCardAdded = async (cardData) => {
    try {
      const result = await addPaymentMethod(cardData);
      if (result.success) {
        await loadPaymentMethods(); // Refresh list
        showNotification('Card saved successfully!', 'success');
      } else {
        showNotification(result.message || 'Error saving card', 'error');
      }
    } catch (error) {
      console.error('Error saving card:', error);
      const errorMsg = error.response?.data?.message || 'Error saving card';
      showNotification(errorMsg, 'error');
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

    // SSN validation (###-##-####) - REQUIRED
    if (!profile.ssn) {
      newErrors.ssn = 'SSN is required';
    } else if (!/^\d{3}-\d{2}-\d{4}$/.test(profile.ssn)) {
      newErrors.ssn = 'SSN must be in format ###-##-####';
    }

    // Phone validation - REQUIRED
    if (!profile.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{3}-\d{3}-\d{4}$/.test(profile.phone)) {
      newErrors.phone = 'Phone must be in format ###-###-####';
    }

    // ZIP code validation - REQUIRED
    if (!profile.zipCode) {
      newErrors.zipCode = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(profile.zipCode)) {
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
        showNotification('Profile updated successfully!', 'success');
        setErrors({});
      }
    } catch (e) {
      console.error('Profile update error:', e);
      const errorMessage = e.response?.data?.error || 'Failed to update profile';

      // Handle specific validation errors
      if (errorMessage.includes('Phone number already exists')) {
        setErrors({ ...errors, phone: 'This phone number is already registered to another user' });
        showNotification('Phone number already exists. Please use a different phone number.', 'error');
      } else if (errorMessage.includes('SSN already exists')) {
        setErrors({ ...errors, ssn: 'This SSN is already registered to another user' });
        showNotification('SSN already exists. Please use a different SSN.', 'error');
      } else if (e.response?.data?.validationErrors) {
        setErrors(e.response.data.validationErrors);
        showNotification('Validation failed. Please check the form.', 'error');
      } else {
        showNotification(errorMessage, 'error');
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
      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'Anonymous';

      console.log('🔑 User ID from localStorage:', userId, 'Type:', typeof userId);
      console.log('🔑 Parsed user ID:', parseInt(userId));

      // Map frontend fields to backend expected fields
      const reviewData = {
        listing_type: reviewForm.entityType,
        listing_id: reviewForm.entityId,
        user_id: parseInt(userId),
        user_name: userName,
        rating: reviewForm.rating,
        comment: reviewForm.reviewText || reviewForm.title || ''
      };

      console.log('📝 Submitting review:', reviewData);
      const response = await reviewsAPI.create(reviewData);
      console.log('Review response:', response);

      // Close modal immediately
      setShowReviewModal(false);

      // Fetch updated reviews list to ensure we have the latest data
      try {
        const userId = localStorage.getItem('userId');
        console.log('🔍 Fetching reviews for user ID:', userId, 'Type:', typeof userId);
        console.log('🔍 Parsed user ID:', parseInt(userId));

        const reviewsRes = await reviewsAPI.getMyReviews(userId);
        console.log('🔍 FULL RESPONSE:', JSON.stringify(reviewsRes, null, 2));
        console.log('🔍 reviewsRes.data:', reviewsRes.data);
        console.log('🔍 reviewsRes.data.data:', reviewsRes.data?.data);
        console.log('🔍 Type of reviewsRes.data.data:', typeof reviewsRes.data?.data);
        console.log('🔍 Is reviewsRes.data.data an array?', Array.isArray(reviewsRes.data?.data));

        // Parse reviews array from response - handle multiple possible formats
        let reviewsArray = [];

        if (Array.isArray(reviewsRes.data?.data)) {
          // Standard format: { data: { data: [...] } }
          reviewsArray = reviewsRes.data.data;
        } else if (Array.isArray(reviewsRes.data?.reviews)) {
          // Alternative format: { data: { reviews: [...] } }
          reviewsArray = reviewsRes.data.reviews;
        } else if (Array.isArray(reviewsRes.data)) {
          // Direct array: { data: [...] }
          reviewsArray = reviewsRes.data;
        } else if (reviewsRes.data?.data && typeof reviewsRes.data.data === 'object') {
          // If data.data is an object, try to extract reviews from it
          reviewsArray = Object.values(reviewsRes.data.data);
        }

        console.log('✅ Final reviews array:', reviewsArray);
        console.log('✅ Array length:', reviewsArray.length);
        console.log('✅ Is array?', Array.isArray(reviewsArray));

        setReviews(reviewsArray);

        // Switch to reviews tab to show the newly submitted review
        setActiveTab('reviews');
        showNotification(`Review submitted successfully! You now have ${reviewsArray.length} review(s).`, 'success');
      } catch (fetchError) {
        console.error('❌ Error refreshing reviews:', fetchError);
        showNotification('Review submitted but failed to refresh the list. Please reload the page.', 'error');
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

      showNotification(displayMsg, 'error');
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

  // Notification helper
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setNotification(null);
    }, 8000);
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <FaSpinner className="spinner icon-spin" /> Loading your profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-container" style={{ marginTop: '100px', textAlign: 'center' }}>
          <h3>Failed to load profile</h3>
          <p>Please try logging in again.</p>
          <button onClick={() => navigate('/login')} className="save-profile-btn">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Notification Banner */}
      {notification && (
        <div className={`notification-banner notification-${notification.type}`}>
          <div className="notification-content">
            <span className="notification-message">{notification.message}</span>
            <button
              className="notification-close"
              onClick={() => setNotification(null)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

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
                      {booking.status === 'confirmed' && (
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
            {!Array.isArray(reviews) || reviews.length === 0 ? (
              <div className="no-reviews">
                <div className="empty-icon">⭐</div>
                <h3>No reviews yet</h3>
                <p>Share your experiences by reviewing your bookings!</p>
              </div>
            ) : (
              <div className="reviews-list">
                {Array.isArray(reviews) && reviews.map((review, index) => {
                  // Handle MongoDB ObjectId format
                  const reviewId = review._id?.$oid || review._id || `review-${index}`;

                  // Parse date - handle both string and Date object
                  let dateStr = 'N/A';
                  try {
                    const date = review.created_at ? new Date(review.created_at) : null;
                    if (date && !isNaN(date.getTime())) {
                      dateStr = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                    }
                  } catch (e) {
                    console.error('Date parsing error:', e, review.created_at);
                  }

                  // Log review data for debugging
                  if (index === 0) {
                    console.log('📝 Sample review object:', review);
                  }

                  // Fallback to legacy fields (including seeded data fields)
                  const displayRating = review.rating || 0;
                  const displayComment = review.comment || review.review_text || '';
                  const displayType = (review.listing_type || review.entity_type || review.target_type || 'UNKNOWN').toUpperCase();
                  const displayId = review.listing_id || review.entity_id || review.target_id || 'N/A';

                  return (
                    <div key={reviewId} className="review-card">
                      <div className="review-header">
                        <div className="review-rating">
                          {[...Array(5)].map((_, i) => (
                            <FaStar key={i} className={i < displayRating ? 'star-filled' : 'star-empty'} />
                          ))}
                        </div>
                        <span className="review-date">{dateStr}</span>
                      </div>
                      {displayComment && <p className="review-text">{displayComment}</p>}
                      <div className="review-meta">
                        <span className="review-entity">
                          {displayType} #{displayId}
                        </span>
                        {(review.verified || review.verified_booking) && <span className="verified-badge">✓ Verified</span>}
                      </div>
                    </div>
                  );
                })}
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
                    value={profile.phone || ''}
                    onChange={(e) => {
                      // Remove all non-digits to get raw input
                      const digits = e.target.value.replace(/\D/g, '');

                      // Limit to 10 digits max
                      const limitedDigits = digits.slice(0, 10);

                      // Format based on number of digits
                      let formatted = '';
                      if (limitedDigits.length === 0) {
                        formatted = '';
                      } else if (limitedDigits.length <= 3) {
                        formatted = limitedDigits;
                      } else if (limitedDigits.length <= 6) {
                        formatted = limitedDigits.slice(0, 3) + '-' + limitedDigits.slice(3);
                      } else {
                        formatted = limitedDigits.slice(0, 3) + '-' + limitedDigits.slice(3, 6) + '-' + limitedDigits.slice(6);
                      }

                      setProfile({ ...profile, phone: formatted });
                    }}
                    placeholder="555-010-6363"
                    maxLength="12"
                    className={errors.phone ? 'error' : ''}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label>User ID (SSN No)*</label>
                  <input
                    type="text"
                    value={profile.ssn || ''}
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
                  <label>ZIP Code * (##### or #####-####)</label>
                  <input
                    type="text"
                    value={profile.zipCode || ''}
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
            <div className="payment-info-card">
              <div className="payment-header-section">
                <div>
                  <h3>Payment Methods</h3>
                  <p className="section-description">Manage your saved payment cards (encrypted in browser storage)</p>
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
                <SimpleCardInput
                  onSuccess={handleCardAdded}
                  onError={(error) => console.error('Card error:', error)}
                  buttonText="Save Card"
                />
              </div>
            </div>
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
