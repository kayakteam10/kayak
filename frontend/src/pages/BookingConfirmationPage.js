import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { FaCheckCircle, FaPlane, FaHotel, FaCar, FaPrint } from 'react-icons/fa';
import './BookingConfirmationPage.css';

function BookingConfirmationPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await bookingsAPI.getDetails(id);
        setBooking(response.data);
      } catch (err) {
        console.error('Failed to load booking');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchBooking();
    }
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const getTypeIcon = () => {
    if (type === 'flights') return <FaPlane />;
    if (type === 'hotels') return <FaHotel />;
    return <FaCar />;
  };

  if (loading) return <div className="confirmation-loading">Loading confirmation...</div>;
  if (!booking && !id) {
    // If no booking ID, show success message anyway
    return (
      <div className="confirmation-page">
        <div className="confirmation-container">
          <div className="confirmation-header">
            <FaCheckCircle className="success-icon" />
            <h1>Booking Confirmed!</h1>
            <p>Your booking has been successfully confirmed.</p>
          </div>
          <div className="confirmation-actions">
            <button onClick={() => navigate('/profile')} className="btn-primary">
              View My Bookings
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              Continue Searching
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="confirmation-page">
      <div className="confirmation-container">
        <div className="confirmation-header">
          <FaCheckCircle className="success-icon" />
          <h1>Booking Confirmed!</h1>
          <p>Thank you for your booking. Your confirmation details are below.</p>
        </div>

        {booking && (
          <div className="confirmation-details">
            <div className="detail-card">
              <h3>Booking Reference</h3>
              <p className="reference-number">{booking.booking_reference || booking.id}</p>
            </div>

            <div className="detail-card">
              <div className="card-icon">{getTypeIcon()}</div>
              <div className="card-content">
                <h3>Booking Details</h3>
                <div className="detail-row">
                  <span>Type:</span>
                  <span>{booking.booking_type || type}</span>
                </div>
                <div className="detail-row">
                  <span>Total Amount:</span>
                  <span className="amount">
                    ${Number.isFinite(parseFloat(booking?.total_amount)) ? parseFloat(booking.total_amount).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Booking Date:</span>
                  <span>{booking?.created_at ? new Date(booking.created_at).toLocaleDateString() : '-'}</span>
                </div>
                <div className="detail-row">
                  <span>Status:</span>
                  <span className={`status ${booking.status}`}>{booking.status}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="confirmation-actions">
          <button onClick={handlePrint} className="btn-secondary">
            <FaPrint /> Print Confirmation
          </button>
          <button onClick={() => navigate('/profile')} className="btn-primary">
            View My Bookings
          </button>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Continue Searching
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingConfirmationPage;

