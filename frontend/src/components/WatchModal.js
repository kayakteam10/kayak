// Watch Modal Component
import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { createWatch } from '../services/aiApi';
import './WatchModal.css';

const WatchModal = ({ isOpen, onClose, bundleId, onSuccess }) => {
    const [maxPrice, setMaxPrice] = useState('');
    const [minRoomsLeft, setMinRoomsLeft] = useState('');
    const [minSeatsLeft, setMinSeatsLeft] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const watchData = {
                bundle_id: bundleId,
                max_price: maxPrice ? parseFloat(maxPrice) : null,
                min_rooms_left: minRoomsLeft ? parseInt(minRoomsLeft) : null,
                min_seats_left: minSeatsLeft ? parseInt(minSeatsLeft) : null,
            };

            await createWatch(watchData);

            if (onSuccess) onSuccess();
            onClose();

            // Reset form
            setMaxPrice('');
            setMinRoomsLeft('');
            setMinSeatsLeft('');
        } catch (err) {
            console.error('Failed to create watch:', err);
            setError('Failed to create watch. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="watch-modal-overlay" onClick={onClose}>
            <div className="watch-modal" onClick={(e) => e.stopPropagation()}>
                <div className="watch-modal-header">
                    <h3>Track this Deal</h3>
                    <button className="watch-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="watch-modal-content">
                        <p className="watch-modal-description">
                            Get notified when this deal meets your criteria:
                        </p>

                        <div className="form-group">
                            <label htmlFor="maxPrice">Alert if price drops below:</label>
                            <div className="input-wrapper">
                                <span className="input-prefix">$</span>
                                <input
                                    id="maxPrice"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    placeholder="e.g., 850"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="minRoomsLeft">Alert if rooms drop to:</label>
                            <input
                                id="minRoomsLeft"
                                type="number"
                                min="1"
                                value={minRoomsLeft}
                                onChange={(e) => setMinRoomsLeft(e.target.value)}
                                placeholder="e.g., 5"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="minSeatsLeft">Alert if seats drop to:</label>
                            <input
                                id="minSeatsLeft"
                                type="number"
                                min="1"
                                value={minSeatsLeft}
                                onChange={(e) => setMinSeatsLeft(e.target.value)}
                                placeholder="e.g., 10"
                            />
                        </div>

                        {error && <div className="watch-modal-error">{error}</div>}
                    </div>

                    <div className="watch-modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Watch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WatchModal;
