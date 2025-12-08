import React, { useState, useEffect } from 'react';
import { flightsAPI } from '../services/api';
import './SeatMap.css';

const SeatMap = ({ flightId, passengerCount, onSeatsSelected, initialSeats }) => {
    const [seats, setSeats] = useState([]);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSeats();
    }, [flightId]);

    const fetchSeats = async () => {
        try {
            setLoading(true);
            const response = await flightsAPI.getSeats(flightId);
            // Backend returns { success: true, data: { allSeats: [...], ... } }
            // Axios response structure: response.data -> { success: true, data: { ... } }
            const seatData = response.data.data || response.data;
            setSeats(seatData.allSeats || seatData.seats || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching seats:', err);
            setError('Failed to load seats');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialSeats && initialSeats.length > 0) {
            // Handle both array of strings and array of objects
            const seatNumbers = initialSeats.map(s => typeof s === 'string' ? s : s.seatNumber);
            setSelectedSeats(seatNumbers);
        }
    }, [initialSeats]);

    const handleSeatClick = (seatNumber, isAvailable, isTaken, priceModifier) => {
        if (isTaken) return;

        let newSelected;
        if (selectedSeats.includes(seatNumber)) {
            // Deselect
            newSelected = selectedSeats.filter(s => s !== seatNumber);
        } else {
            // Select
            if (selectedSeats.length >= passengerCount) {
                setError(`You can only select ${passengerCount} seat(s)`);
                return;
            }
            newSelected = [...selectedSeats, seatNumber];
        }

        setSelectedSeats(newSelected);
        setError('');

        // Calculate total price and create seat objects
        const selectedSeatObjects = seats
            .filter(seat => newSelected.includes(seat.seat_number))
            .map(seat => ({
                seatNumber: seat.seat_number,
                price: parseFloat(seat.price_modifier || 0),
                type: seat.seat_type
            }));

        const newPrice = selectedSeatObjects.reduce((sum, seat) => sum + seat.price, 0);

        onSeatsSelected(selectedSeatObjects, newPrice);
    };

    const getSeatPrice = () => {
        return seats
            .filter(seat => selectedSeats.includes(seat.seat_number))
            .reduce((sum, seat) => sum + parseFloat(seat.price_modifier || 0), 0);
    };

    const groupSeatsByRow = () => {
        const rows = {};
        seats.forEach(seat => {
            const row = seat.seat_number.match(/\d+/)[0];
            if (!rows[row]) rows[row] = [];
            rows[row].push(seat);
        });
        return rows;
    };

    const renderSeat = (seat) => {
        if (!seat) return <div className="seat-placeholder" key={`spacer-${Math.random()}`}></div>;

        const isSelected = selectedSeats.includes(seat.seat_number);
        const isTaken = !seat.is_available;
        const isPremium = seat.seat_type === 'premium';
        const isBusiness = seat.seat_type === 'business';
        const isFirst = seat.seat_type === 'first';

        let seatClassName = 'modern-seat';
        if (isSelected) seatClassName += ' selected-modern';
        else if (isTaken) seatClassName += ' occupied-modern';
        else if (isFirst || isBusiness || isPremium) seatClassName += ' premium-modern';

        const priceText = seat.price_modifier > 0 ? `+$${seat.price_modifier}` : '';
        
        return (
            <button
                key={seat.seat_number}
                className={seatClassName}
                onClick={() => !isTaken && handleSeatClick(seat.seat_number, seat.is_available, isTaken, seat.price_modifier)}
                disabled={isTaken}
                title={`Seat ${seat.seat_number}${priceText ? ' ' + priceText : ''}${isTaken ? ' - Unavailable' : ''}`}
                aria-label={`Seat ${seat.seat_number}`}
            >
                {isSelected && (
                    <svg className="check-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                )}
                {!isSelected && !isTaken && priceText && (
                    <span className="seat-price-tag">{priceText}</span>
                )}
            </button>
        );
    };

    if (loading) return <div className="seat-map-container">Loading seats...</div>;

    const rowsData = groupSeatsByRow();
    const sortedRows = Object.keys(rowsData).sort((a, b) => parseInt(a) - parseInt(b));

    return (
        <div className="seat-map-wrapper">
            <div className="seat-map-header-modern">
                <div className="header-content">
                    <h3 className="seat-title">Choose your seats</h3>
                    <p className="seat-subtitle">
                        Select {passengerCount} seat{passengerCount > 1 ? 's' : ''} for your flight
                    </p>
                </div>
                <div className="seat-selection-count">
                    <span className="count-badge">{selectedSeats.length}/{passengerCount}</span>
                    <span className="count-text">Selected</span>
                </div>
            </div>

            {error && <div className="seat-error-modern">{error}</div>}

            <div className="seat-legend-modern">
                <div className="legend-item-modern">
                    <div className="seat-icon-legend available"></div>
                    <span>Available</span>
                </div>
                <div className="legend-item-modern">
                    <div className="seat-icon-legend selected"></div>
                    <span>Your seat</span>
                </div>
                <div className="legend-item-modern">
                    <div className="seat-icon-legend occupied"></div>
                    <span>Occupied</span>
                </div>
                <div className="legend-item-modern premium">
                    <div className="seat-icon-legend premium"></div>
                    <span>Extra legroom (+fee)</span>
                </div>
            </div>

            <div className="airplane-container">
                <div className="airplane-nose">
                    <svg viewBox="0 0 100 40" className="nose-svg">
                        <path d="M 0 40 Q 50 0 100 40" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2"/>
                    </svg>
                </div>

                <div className="cabin-section">
                    <div className="column-headers">
                        <div className="column-group">
                            <span>A</span>
                            <span>B</span>
                            <span>C</span>
                        </div>
                        <div className="aisle-spacer"></div>
                        <div className="column-group">
                            <span>D</span>
                            <span>E</span>
                            <span>F</span>
                        </div>
                    </div>

                    <div className="seats-grid">
                        {sortedRows.map(rowNum => {
                            const rowSeats = rowsData[rowNum].sort((a, b) =>
                                a.seat_number.localeCompare(b.seat_number)
                            );

                            // Check if row has premium seats
                            const hasFirstClass = rowSeats.some(s => s.seat_type === 'first');
                            const hasBusiness = rowSeats.some(s => s.seat_type === 'business');
                            const hasPremium = rowSeats.some(s => s.seat_type === 'premium');

                            return (
                                <div key={rowNum} className="seat-row-modern">
                                    <span className="row-number">{rowNum}</span>
                                    <div className="seats-container">
                                        <div className="seat-group-left">
                                            {rowSeats.slice(0, 3).map(seat => renderSeat(seat))}
                                        </div>
                                        <div className="aisle"></div>
                                        <div className="seat-group-right">
                                            {rowSeats.slice(3, 6).map(seat => renderSeat(seat))}
                                        </div>
                                    </div>
                                    <span className="row-number">{rowNum}</span>
                                    {(hasFirstClass || hasBusiness || hasPremium) && (
                                        <div className="row-badge">
                                            {hasFirstClass && '1st'}
                                            {hasBusiness && 'Business'}
                                            {hasPremium && 'Premium'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="airplane-tail">
                    <div className="wing wing-left"></div>
                    <div className="wing wing-right"></div>
                </div>
            </div>

            {selectedSeats.length > 0 && (
                <div className="seat-summary-modern">
                    <div className="summary-header">
                        <h4>Your Selection</h4>
                        <button 
                            className="clear-all-btn"
                            onClick={() => {
                                setSelectedSeats([]);
                                onSeatsSelected([], 0);
                            }}
                        >
                            Clear all
                        </button>
                    </div>
                    <div className="selected-seats-tags">
                        {selectedSeats.map(seatNum => {
                            const seat = seats.find(s => s.seat_number === seatNum);
                            return (
                                <div key={seatNum} className="seat-tag-modern">
                                    <span className="seat-tag-number">{seatNum}</span>
                                    {seat && seat.price_modifier > 0 && (
                                        <span className="seat-tag-price">+${seat.price_modifier}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {getSeatPrice() > 0 && (
                        <div className="total-price-section">
                            <span className="total-label">Seat selection fee</span>
                            <span className="total-amount">${getSeatPrice().toFixed(2)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SeatMap;
