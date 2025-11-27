import React from 'react';
import { FaTimes, FaSuitcase, FaInfoCircle } from 'react-icons/fa';
import './FlightDetailsSlideOver.css';

function FlightDetailsSlideOver({ flight, isOpen, onClose }) {
  if (!isOpen || !flight) return null;

  const isRoundtrip = flight.is_roundtrip || flight.return_flight;
  const isMultiCity = flight.is_multicity || (Array.isArray(flight.legs) && flight.legs.length > 0);
  const returnFlight = flight.return_flight;

  return (
    <div className="slide-over-overlay" onClick={onClose}>
      <div className="slide-over-content" onClick={(e) => e.stopPropagation()}>
        <div className="slide-over-header">
          <h2>Flight Details</h2>
          <button
            className="slide-over-close"
            onClick={onClose}
            aria-label="Close details"
          >
            <FaTimes />
          </button>
        </div>

        <div className="slide-over-body">
          {/* Multi-city: render each leg */}
          {isMultiCity ? (
            <div className="flight-detail-section">
              <h3>Multi-city Itinerary</h3>
              {(flight.legs || []).map((leg, idx) => (
                <div key={leg.id || idx} className="flight-detail-card" style={{ marginBottom: 12 }}>
                  <div className="flight-detail-row">
                    <span className="detail-label">Leg {idx + 1} Airline:</span>
                    <span className="detail-value">{leg.airline} {leg.flight_number}</span>
                  </div>
                  <div className="flight-detail-row">
                    <span className="detail-label">Route:</span>
                    <span className="detail-value">{leg.departure_city} → {leg.arrival_city}</span>
                  </div>
                  <div className="flight-detail-row">
                    <span className="detail-label">Departure:</span>
                    <span className="detail-value">
                      {leg.departure_time ? new Date(leg.departure_time).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flight-detail-row">
                    <span className="detail-label">Arrival:</span>
                    <span className="detail-value">
                      {leg.arrival_time ? new Date(leg.arrival_time).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flight-detail-row">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">{leg.duration || 'N/A'} hours</span>
                  </div>
                  <div className="flight-detail-row">
                    <span className="detail-label">Stops:</span>
                    <span className="detail-value">Non-stop</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Outbound Flight */}
              <div className="flight-detail-section">
                <h3>Outbound Flight</h3>
                <div className="flight-detail-card">
                  <div className="flight-detail-row">
                    <span className="detail-label">Airline:</span>
                    <span className="detail-value">{flight.airline} {flight.flight_number}</span>
                  </div>
                  <div className="flight-detail-row">
                    <span className="detail-label">Route:</span>
                    <span className="detail-value">{flight.departure_city} → {flight.arrival_city}</span>
                  </div>
                  <div className="flight-detail-row">
                    <span className="detail-label">Departure:</span>
                    <span className="detail-value">
                      {flight.departure_time ? new Date(flight.departure_time).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flight-detail-row">
                    <span className="detail-label">Arrival:</span>
                    <span className="detail-value">
                      {flight.arrival_time ? new Date(flight.arrival_time).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flight-detail-row">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">{flight.duration || 'N/A'} hours</span>
                  </div>
                  <div className="flight-detail-row">
                    <span className="detail-label">Stops:</span>
                    <span className="detail-value">Non-stop</span>
                  </div>
                </div>
              </div>

              {/* Return Flight */}
              {isRoundtrip && returnFlight && (
                <div className="flight-detail-section">
                  <h3>Return Flight</h3>
                  <div className="flight-detail-card">
                    <div className="flight-detail-row">
                      <span className="detail-label">Airline:</span>
                      <span className="detail-value">{returnFlight.airline} {returnFlight.flight_number}</span>
                    </div>
                    <div className="flight-detail-row">
                      <span className="detail-label">Route:</span>
                      <span className="detail-value">{returnFlight.departure_city} → {returnFlight.arrival_city}</span>
                    </div>
                    <div className="flight-detail-row">
                      <span className="detail-label">Departure:</span>
                      <span className="detail-value">
                        {returnFlight.departure_time ? new Date(returnFlight.departure_time).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flight-detail-row">
                      <span className="detail-label">Arrival:</span>
                      <span className="detail-value">
                        {returnFlight.arrival_time ? new Date(returnFlight.arrival_time).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flight-detail-row">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">{returnFlight.duration || 'N/A'} hours</span>
                    </div>
                    <div className="flight-detail-row">
                      <span className="detail-label">Stops:</span>
                      <span className="detail-value">Non-stop</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Fare Rules */}
          <div className="flight-detail-section">
            <h3>
              <FaInfoCircle className="section-icon" />
              Fare Rules
            </h3>
            <div className="fare-rules">
              <div className="fare-rule-item">
                <strong>Changes:</strong> Changes allowed with fee. Contact airline for details.
              </div>
              <div className="fare-rule-item">
                <strong>Cancellation:</strong> Cancellation allowed with fee. Refund processed within 7-10 business days.
              </div>
              <div className="fare-rule-item">
                <strong>Baggage:</strong> See baggage allowance below.
              </div>
            </div>
          </div>

          {/* Baggage Allowance */}
          <div className="flight-detail-section">
            <h3>
              <FaSuitcase className="section-icon" />
              Baggage Allowance
            </h3>
            <div className="baggage-allowance">
              <div className="baggage-item">
                <strong>Carry-on:</strong> {flight.carry_on_fee > 0 ? `$${flight.carry_on_fee}` : 'Included'}
              </div>
              <div className="baggage-item">
                <strong>Checked Baggage:</strong> {flight.checked_bag_fee > 0 ? `$${flight.checked_bag_fee}` : 'Included'}
              </div>
              <div className="baggage-item">
                <strong>Allowance:</strong> {flight.baggage_allowance || '1 Carry-on included'}
              </div>
              <div className="baggage-item">
                <strong>Overweight/Oversized:</strong> Additional fees apply. Contact airline for details.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlightDetailsSlideOver;

