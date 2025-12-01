import React, { useState, useEffect, useRef } from 'react';
import { hotelsAPI } from '../services/api';
import './AirportAutocomplete.css'; // Reuse the same CSS

const HotelLocationAutocomplete = ({
    value,
    onChange,
    placeholder = "Enter a city, hotel, airport, address or landmark",
    name,
    required = false
}) => {
    const [inputValue, setInputValue] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const debounceTimer = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update input value when prop changes
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    // Search hotels/cities with debouncing
    const searchLocations = async (searchTerm) => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await hotelsAPI.searchCities(searchTerm);
            setSuggestions(response.data.data || []);
            setIsOpen(response.data.data && response.data.data.length > 0);
            setHighlightedIndex(-1);
        } catch (error) {
            console.error('Location search error:', error);
            setSuggestions([]);
            setIsOpen(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle input change with debouncing
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue); // Update parent state immediately for typing

        // Clear existing timer
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        // Set new timer for debounced search
        debounceTimer.current = setTimeout(() => {
            searchLocations(newValue);
        }, 300); // 300ms debounce delay
    };

    // Handle suggestion selection
    const handleSelectSuggestion = (location) => {
        setInputValue(location.value);
        onChange(location.value, location); // Pass value and full location object
        setSuggestions([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    handleSelectSuggestion(suggestions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
            default:
                break;
        }
    };

    // Handle input blur
    const handleBlur = () => {
        // Delay to allow click on suggestion to register
        setTimeout(() => {
            if (!wrapperRef.current?.contains(document.activeElement)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        }, 200);
    };

    // Get icon for location type
    const getIcon = (type) => {
        switch (type) {
            case 'city':
                return '📍';
            case 'hotel':
                return '🏨';
            case 'airport':
                return '✈️';
            default:
                return '📍';
        }
    };

    return (
        <div className="airport-autocomplete" ref={wrapperRef}>
            <input
                type="text"
                name={name}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onFocus={() => {
                    if (suggestions.length > 0) {
                        setIsOpen(true);
                    }
                }}
                placeholder={placeholder}
                required={required}
                autoComplete="off"
                className="airport-input"
            />

            {isLoading && (
                <div className="airport-loading">
                    <span className="spinner"></span>
                </div>
            )}

            {isOpen && suggestions.length > 0 && (
                <ul className="airport-suggestions">
                    {suggestions.map((location, index) => (
                        <li
                            key={`${location.type}-${location.value}-${index}`}
                            className={`airport-suggestion-item ${index === highlightedIndex ? 'highlighted' : ''
                                }`}
                            onClick={() => handleSelectSuggestion(location)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            <div className="airport-suggestion-content">
                                <span className="airport-code">{location.icon || getIcon(location.type)}</span>
                                <span className="airport-label">{location.label}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {isOpen && !isLoading && suggestions.length === 0 && inputValue.length >= 2 && (
                <ul className="airport-suggestions">
                    <li className="airport-suggestion-item no-results">
                        No locations found
                    </li>
                </ul>
            )}
        </div>
    );
};

export default HotelLocationAutocomplete;
