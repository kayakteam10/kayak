import React, { useMemo } from 'react';
import './PriceMatrix.css';

const PriceMatrix = ({ results, onSelectAirline, selectedAirline }) => {
    const matrixData = useMemo(() => {
        if (!results || results.length === 0) return [];

        const airlineGroups = {};

        results.forEach(flight => {
            // Handle multi-city, roundtrip, and one-way structures
            let airline = flight.airline;
            let price = parseFloat(flight.price || 0);
            let duration = 0;

            if (flight.is_multicity || flight.legs) {
                // For multi-city, use the first leg's airline or a "Multiple Airlines" label if mixed
                // But for simplicity, let's use the first leg's airline
                airline = flight.legs?.[0]?.airline || 'Multiple Airlines';
                price = parseFloat(flight.total_price || 0);
                // Calculate total duration
                duration = (flight.legs || []).reduce((sum, leg) => sum + (parseFloat(leg.duration) || 0), 0);
            } else if (flight.is_roundtrip || flight.return_flight) {
                airline = flight.airline;
                price = parseFloat(flight.total_price || (parseFloat(flight.price || 0) + parseFloat(flight.return_flight?.price || 0)));
                // Sum outbound and return duration
                duration = (parseFloat(flight.duration) || 0) + (parseFloat(flight.return_flight?.duration) || 0);
            } else {
                // One-way
                duration = parseFloat(flight.duration) || 0;
            }

            if (!airlineGroups[airline]) {
                airlineGroups[airline] = {
                    airline,
                    minPrice: price,
                    minDuration: duration,
                    count: 0
                };
            } else {
                airlineGroups[airline].minPrice = Math.min(airlineGroups[airline].minPrice, price);
                if (duration > 0) {
                    // If we have duration data, track the fastest
                    airlineGroups[airline].minDuration = airlineGroups[airline].minDuration === 0
                        ? duration
                        : Math.min(airlineGroups[airline].minDuration, duration);
                }
                airlineGroups[airline].count++;
            }
        });

        // Convert to array and sort by price
        const sorted = Object.values(airlineGroups).sort((a, b) => a.minPrice - b.minPrice);

        // Tag the cheapest and fastest
        if (sorted.length > 0) {
            sorted[0].isCheapest = true;

            // Find fastest
            let fastestIdx = -1;
            let minDur = Number.MAX_VALUE;
            sorted.forEach((item, idx) => {
                if (item.minDuration > 0 && item.minDuration < minDur) {
                    minDur = item.minDuration;
                    fastestIdx = idx;
                }
            });
            if (fastestIdx !== -1) {
                sorted[fastestIdx].isFastest = true;
            }
        }

        return sorted;
    }, [results]);

    if (matrixData.length === 0) return null;

    return (
        <div className="price-matrix-container">
            <div className="price-matrix-header">
                <h3>Compare Airlines</h3>
                {selectedAirline && (
                    <button
                        className="clear-filters-link"
                        style={{ fontSize: '0.9rem', padding: 0 }}
                        onClick={() => onSelectAirline('')}
                    >
                        Show all
                    </button>
                )}
            </div>
            <div className="price-matrix-scroll">
                {matrixData.map((item) => (
                    <div
                        key={item.airline}
                        className={`matrix-card ${selectedAirline === item.airline ? 'active' : ''}`}
                        onClick={() => onSelectAirline(item.airline === selectedAirline ? '' : item.airline)}
                    >
                        {item.isCheapest && <div className="matrix-badge">Cheapest</div>}
                        {!item.isCheapest && item.isFastest && <div className="matrix-badge fastest">Fastest</div>}

                        <div className="matrix-airline">{item.airline}</div>
                        <div className="matrix-price">
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginRight: '4px' }}>from</span>
                            ${item.minPrice.toFixed(0)}
                        </div>
                        {item.minDuration > 0 && (
                            <div className="matrix-duration">
                                {Math.floor(item.minDuration)}h {Math.round((item.minDuration % 1) * 60)}m
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PriceMatrix;
