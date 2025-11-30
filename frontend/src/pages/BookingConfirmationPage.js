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

            {(() => {
              let bookingDetails;
              try {
                bookingDetails = typeof booking.booking_details === 'string' 
                  ? JSON.parse(booking.booking_details) 
                  : booking.booking_details;
              } catch (e) {
                bookingDetails = null;
              }

              const passengers = bookingDetails?.passengers || [];
              const seatInfo = bookingDetails?.seat_info;

              return (
                <>
                  {/* Passenger Information */}
                  {passengers.length > 0 && (
                    <div className="detail-card">
                      <h3>Passenger Information</h3>
                      {passengers.map((passenger, index) => (
                        <div key={index} style={{ marginBottom: index < passengers.length - 1 ? '16px' : '0', paddingBottom: index < passengers.length - 1 ? '16px' : '0', borderBottom: index < passengers.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                          <div className="detail-row">
                            <span>Passenger {index + 1}:</span>
                            <span style={{ fontWeight: 'bold' }}>{passenger.firstName} {passenger.lastName}</span>
                          </div>
                          <div className="detail-row">
                            <span>Email:</span>
                            <span>{passenger.email}</span>
                          </div>
                          <div className="detail-row">
                            <span>Phone:</span>
                            <span>{passenger.phone}</span>
                          </div>
                          {type === 'flights' && passenger.seatNumber && (
                            <div className="detail-row">
                              <span>Seat Number:</span>
                              <span style={{ fontWeight: 'bold', color: '#0066CC' }}>{passenger.seatNumber}</span>
                            </div>
                          )}
                          {type === 'flights' && passenger.seats && Object.keys(passenger.seats).length > 0 && (
                            <div className="detail-row">
                              <span>Seats:</span>
                              <span style={{ fontWeight: 'bold', color: '#0066CC' }}>
                                {Object.entries(passenger.seats).map(([leg, seat]) => `${leg}: ${seat}`).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            <div className="detail-card">
              <div className="card-icon">{getTypeIcon()}</div>
              <div className="card-content">
                <h3>Booking Details</h3>
                <div className="detail-row">
                  <span>Type:</span>
                  <span>{booking.booking_type || type}</span>
                </div>
                {(() => {
                  let bookingDetails;
                  try {
                    bookingDetails = typeof booking.booking_details === 'string' 
                      ? JSON.parse(booking.booking_details) 
                      : booking.booking_details;
                  } catch (e) {
                    bookingDetails = null;
                  }

                  const pricing = bookingDetails?.pricing;
                  const baseAmount = pricing?.base_amount || (parseFloat(booking?.total_amount) / 1.1) || 0;
                  const taxAmount = pricing?.tax_amount || (baseAmount * 0.1) || 0;
                  const totalAmount = pricing?.total_amount || parseFloat(booking?.total_amount) || 0;

                  return (
                    <>
                      <div className="detail-row">
                        <span>Base Price:</span>
                        <span className="amount">
                          ${Number.isFinite(baseAmount) ? baseAmount.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Taxes & Fees:</span>
                        <span className="amount">
                          ${Number.isFinite(taxAmount) ? taxAmount.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="detail-row" style={{ borderTop: '1px solid #e0e0e0', paddingTop: '8px', marginTop: '8px', fontWeight: 'bold' }}>
                        <span>Total Amount:</span>
                        <span className="amount">
                          ${Number.isFinite(totalAmount) ? totalAmount.toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </>
                  );
                })()}
                <div className="detail-row">
                  <span>Booking Date:</span>
                  <span>
                    {booking?.created_at
                      ? new Date(booking.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                      : new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    }
                  </span>
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

