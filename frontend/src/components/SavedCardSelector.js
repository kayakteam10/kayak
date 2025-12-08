/**
 * Saved Card Selector Component
 * Displays list of saved cards and allows selection
 */

import React from 'react';
import './SavedCardSelector.css';

const SavedCardSelector = ({
    cards = [],
    selectedCardId,
    onSelect,
    onDelete,
    onSetDefault,
    showActions = true
}) => {
    if (cards.length === 0) {
        return (
            <div className="no-cards-message">
                <p>No saved payment methods</p>
            </div>
        );
    }

    const getBrandIcon = (brand) => {
        const icons = {
            visa: '💳',
            mastercard: '💳',
            amex: '💳',
            discover: '💳',
            default: '💳'
        };
        return icons[brand?.toLowerCase()] || icons.default;
    };

    return (
        <div className="saved-cards-list">
            {cards.map((card) => (
                <div
                    key={card.id}
                    className={`saved-card-item ${selectedCardId === card.id ? 'selected' : ''}`}
                    onClick={() => onSelect && onSelect(card)}
                >
                    <div className="card-radio">
                        <input
                            type="radio"
                            name="savedCard"
                            checked={selectedCardId === card.id}
                            onChange={() => onSelect && onSelect(card)}
                        />
                    </div>

                    <div className="card-details">
                        <div className="card-brand-number">
                            <span className="brand-icon">{getBrandIcon(card.card_brand)}</span>
                            <span className="card-brand">{card.card_brand || 'Card'}</span>
                            <span className="card-last4">•••• {card.card_last4}</span>
                        </div>
                        <div className="card-meta">
                            <span className="card-expiry">
                                Expires {card.card_exp_month}/{card.card_exp_year}
                            </span>
                            {card.is_default && (
                                <span className="default-badge">★ Default</span>
                            )}
                        </div>
                    </div>

                    {showActions && (
                        <div className="card-actions">
                            {!card.is_default && onSetDefault && (
                                <button
                                    className="btn-set-default"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSetDefault(card.id);
                                    }}
                                    title="Set as default"
                                >
                                    Set Default
                                </button>
                            )}
                            {!card.is_default && onDelete && (
                                <button
                                    className="btn-delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this card?')) {
                                            onDelete(card.id);
                                        }
                                    }}
                                    title="Delete card"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default SavedCardSelector;
