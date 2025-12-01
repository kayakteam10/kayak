import React, { useState, useEffect } from 'react';
import { flightsAPI } from '../services/api';

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
        if (!seat) return <div className="seat-spacer" key="spacer"></div>;

        const isSelected = selectedSeats.includes(seat.seat_number);
        const isTaken = !seat.is_available;
        const isPremium = seat.seat_type === 'premium';

        let className = 'seat-button';
        if (isSelected) className += ' selected';
        else if (isTaken) className += ' taken';
        else if (isPremium) className += ' premium';

        return (
            <button
                key={seat.seat_number}
                className={className}
                onClick={() => handleSeatClick(seat.seat_number, seat.is_available, isTaken, seat.price_modifier)}
                disabled={isTaken}
                title={`${seat.seat_number}${isPremium ? ' (Premium +$' + seat.price_modifier + ')' : ''}`}
            >
                {seat.seat_number.match(/[A-Z]+/)[0]}
            </button>
        );
    };

    if (loading) return <div className="seat-map-container">Loading seats...</div>;

    const rowsData = groupSeatsByRow();
    const sortedRows = Object.keys(rowsData).sort((a, b) => parseInt(a) - parseInt(b));

    return (
        <div className="seat-map-container">
            <div className="seat-map-header">
                <h3>Select Your Seat(s)</h3>
                <p className="seat-map-info">
                    Please select {passengerCount} seat{passengerCount > 1 ? 's' : ''} for your flight
                </p>
            </div>

            {error && <div className="seat-error">{error}</div>}

            <div className="seat-legend">
                <div className="legend-item">
                    <div className="legend-box available"></div>
                    <span>Available</span>
                </div>
                <div className="legend-item">
                    <div className="legend-box selected"></div>
                    <span>Selected</span>
                </div>
                <div className="legend-item">
                    <div className="legend-box taken"></div>
                    <span>Taken</span>
                </div>
                <div className="legend-item">
                    <div className="legend-box premium"></div>
                    <span>Premium (+$)</span>
                </div>
            </div>

            <div className="seat-grid">
                {sortedRows.map(rowNum => {
                    const rowSeats = rowsData[rowNum].sort((a, b) =>
                        a.seat_number.localeCompare(b.seat_number)
                    );

                    return (
                        <div key={rowNum} className="seat-row">
                            <div className="row-number">{rowNum}</div>
                            <div className="seats">
                                {rowSeats.slice(0, 3).map(seat => renderSeat(seat))}
                                <div className="seat-spacer"></div>
                                {rowSeats.slice(3, 6).map(seat => renderSeat(seat))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedSeats.length > 0 && (
                <div className="seat-summary">
                    <h4>Selected Seats</h4>
                    <div className="selected-seats-list">
                        {selectedSeats.map(seat => (
                            <span key={seat} className="selected-seat-tag">{seat}</span>
                        ))}
                    </div>
                    {getSeatPrice() > 0 && (
                        <div className="seat-price-info">
                            <span className="seat-price-label">Seat Selection Fee:</span>
                            <span className="seat-price-value">${getSeatPrice().toFixed(2)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SeatMap;
