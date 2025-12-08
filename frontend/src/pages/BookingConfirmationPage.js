import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { FaCheckCircle, FaPlane, FaHotel, FaCar, FaPrint, FaPhone, FaEnvelope, FaGlobe } from 'react-icons/fa';
import './BookingConfirmationPage.css';

function BookingConfirmationPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  useEffect(() => {
    let pollInterval = null;
    let pollCount = 0;
    const maxPolls = 10; // Poll for up to 5 seconds (500ms * 10)

    const fetchBooking = async () => {
      try {
        const response = await bookingsAPI.getDetails(id);
        // Extract booking from correct response structure
        const bookingData = response.data.data || response.data;
        setBooking(bookingData);

        // If booking is confirmed, stop polling
        if (bookingData.status === 'confirmed') {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          setLoading(false);
        } else if (bookingData.status === 'pending' && pollCount < maxPolls) {
          // Keep polling if still pending
          pollCount++;
        } else {
          // Stop polling after max attempts
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load booking');
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        setLoading(false);
      }
    };

    if (id) {
      // Initial fetch
      fetchBooking();

      // Poll every 500ms for status updates
      pollInterval = setInterval(fetchBooking, 500);

      // Cleanup on unmount
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
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

  const renderPrintDetails = (booking, type) => {
    let bookingDetails;
    try {
      bookingDetails = typeof booking.booking_details === 'string'
        ? JSON.parse(booking.booking_details)
        : booking.booking_details;
    } catch (e) {
      bookingDetails = null;
    }

    const passengers = bookingDetails?.passengers || [];
    const pricing = bookingDetails?.pricing;
    const baseAmount = parseFloat(pricing?.base_amount) || (parseFloat(booking?.total_amount) / 1.15) || 0;
    const taxAmount = parseFloat(pricing?.tax_amount) || (baseAmount * 0.15) || 0;
    const totalAmount = parseFloat(pricing?.total_amount) || parseFloat(booking?.total_amount) || 0;

    return (
      <div className="print-body">
        {/* Passenger/Guest Information */}
        {passengers.length > 0 && (
          <div className="print-section">
            <h3 className="section-title">{type === 'hotels' ? 'Guest Information' : 'Passenger Information'}</h3>
            {passengers.map((passenger, index) => (
              <div key={index} className="print-passenger">
                <p><strong>{type === 'hotels' ? 'Guest' : 'Passenger'} {index + 1}:</strong> {passenger.firstName} {passenger.lastName}</p>
                <div className="print-details-grid">
                  <div><strong>Email:</strong> {passenger.email}</div>
                  <div><strong>Phone:</strong> {passenger.phone}</div>
                  {passenger.ssn && <div><strong>SSN:</strong> {passenger.ssn.replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3')}</div>}
                  {type === 'flights' && passenger.seats && Object.keys(passenger.seats).length > 0 && (
                    <div><strong>Seats:</strong> {Object.entries(passenger.seats).map(([leg, seat]) => `${leg}: ${seat}`).join(', ')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Type-specific details */}
        {type === 'flights' && renderFlightDetails(bookingDetails)}
        {type === 'hotels' && renderHotelDetails(bookingDetails)}
        {type === 'cars' && renderCarDetails(bookingDetails)}

        {/* Payment Summary */}
        <div className="print-section payment-summary">
          <h3 className="section-title">Payment Summary</h3>
          <table className="print-table">
            <tbody>
              <tr>
                <td>Base Price:</td>
                <td className="amount">${Number.isFinite(baseAmount) ? baseAmount.toFixed(2) : '0.00'}</td>
              </tr>
              <tr>
                <td>Taxes & Service Fees:</td>
                <td className="amount">${Number.isFinite(taxAmount) ? taxAmount.toFixed(2) : '0.00'}</td>
              </tr>
              <tr className="total-row">
                <td><strong>Total Amount Paid:</strong></td>
                <td className="amount"><strong>${Number.isFinite(totalAmount) ? totalAmount.toFixed(2) : '0.00'}</strong></td>
              </tr>
              <tr>
                <td>Payment Method:</td>
                <td>Credit Card (ending in {bookingDetails?.payment_details?.cardNumber ? bookingDetails.payment_details.cardNumber.slice(-4) : '****'})</td>
              </tr>
              <tr>
                <td>Payment Status:</td>
                <td><span className="status-badge confirmed">CONFIRMED</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFlightDetails = (details) => {
    if (!details) return null;

    return (
      <div className="print-section">
        <h3 className="section-title">Flight Details</h3>
        <table className="print-table">
          <tbody>
            {details.flight_number && <tr><td><strong>Flight Number:</strong></td><td>{details.flight_number}</td></tr>}
            {details.airline && <tr><td><strong>Airline:</strong></td><td>{details.airline}</td></tr>}
            {details.departure_airport && <tr><td><strong>Departure:</strong></td><td>{details.departure_airport}</td></tr>}
            {details.arrival_airport && <tr><td><strong>Arrival:</strong></td><td>{details.arrival_airport}</td></tr>}
            {details.departure_time && (
              <tr>
                <td><strong>Departure Time:</strong></td>
                <td>{new Date(details.departure_time).toLocaleString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</td>
              </tr>
            )}
            {details.arrival_time && (
              <tr>
                <td><strong>Arrival Time:</strong></td>
                <td>{new Date(details.arrival_time).toLocaleString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</td>
              </tr>
            )}
            {details.cabin_class && <tr><td><strong>Class:</strong></td><td>{details.cabin_class}</td></tr>}
            {details.duration && <tr><td><strong>Duration:</strong></td><td>{details.duration}</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  const renderHotelDetails = (details) => {
    if (!details) return null;

    // Calculate number of nights
    const nights = details.check_out && details.check_in
      ? Math.ceil((new Date(details.check_out) - new Date(details.check_in)) / (1000 * 60 * 60 * 24))
      : details.nights || 0;

    // Calculate total guests
    const totalGuests = (parseInt(details.adults) || 0) + (parseInt(details.children) || 0);

    return (
      <div className="print-section">
        <h3 className="section-title">Hotel Reservation Details</h3>
        <table className="print-table">
          <tbody>
            {details.hotel_name && <tr><td><strong>Hotel Name:</strong></td><td>{details.hotel_name}</td></tr>}
            {details.location && <tr><td><strong>Location:</strong></td><td>{details.location}</td></tr>}
            {details.address && <tr><td><strong>Address:</strong></td><td>{details.address}</td></tr>}
            {details.city && <tr><td><strong>City:</strong></td><td>{details.city}</td></tr>}
            {details.room_type && <tr><td><strong>Room Type:</strong></td><td>{details.room_type}</td></tr>}
            {details.rooms && <tr><td><strong>Number of Rooms:</strong></td><td>{details.rooms}</td></tr>}
            {totalGuests > 0 && (
              <tr>
                <td><strong>Total Guests:</strong></td>
                <td>{totalGuests} ({details.adults || 0} Adult{(details.adults || 0) > 1 ? 's' : ''}{details.children > 0 ? `, ${details.children} Child${details.children > 1 ? 'ren' : ''}` : ''})</td>
              </tr>
            )}
            {(details.check_in_date || details.check_in) && (
              <tr>
                <td><strong>Check-in:</strong></td>
                <td>{new Date(details.check_in_date || details.check_in).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} - After 3:00 PM</td>
              </tr>
            )}
            {(details.check_out_date || details.check_out) && (
              <tr>
                <td><strong>Check-out:</strong></td>
                <td>{new Date(details.check_out_date || details.check_out).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} - Before 11:00 AM</td>
              </tr>
            )}
            {nights > 0 && <tr><td><strong>Number of Nights:</strong></td><td>{nights}</td></tr>}
            {details.price_per_night && <tr><td><strong>Price per Night:</strong></td><td>${parseFloat(details.price_per_night).toFixed(2)}</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCarDetails = (details) => {
    if (!details) return null;

    return (
      <div className="print-section">
        <h3 className="section-title">Car Rental Details</h3>
        <table className="print-table">
          <tbody>
            {details.car_model && <tr><td><strong>Vehicle:</strong></td><td>{details.car_model}</td></tr>}
            {details.car_company && <tr><td><strong>Rental Company:</strong></td><td>{details.car_company}</td></tr>}
            {details.pickupLocation && <tr><td><strong>Pick-up Location:</strong></td><td>{details.pickupLocation}</td></tr>}
            {details.returnLocation && <tr><td><strong>Drop-off Location:</strong></td><td>{details.returnLocation}</td></tr>}
            {details.pickupDate && details.pickupTime && (
              <tr>
                <td><strong>Pick-up:</strong></td>
                <td>{new Date(details.pickupDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} at {details.pickupTime}</td>
              </tr>
            )}
            {details.returnDate && details.returnTime && (
              <tr>
                <td><strong>Drop-off:</strong></td>
                <td>{new Date(details.returnDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} at {details.returnTime}</td>
              </tr>
            )}
            {details.rentalDays && <tr><td><strong>Rental Duration:</strong></td><td>{details.rentalDays} {details.rentalDays === 1 ? 'day' : 'days'}</td></tr>}
            {details.pricePerDay && <tr><td><strong>Daily Rate:</strong></td><td>${details.pricePerDay}</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="confirmation-page">
      <div className="confirmation-container">
        {/* Screen View */}
        <div className="screen-view">
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

                    // Display Hotel Details for hotel bookings
                    if (type === 'hotels' && bookingDetails) {
                      const nights = bookingDetails.check_out && bookingDetails.check_in
                        ? Math.ceil((new Date(bookingDetails.check_out) - new Date(bookingDetails.check_in)) / (1000 * 60 * 60 * 24))
                        : bookingDetails.nights || 0;
                      const totalGuests = (parseInt(bookingDetails.adults) || 0) + (parseInt(bookingDetails.children) || 0);

                      return (
                        <>
                          {bookingDetails.hotel_name && (
                            <div className="detail-row">
                              <span>Hotel Name:</span>
                              <span style={{ fontWeight: 'bold' }}>{bookingDetails.hotel_name}</span>
                            </div>
                          )}
                          {bookingDetails.location && (
                            <div className="detail-row">
                              <span>Location:</span>
                              <span>{bookingDetails.location}</span>
                            </div>
                          )}
                          {bookingDetails.city && (
                            <div className="detail-row">
                              <span>City:</span>
                              <span>{bookingDetails.city}</span>
                            </div>
                          )}
                          {bookingDetails.address && (
                            <div className="detail-row">
                              <span>Address:</span>
                              <span>{bookingDetails.address}</span>
                            </div>
                          )}
                          {bookingDetails.room_type && (
                            <div className="detail-row">
                              <span>Room Type:</span>
                              <span>{bookingDetails.room_type}</span>
                            </div>
                          )}
                          {bookingDetails.rooms && (
                            <div className="detail-row">
                              <span>Number of Rooms:</span>
                              <span>{bookingDetails.rooms}</span>
                            </div>
                          )}
                          {totalGuests > 0 && (
                            <div className="detail-row">
                              <span>Total Guests:</span>
                              <span>{totalGuests} ({bookingDetails.adults || 0} Adult{(bookingDetails.adults || 0) > 1 ? 's' : ''}{bookingDetails.children > 0 ? `, ${bookingDetails.children} Child${bookingDetails.children > 1 ? 'ren' : ''}` : ''})</span>
                            </div>
                          )}
                          {(bookingDetails.check_in_date || bookingDetails.check_in) && (
                            <div className="detail-row">
                              <span>Check-in:</span>
                              <span>{new Date(bookingDetails.check_in_date || bookingDetails.check_in).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })} - After 3:00 PM</span>
                            </div>
                          )}
                          {(bookingDetails.check_out_date || bookingDetails.check_out) && (
                            <div className="detail-row">
                              <span>Check-out:</span>
                              <span>{new Date(bookingDetails.check_out_date || bookingDetails.check_out).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })} - Before 11:00 AM</span>
                            </div>
                          )}
                          {nights > 0 && (
                            <div className="detail-row">
                              <span>Number of Nights:</span>
                              <span>{nights}</span>
                            </div>
                          )}
                          {bookingDetails.price_per_night && (
                            <div className="detail-row">
                              <span>Price per Night:</span>
                              <span>${parseFloat(bookingDetails.price_per_night).toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      );
                    }

                    const pricing = bookingDetails?.pricing;
                    const baseAmount = parseFloat(pricing?.base_amount) || (parseFloat(booking?.total_amount) / 1.1) || 0;
                    const taxAmount = parseFloat(pricing?.tax_amount) || (baseAmount * 0.1) || 0;
                    const totalAmount = parseFloat(pricing?.total_amount) || parseFloat(booking?.total_amount) || 0;

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
                    <span className={`status ${booking.status}`}>
                      {booking.status === 'confirmed' ? 'Confirmed' : booking.status === 'pending' ? 'Processing...' : booking.status}
                    </span>
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

        {/* Print View */}
        {booking && (
          <div ref={printRef} className="print-view">
            <div className="print-header">
              <div className="print-logo">
                <h1>KAYAK</h1>
                <p className="print-tagline">Search one and done</p>
              </div>
              <div className="print-title">
                <h2>BOOKING CONFIRMATION</h2>
                <p className="print-ref">Reference: {booking.booking_reference || booking.id}</p>
                <p className="print-date">
                  {booking?.created_at
                    ? new Date(booking.created_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                    : new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  }
                </p>
              </div>
            </div>

            {renderPrintDetails(booking, type)}

            <div className="print-footer">
              <div className="footer-section">
                <h4>Important Information</h4>
                <ul>
                  <li>Please arrive at least 2 hours before departure for international flights</li>
                  <li>Carry a valid photo ID and this confirmation</li>
                  <li>Check-in online to save time at the airport/counter</li>
                  <li>Review cancellation and modification policies</li>
                </ul>
              </div>
              <div className="footer-contact">
                <h4>Contact Us</h4>
                <p><FaPhone /> +1 (800) 123-4567</p>
                <p><FaEnvelope /> support@kayak.com</p>
                <p><FaGlobe /> www.kayak.com</p>
              </div>
              <div className="footer-legal">
                <p>Thank you for booking with KAYAK!</p>
                <p className="small-text">This is an electronic confirmation. Please retain for your records.</p>
                <p className="small-text">Booking ID: {booking.id} | Generated: {new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingConfirmationPage;

