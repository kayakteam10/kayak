import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { flightsAPI } from '../services/api';
import { FaPlane, FaClock, FaUsers, FaMapMarkerAlt, FaArrowRight, FaCalendar } from 'react-icons/fa';
import './FlightDetailsPage.css';

function FlightDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [flight, setFlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFlightDetails = async () => {
      try {
        const response = await flightsAPI.getDetails(id);
        setFlight(response.data);
      } catch (err) {
        setError('Failed to load flight details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlightDetails();
  }, [id]);

  const handleBook = () => {
    // Extract passenger info from URL if available
    const searchParams = new URLSearchParams(window.location.search);
    const passengers = searchParams.get('passengers') || '1';
    const adults = searchParams.get('adults') || passengers;
    const children = searchParams.get('children') || '0';
    const infants = searchParams.get('infants') || '0';

    navigate(`/booking/flights/${id}?passengers=${passengers}&adults=${adults}&children=${children}&infants=${infants}`);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flight-details-page">
        <div className="flight-details-container">
          <div className="loading">Loading flight details...</div>
        </div>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="flight-details-page">
        <div className="flight-details-container">
          <div className="error-state">
            <p>{error || 'Flight not found'}</p>
            <button onClick={handleBack} className="btn-primary">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isRoundtrip = flight.is_roundtrip || flight.return_flight;
  const returnFlight = flight.return_flight;

  // Calculate display price and ensure it's always a number
  let displayPrice;
  if (isRoundtrip) {
    displayPrice = flight.total_price || (parseFloat(flight.price || 0) + parseFloat(returnFlight?.price || 0));
  } else {
    displayPrice = flight.price || 0;
  }
  // Ensure displayPrice is always a number
  displayPrice = parseFloat(displayPrice) || 0;

  return (
    <div className="flight-details-page">
      <div className="flight-details-container">
        <button onClick={handleBack} className="back-btn">
          ← Back to Search Results
        </button>

        <div className="flight-details-header">
          <div className="flight-header-icon">
            <FaPlane />
          </div>
          <div className="flight-header-info">
            <h1>{flight.airline} {flight.flight_number}</h1>
            <p className="flight-route">
              {flight.departure_city} → {flight.arrival_city}
              {isRoundtrip && returnFlight && ` → ${returnFlight.departure_city}`}
            </p>
            {isRoundtrip && (
              <span className="roundtrip-badge">Roundtrip</span>
            )}
          </div>
        </div>

        <div className="flight-details-content">
          <div className="flight-details-main">
            {/* Outbound Flight Details */}
            <div className="flight-section">
              <h2 className="section-title">
                {isRoundtrip ? 'Outbound Flight' : 'Flight Details'}
              </h2>
              <div className="flight-info-card">
                <div className="flight-info-row">
                  <div className="info-label">
                    <FaMapMarkerAlt className="info-icon" />
                    <span>Departure</span>
                  </div>
                  <div className="info-value">
                    <strong>{flight.departure_city}</strong>
                    <span className="info-time">{flight.departure_time ? new Date(flight.departure_time).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
                <div className="flight-info-row">
                  <div className="info-label">
                    <FaMapMarkerAlt className="info-icon" />
                    <span>Arrival</span>
                  </div>
                  <div className="info-value">
                    <strong>{flight.arrival_city}</strong>
                    <span className="info-time">{flight.arrival_time ? new Date(flight.arrival_time).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
                <div className="flight-info-row">
                  <div className="info-label">
                    <FaClock className="info-icon" />
                    <span>Duration</span>
                  </div>
                  <div className="info-value">
                    {flight.duration ? `${flight.duration} hours` : 'N/A'}
                  </div>
                </div>
                <div className="flight-info-row">
                  <div className="info-label">
                    <FaUsers className="info-icon" />
                    <span>Available Seats</span>
                  </div>
                  <div className="info-value">
                    {flight.available_seats} / {flight.total_seats}
                  </div>
                </div>
              </div>
            </div>

            {/* Return Flight Details (if roundtrip) */}
            {isRoundtrip && returnFlight && (
              <div className="flight-section">
                <h2 className="section-title">Return Flight</h2>
                <div className="flight-info-card">
                  <div className="flight-info-row">
                    <div className="info-label">
                      <FaMapMarkerAlt className="info-icon" />
                      <span>Departure</span>
                    </div>
                    <div className="info-value">
                      <strong>{returnFlight.departure_city}</strong>
                      <span className="info-time">{returnFlight.departure_time ? new Date(returnFlight.departure_time).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flight-info-row">
                    <div className="info-label">
                      <FaMapMarkerAlt className="info-icon" />
                      <span>Arrival</span>
                    </div>
                    <div className="info-value">
                      <strong>{returnFlight.arrival_city}</strong>
                      <span className="info-time">{returnFlight.arrival_time ? new Date(returnFlight.arrival_time).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flight-info-row">
                    <div className="info-label">
                      <FaClock className="info-icon" />
                      <span>Duration</span>
                    </div>
                    <div className="info-value">
                      {returnFlight.duration ? `${returnFlight.duration} hours` : 'N/A'}
                    </div>
                  </div>
                  <div className="flight-info-row">
                    <div className="info-label">
                      <FaUsers className="info-icon" />
                      <span>Available Seats</span>
                    </div>
                    <div className="info-value">
                      {returnFlight.available_seats} / {returnFlight.total_seats}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div className="flight-section">
              <h2 className="section-title">Additional Information</h2>
              <div className="flight-info-card">
                <div className="flight-info-row">
                  <div className="info-label">
                    <span>Flight Number</span>
                  </div>
                  <div className="info-value">
                    {flight.flight_number}
                  </div>
                </div>
                <div className="flight-info-row">
                  <div className="info-label">
                    <span>Airline</span>
                  </div>
                  <div className="info-value">
                    {flight.airline}
                  </div>
                </div>
                {flight.created_at && (
                  <div className="flight-info-row">
                    <div className="info-label">
                      <FaCalendar className="info-icon" />
                      <span>Listed Date</span>
                    </div>
                    <div className="info-value">
                      {new Date(flight.created_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="flight-booking-sidebar">
            <div className="booking-card">
              <h3>Price Summary</h3>
              <div className="price-breakdown">
                <div className="price-row">
                  <span>{isRoundtrip ? 'Roundtrip Price' : 'One-way Price'}</span>
                  <span>${displayPrice.toFixed(2)}</span>
                </div>
                {isRoundtrip && (
                  <>
                    <div className="price-row">
                      <span>Outbound</span>
                      <span>${(parseFloat(flight.price) || 0).toFixed(2)}</span>
                    </div>
                    {returnFlight && (
                      <div className="price-row">
                        <span>Return</span>
                        <span>${(parseFloat(returnFlight.price) || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="price-row">
                  <span>Taxes & Fees</span>
                  <span>${(displayPrice * 0.1).toFixed(2)}</span>
                </div>
                <div className="price-row total">
                  <span>Total</span>
                  <span>${(displayPrice * 1.1).toFixed(2)}</span>
                </div>
              </div>
              <button onClick={handleBook} className="book-now-btn">
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlightDetailsPage;

