import React from 'react';
import { FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';
import './MissingLegBanner.css';

function MissingLegBanner({ missingLeg, onDateAdjust, departureDate, returnDate }) {
  if (!missingLeg) return null;

  const adjustDate = (days) => {
    if (missingLeg === 'outbound') {
      const newDate = new Date(departureDate);
      newDate.setDate(newDate.getDate() + days);
      onDateAdjust('departure_date', newDate.toISOString().split('T')[0]);
    } else if (missingLeg === 'return') {
      const newDate = new Date(returnDate);
      newDate.setDate(newDate.getDate() + days);
      onDateAdjust('return_date', newDate.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="missing-leg-banner" role="alert" aria-live="polite">
      <div className="banner-icon">
        <FaExclamationTriangle />
      </div>
      <div className="banner-content">
        <h3>No flights found for {missingLeg === 'outbound' ? 'outbound' : 'return'} leg</h3>
        <p>Try adjusting your dates to find available flights</p>
        <div className="banner-actions">
          <button 
            className="date-adjust-btn" 
            onClick={() => adjustDate(-2)}
            aria-label={`Adjust ${missingLeg} date by -2 days`}
          >
            <FaCalendarAlt /> -2 days
          </button>
          <button 
            className="date-adjust-btn" 
            onClick={() => adjustDate(-1)}
            aria-label={`Adjust ${missingLeg} date by -1 day`}
          >
            <FaCalendarAlt /> -1 day
          </button>
          <button 
            className="date-adjust-btn" 
            onClick={() => adjustDate(1)}
            aria-label={`Adjust ${missingLeg} date by +1 day`}
          >
            <FaCalendarAlt /> +1 day
          </button>
          <button 
            className="date-adjust-btn" 
            onClick={() => adjustDate(2)}
            aria-label={`Adjust ${missingLeg} date by +2 days`}
          >
            <FaCalendarAlt /> +2 days
          </button>
        </div>
      </div>
    </div>
  );
}

export default MissingLegBanner;

