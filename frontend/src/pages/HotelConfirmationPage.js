import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaHotel, FaPrint } from 'react-icons/fa';
import { bookingsAPI, hotelsAPI } from '../services/api';
import './HotelConfirmationPage.css';

function HotelConfirmationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await bookingsAPI.getDetails(id);
        // API returns { success: true, data: { ... } }
        const bookingData = response.data.data || response.data;

        let details = typeof bookingData.booking_details === 'string'
          ? JSON.parse(bookingData.booking_details)
          : bookingData.booking_details;

        // If hotel details are missing (name, etc) but we have an ID, fetch them
        if (details && details.hotel_id && !details.hotel_name) {
          try {
            const hotelResponse = await hotelsAPI.getDetails(details.hotel_id);
            const hotelInfo = hotelResponse.data.data || hotelResponse.data;

            // Merge hotel info into details
            details = {
              ...details,
              hotel_name: hotelInfo.hotel_name,
              address: hotelInfo.address,
              city: hotelInfo.city,
              state: hotelInfo.state,
              zip_code: hotelInfo.zip_code,
              location: `${hotelInfo.city}, ${hotelInfo.state}`
            };

            // Update the booking details in our local object
            bookingData.booking_details = details;
          } catch (hotelErr) {
            console.error('Failed to fetch fallback hotel details:', hotelErr);
          }
        }

        setBooking(bookingData);
      } catch (err) {
        console.error('Failed to load booking:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBooking();
    }
  }, [id]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return alert('Please allow popups to print confirmation.');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Booking Confirmation - ${booking.booking_reference}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ff6b35; padding-bottom: 20px; }
          .logo { color: #ff6b35; font-size: 24px; font-weight: bold; }
          .title { font-size: 20px; margin-top: 10px; }
          .subtitle { color: #666; font-size: 14px; }
          .details-box { background: #f9f9f9; border: 1px solid #eee; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
          .row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #555; }
          .value { text-align: right; font-weight: 500; }
          .total-row { font-size: 18px; font-weight: bold; color: #2c3e50; border-top: 2px solid #ddd; padding-top: 15px; margin-top: 10px; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 40px; }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">TRIPWEAVE</div>
          <div class="title">Booking Confirmed</div>
          <div class="subtitle">Reference: ${booking.booking_reference}</div>
        </div>

        <div class="details-box">
          <h3>Hotel Details</h3>
          <div class="row"><span class="label">Hotel</span><span class="value">${bookingDetails?.hotel_name || 'N/A'}</span></div>
          <div class="row"><span class="label">Address</span><span class="value">${bookingDetails?.address || ''}, ${bookingDetails?.city || ''}</span></div>
          <div class="row"><span class="label">Check-in</span><span class="value">${formatDate(bookingDetails?.check_in)}</span></div>
          <div class="row"><span class="label">Check-out</span><span class="value">${formatDate(bookingDetails?.check_out)}</span></div>
          
          <h3>Guest Details</h3>
          <div class="row"><span class="label">Guest</span><span class="value">${guestDetails?.firstName} ${guestDetails?.lastName}</span></div>
          <div class="row"><span class="label">Email</span><span class="value">${guestDetails?.email}</span></div>
          
          <div class="row total-row"><span class="label">Total Paid</span><span class="value">$${(Number(priceBreakdown?.total || booking.total_amount) || 0).toFixed(2)}</span></div>
        </div>

        <div class="footer">
          <p>Thank you for booking with TripWeave.</p>
          <p>${new Date().toLocaleString()}</p>
        </div>
        <script>
          window.onload = function() { window.print(); window.onafterprint = function(){ window.close(); } };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="confirmation-loading">
        <div className="loading-spinner"></div>
        <p>Loading your confirmation...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="confirmation-error">
        <h2>Booking Not Found</h2>
        <p>We couldn't find your booking details.</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          Return to Home
        </button>
      </div>
    );
  }

  const bookingDetails = typeof booking.booking_details === 'string'
    ? JSON.parse(booking.booking_details)
    : booking.booking_details;

  const priceBreakdown = bookingDetails?.price_breakdown || {};
  const guestDetails = bookingDetails?.guest_details || {};

  return (
    <div className="hotel-confirmation-page">
      <div className="confirmation-container">
        {/* Success Header with Green Checkmark */}
        <div className="confirmation-success">
          <div className="success-icon-wrapper">
            <FaCheckCircle className="success-icon" />
          </div>
          <h1 className="confirmation-title">Booking Confirmed!</h1>
          <p className="confirmation-subtitle">
            Thank you for your booking. Your confirmation details are below.
          </p>
        </div>

        {/* Booking Reference Section */}
        <div className="booking-reference-section">
          <h3 className="section-label">Booking Reference</h3>
          <p className="booking-reference">{booking.booking_reference}</p>
        </div>

        {/* Flight Icon Section */}
        <div className="booking-icon-section">
          <FaHotel className="booking-type-icon" />
        </div>

        {/* Booking Details Section */}
        <div className="booking-details-section">
          <h3 className="section-label">Booking Details</h3>

          {/* Hotel Information */}
          <div className="detail-row">
            <span className="detail-label">Hotel:</span>
            <span className="detail-value">{bookingDetails?.hotel_name || 'N/A'}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Location:</span>
            <span className="detail-value">
              {bookingDetails?.city}, {bookingDetails?.state}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Address:</span>
            <span className="detail-value">{bookingDetails?.address || 'N/A'}</span>
          </div>

          {/* Check-in/Check-out */}
          <div className="detail-row">
            <span className="detail-label">Check-in:</span>
            <span className="detail-value">{formatDate(bookingDetails?.check_in)}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Check-out:</span>
            <span className="detail-value">{formatDate(bookingDetails?.check_out)}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Nights:</span>
            <span className="detail-value">{bookingDetails?.nights} night{bookingDetails?.nights > 1 ? 's' : ''}</span>
          </div>

          {/* Rooms and Guests */}
          <div className="detail-row">
            <span className="detail-label">Rooms:</span>
            <span className="detail-value">{bookingDetails?.rooms} room{bookingDetails?.rooms > 1 ? 's' : ''}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Guests:</span>
            <span className="detail-value">
              {bookingDetails?.adults} adult{bookingDetails?.adults > 1 ? 's' : ''}
              {bookingDetails?.children > 0 && `, ${bookingDetails.children} child${bookingDetails.children > 1 ? 'ren' : ''}`}
            </span>
          </div>

          {/* Guest Information */}
          <div className="detail-row">
            <span className="detail-label">Guest Name:</span>
            <span className="detail-value">
              {guestDetails?.firstName} {guestDetails?.lastName}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Email:</span>
            <span className="detail-value">{guestDetails?.email || 'N/A'}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Phone:</span>
            <span className="detail-value">{guestDetails?.phone || 'N/A'}</span>
          </div>

          {/* Type */}
          <div className="detail-row">
            <span className="detail-label">Type:</span>
            <span className="detail-value">hotel</span>
          </div>

          {/* Total Amount */}
          <div className="detail-row">
            <span className="detail-label">Total Amount:</span>
            <span className="detail-value amount">${priceBreakdown?.total?.toFixed(2) || booking.total_amount}</span>
          </div>

          {/* Booking Date */}
          <div className="detail-row">
            <span className="detail-label">Booking Date:</span>
            <span className="detail-value">
              {booking?.booking_date ? new Date(booking.booking_date).toLocaleDateString() :
                booking?.created_at ? new Date(booking.created_at).toLocaleDateString() : '-'}
            </span>
          </div>

          {/* Status */}
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className={`detail-value status-badge ${booking.status}`}>{booking.status}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="confirmation-actions">
          <button onClick={handlePrint} className="btn-print">
            <FaPrint /> Print Confirmation
          </button>
          <button onClick={() => navigate('/profile?tab=bookings')} className="btn-bookings">
            View My Bookings
          </button>
          <button onClick={() => navigate('/')} className="btn-continue">
            Continue Searching
          </button>
        </div>
      </div>
    </div>
  );
}

export default HotelConfirmationPage;
