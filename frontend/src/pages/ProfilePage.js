import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingsAPI, authAPI } from '../services/api';
import { FaPlane, FaHotel, FaCar, FaTimes, FaCheckCircle, FaClock } from 'react-icons/fa';
import './ProfilePage.css';

function ProfilePage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await bookingsAPI.getAll();
        setBookings(response.data.bookings || []);
      } catch (err) {
        console.error('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    const fetchProfile = async () => {
      try {
        const res = await authAPI.me();
        setProfile({
          firstName: res.data.firstName || '',
          lastName: res.data.lastName || '',
          email: res.data.email || '',
          phone: res.data.phone || ''
        });
      } catch (e) {
        // ignore
      }
    };

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchBookings();
    fetchProfile();
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

  if (loading) return <div className="profile-loading">Loading your bookings...</div>;

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h2>My Account</h2>
          <p>Manage your bookings and preferences</p>
        </div>

        <div className="profile-tabs">
          <button 
            className={`tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            My Bookings
          </button>
          <button 
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
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

        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="profile-info-card">
              <h3>Profile Information</h3>
              <div className="profile-details">
                <div className="profile-detail-row">
                  <span className="profile-label">First Name</span>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </div>
                <div className="profile-detail-row">
                  <span className="profile-label">Last Name</span>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                </div>
                <div className="profile-detail-row">
                  <span className="profile-label">Email</span>
                  <input type="email" value={profile.email} readOnly />
                </div>
                <div className="profile-detail-row">
                  <span className="profile-label">Phone</span>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="profile-actions" style={{ marginTop: 12 }}>
                <button
                  className="save-profile-btn"
                  disabled={saving}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      const res = await authAPI.updateMe({
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        phone: profile.phone
                      });
                      setProfile({
                        firstName: res.data.user.firstName || '',
                        lastName: res.data.user.lastName || '',
                        email: res.data.user.email || profile.email,
                        phone: res.data.user.phone || ''
                      });
                      alert('Profile updated');
                    } catch (e) {
                      alert('Failed to update profile');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
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
