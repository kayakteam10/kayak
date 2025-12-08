import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaPlane } from 'react-icons/fa';
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [selectedAirport, setSelectedAirport] = useState(null); // Store full airport object
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

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
    // Only update if we don't have a selected airport or if value changed
    if (!selectedAirport || (value && value !== selectedAirport.code)) {
      setInputValue(value || '');
    }
  }, [value, selectedAirport]);

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
      const airports = response.data.data || [];
      setSuggestions(airports);
      setIsOpen(airports.length > 0);
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
    setSelectedAirport(null); // Clear selection when user types

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
    const displayValue = `${airport.city} - ${airport.code}`;
    setInputValue(displayValue);
    setSelectedAirport(airport); // Store the selected airport
    onChange(airport.code, airport); // Still pass just the code to parent for API calls
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
        ref={inputRef}
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

      {isOpen && suggestions.length > 0 && createPortal(
        <ul 
          className="airport-suggestions airport-suggestions-portal" 
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 2147483647
          }}
        >
          {suggestions.map((airport, index) => (
            <li
              key={airport.code}
              className={`airport-suggestion-item ${index === highlightedIndex ? 'highlighted' : ''
                }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(airport);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="airport-suggestion-content" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '4px 0' }}>
                <div className="airport-icon-wrapper" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', backgroundColor: '#f0f4f8',
                  borderRadius: '4px', color: '#555', flexShrink: 0
                }}>
                  <FaPlane className="airport-icon-svg" style={{ fontSize: '14px', color: '#666', transform: 'rotate(-45deg)' }} />
                </div>
                <div className="airport-info" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <div className="airport-main" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span className="airport-city" style={{
                      fontWeight: 600, color: '#2c3e50', fontSize: '15px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>{airport.city}</span>
                    <span className="airport-code-badge" style={{
                      fontWeight: 700, color: '#666', fontSize: '12px',
                      backgroundColor: '#eee', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px'
                    }}>{airport.code}</span>
                  </div>
                  <div className="airport-sub" style={{
                    color: '#666', fontSize: '13px', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis', width: '100%'
                  }}>{airport.name}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>,
        document.body
      )}

      {isOpen && !isLoading && suggestions.length === 0 && inputValue.length >= 2 && createPortal(
        <ul 
          className="airport-suggestions airport-suggestions-portal"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 2147483647
          }}
        >
          <li className="airport-suggestion-item no-results">
            No airports found
          </li>
        </ul>,
        document.body
      )}
    </div>
  );
};

export default AirportAutocomplete;
