// Bundle Card Component
import React from 'react';
import { FaPlane, FaHotel, FaStar, FaEye } from 'react-icons/fa';
import './BundleCard.css';

const BundleCard = ({ bundle, onBook, onTrack }) => {
    const {
        bundle_id,
        total_price,
        currency,
        fit_score,
        flight,
        hotel,
        why_this,
        what_to_watch,
    } = bundle;

    // Convert fit_score to percentage and color code
    const scorePercent = Math.round(fit_score * 100);
    const getScoreColor = (score) => {
        if (score >= 90) return '#10b981'; // green
        if (score >= 75) return '#3b82f6'; // blue
        if (score >= 60) return '#f59e0b'; // orange
        return '#6b7280'; // gray
    };

    return (
        <div className="bundle-card">
            <div className="bundle-card-header">
                <div className="bundle-score" style={{ background: getScoreColor(scorePercent) }}>
                    <FaStar size={12} />
                    <span>{scorePercent}%</span>
                </div>
                <div className="bundle-price">
                    <span className="price-amount">${total_price.toFixed(2)}</span>
                    <span className="price-currency">{currency}</span>
                </div>
            </div>

            <div className="bundle-details">
                {flight && (
                    <div className="bundle-section">
                        <div className="section-icon">
                            <FaPlane />
                        </div>
                        <div className="section-content">
                            <span className="section-label">Flight</span>
                            <span className="section-value">{flight.summary}</span>
                        </div>
                    </div>
                )}

                {hotel && (
                    <div className="bundle-section">
                        <div className="section-icon">
                            <Fa Hotel />
                        </div>
                        <div className="section-content">
                            <span className="section-label">Hotel</span>
                            <span className="section-value">{hotel.summary}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="bundle-explanation">
                <p className="why-this">{why_this}</p>
                {what_to_watch && (
                    <p className="what-to-watch">
                        <FaEye size={12} /> {what_to_watch}
                    </p>
                )}
            </div>

            <div className="bundle-actions">
                <button className="btn-track" onClick={onTrack}>
                    Track Deal
                </button>
                <button className="btn-book" onClick={onBook}>
                    Book Now
                </button>
            </div>
        </div>
    );
};

export default BundleCard;
