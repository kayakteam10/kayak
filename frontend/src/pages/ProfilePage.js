import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingsAPI, authAPI, reviewsAPI } from '../services/api';
import { FaPlane, FaHotel, FaCar, FaTimes, FaCheckCircle, FaClock, FaStar } from 'react-icons/fa';
import './ProfilePage.css';

function ProfilePage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, profileRes, reviewsRes] = await Promise.all([
          bookingsAPI.getAll(),
          authAPI.me(),
          reviewsAPI.getMyReviews().catch(() => ({ data: { reviews: [] } }))
        ]);

        setBookings(bookingsRes.data.bookings || []);
        setReviews(reviewsRes.data?.reviews || []);
        
        const userData = profileRes.data;
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
      setBookings(bookings.filter(b => b.id !== id));
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
    
    // SSN validation (###-##-####)
    if (profile.ssn && !/^\d{3}-\d{2}-\d{4}$/.test(profile.ssn)) {
      newErrors.ssn = 'SSN must be in format ###-##-####';
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
    
    try {
      setSaving(true);
      const res = await authAPI.updateMe(profile);
      
      const updatedUser = res.data.user;
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
    } catch (e) {
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
    const entityId = details.flightId || details.hotelId || details.carId || details.flight_id || details.hotel_id || details.car_id || booking.id;
    
    const formData = {
      bookingId: booking.id,
      entityType,
      entityId,
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
      
      setReviews([response.data.review, ...reviews]);
      setShowReviewModal(false);
      alert('Review submitted successfully!');
      
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
      alert(`Failed to submit review: ${errorMsg}`);
    }
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
                📷 Upload Photo
              </label>
              {imagePreview && (
                <button onClick={removeProfilePicture} className="remove-photo-btn">
                  🗑️ Remove
                </button>
              )}
            </div>
          </div>
          
          <div className="profile-info-section">
            <h1 className="profile-name">{profile.firstName || 'User'} {profile.lastName || ''}</h1>
            <p className="profile-email">{profile.email}</p>
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="stat-value">{bookings.length}</span>
                <span className="stat-label">Bookings</span>
              </div>
              <div className="profile-stat">
                <span className="stat-value">{bookings.filter(b => b.status === 'confirmed').length}</span>
                <span className="stat-label">Confirmed</span>
              </div>
              <div className="profile-stat">
                <span className="stat-value">{bookings.filter(b => b.status === 'pending').length}</span>
                <span className="stat-label">Pending</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-tabs">
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
          <button 
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile Settings
          </button>
        </div>

        {activeTab === 'bookings' && (
          <div className="bookings-section">
            {bookings.length === 0 ? (
              <div className="no-bookings">
                <div className="empty-icon">📋</div>
                <h3>No bookings yet</h3>
                <p>Start exploring and book your next trip!</p>
                <button onClick={() => navigate('/')} className="explore-btn">
                  Start Searching
                </button>
              </div>
            ) : (
              <div className="bookings-list">
                {bookings.map((booking) => (
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
                          {new Date(booking.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
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
                        className="view-details-btn"
                      >
                        View Details
                      </button>
                      {booking.status === 'confirmed' && !reviews.find(r => r.bookingId === booking.id) && (
                        <button 
                          onClick={() => openReviewModal(booking)}
                          className="review-btn"
                        >
                          ⭐ Write Review
                        </button>
                      )}
                      {booking.status !== 'cancelled' && (
                        <button 
                          onClick={() => handleCancel(booking.id)}
                          className="cancel-btn"
                        >
                          Cancel Booking
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
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <h4 className="review-title">{review.title}</h4>
                    <p className="review-text">{review.reviewText}</p>
                    <div className="review-meta">
                      <span className="review-entity">{review.entityType.toUpperCase()}</span>
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
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="(123) 456-7890"
                    className={errors.phone ? 'error' : ''}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label>SSN (###-##-####)</label>
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
                  <label>State (2-letter code)</label>
                  <input
                    type="text"
                    value={profile.state}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value.toUpperCase() })}
                    placeholder="NY"
                    maxLength="2"
                    className={errors.state ? 'error' : ''}
                  />
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

                <div className="form-group">
                  <label>Credit Card Type</label>
                  <select
                    value={profile.creditCardType}
                    onChange={(e) => setProfile({ ...profile, creditCardType: e.target.value })}
                  >
                    <option value="">Select card type</option>
                    <option value="Visa">Visa</option>
                    <option value="MasterCard">MasterCard</option>
                    <option value="American Express">American Express</option>
                    <option value="Discover">Discover</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Credit Card Last 4 Digits</label>
                  <input
                    type="text"
                    value={profile.creditCardLast4}
                    onChange={(e) => setProfile({ ...profile, creditCardLast4: e.target.value })}
                    placeholder="1234"
                    maxLength="4"
                    className={errors.creditCardLast4 ? 'error' : ''}
                  />
                  {errors.creditCardLast4 && <span className="error-text">{errors.creditCardLast4}</span>}
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
