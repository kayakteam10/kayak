import React, { useState, useEffect, useRef } from 'react';
import { flightsAPI } from '../services/api';
import './AirportAutocomplete.css';

const AirportAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "City or airport", 
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

  // Search airports with debouncing
  const searchAirports = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await flightsAPI.searchAirports(searchTerm);
      setSuggestions(response.data || []);
      setIsOpen(response.data && response.data.length > 0);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Airport search error:', error);
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

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for debounced search
    debounceTimer.current = setTimeout(() => {
      searchAirports(newValue);
    }, 300); // 300ms debounce delay
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (airport) => {
    setInputValue(airport.city);
    onChange(airport.city, airport); // Pass both city and full airport object
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
          {suggestions.map((airport, index) => (
            <li
              key={airport.code}
              className={`airport-suggestion-item ${
                index === highlightedIndex ? 'highlighted' : ''
              }`}
              onClick={() => handleSelectSuggestion(airport)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="airport-suggestion-content">
                <span className="airport-code">{airport.code}</span>
                <span className="airport-label">{airport.label}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !isLoading && suggestions.length === 0 && inputValue.length >= 2 && (
        <ul className="airport-suggestions">
          <li className="airport-suggestion-item no-results">
            No airports found
          </li>
        </ul>
      )}
    </div>
  );
};

export default AirportAutocomplete;
