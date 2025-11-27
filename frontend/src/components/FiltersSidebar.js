import React, { useState } from 'react';
import Slider from 'react-slider';
import './FiltersSidebar.css';

function FiltersSidebar({ type, filters, onFilterChange, onSortChange, sortBy }) {
  const [isOpen, setIsOpen] = useState(true);

  const handleFilterChange = (filterName, value) => {
    onFilterChange({ [filterName]: value });
  };

  const handleSortChange = (e) => {
    onSortChange(e.target.value);
  };

  const clearFilters = () => {
    onFilterChange({
      minPrice: 0,
      maxPrice: 10000,
      rating: 0,
      amenities: [],
      airline: '',
      stops: '',
      vehicleType: '',
      seats: '',
      timeWindows: [],
    });
  };

  return (
    <div className={`filters-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="filters-header">
        <h3>Filters</h3>
        <button className="toggle-filters" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {isOpen && (
        <div className="filters-content">
          {/* Sort Options */}
          <div className="filter-section">
            <label className="filter-label" htmlFor="sort-select">Sort By</label>
            <select 
              id="sort-select"
              className="filter-select" 
              onChange={handleSortChange} 
              value={sortBy || 'price_asc'}
              aria-label="Sort results by"
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="duration_asc">Duration: Shortest First</option>
              <option value="departure_asc">Earliest Departure</option>
              {type !== 'flights' && <option value="rating_desc">Rating: High to Low</option>}
            </select>
          </div>

          {/* Price Range */}
          <div className="filter-section">
            <label className="filter-label">
              Price Range: ${filters.minPrice || 0} - ${filters.maxPrice || 10000}
            </label>
            <Slider
              className="price-slider"
              thumbClassName="slider-thumb"
              trackClassName="slider-track"
              min={0}
              max={10000}
              value={[filters.minPrice || 0, filters.maxPrice || 10000]}
              onChange={([min, max]) => {
                onFilterChange({ minPrice: min, maxPrice: max });
              }}
              renderThumb={(props, state) => <div {...props}>{state.valueNow}</div>}
            />
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice || 0}
                onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value) || 0)}
                className="price-input"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || 10000}
                onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value) || 10000)}
                className="price-input"
              />
            </div>
          </div>

          {/* Type-specific filters */}
          {type === 'flights' && (
            <>
              <div className="filter-section">
                <label className="filter-label">Airlines</label>
                {['American Airlines', 'Delta', 'United', 'Southwest', 'JetBlue'].map(airline => (
                  <label key={airline} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.airline === airline}
                      onChange={() => handleFilterChange('airline', filters.airline === airline ? '' : airline)}
                    />
                    {airline}
                  </label>
                ))}
              </div>
              <div className="filter-section">
                <label className="filter-label">Stops</label>
                {['Non-stop', '1 Stop', '2+ Stops'].map(stop => (
                  <label key={stop} className="filter-checkbox">
                    <input
                      type="radio"
                      name="stops"
                      checked={filters.stops === stop}
                      onChange={() => handleFilterChange('stops', filters.stops === stop ? '' : stop)}
                      aria-label={`Filter by ${stop}`}
                    />
                    {stop}
                  </label>
                ))}
              </div>
              <div className="filter-section">
                <label className="filter-label">Departure Time</label>
                {[
                  { value: 'morning', label: 'Morning (5am - 12pm)' },
                  { value: 'afternoon', label: 'Afternoon (12pm - 5pm)' },
                  { value: 'evening', label: 'Evening (5pm - 10pm)' }
                ].map(timeWindow => (
                  <label key={timeWindow.value} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={(filters.timeWindows || []).includes(timeWindow.value)}
                      onChange={() => {
                        const currentWindows = filters.timeWindows || [];
                        const newWindows = currentWindows.includes(timeWindow.value)
                          ? currentWindows.filter(w => w !== timeWindow.value)
                          : [...currentWindows, timeWindow.value];
                        handleFilterChange('timeWindows', newWindows);
                      }}
                      aria-label={`Filter by ${timeWindow.label}`}
                    />
                    {timeWindow.label}
                  </label>
                ))}
              </div>
            </>
          )}

          {type === 'hotels' && (
            <>
              <div className="filter-section">
                <label className="filter-label">Star Rating</label>
                {[5, 4, 3, 2, 1].map(rating => (
                  <label key={rating} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.rating >= rating}
                      onChange={() => handleFilterChange('rating', filters.rating === rating ? 0 : rating)}
                    />
                    {'⭐'.repeat(rating)} {rating} stars & up
                  </label>
                ))}
              </div>
              <div className="filter-section">
                <label className="filter-label">Amenities</label>
                {['Free WiFi', 'Pool', 'Parking', 'Breakfast', 'Gym', 'Pet Friendly'].map(amenity => (
                  <label key={amenity} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={(filters.amenities || []).includes(amenity)}
                      onChange={() => {
                        const amenities = filters.amenities || [];
                        const newAmenities = amenities.includes(amenity)
                          ? amenities.filter(a => a !== amenity)
                          : [...amenities, amenity];
                        handleFilterChange('amenities', newAmenities);
                      }}
                    />
                    {amenity}
                  </label>
                ))}
              </div>
            </>
          )}

          {type === 'cars' && (
            <>
              <div className="filter-section">
                <label className="filter-label">Vehicle Type</label>
                {['Economy', 'Compact', 'Mid-size', 'Full-size', 'SUV', 'Luxury'].map(vehicleType => (
                  <label key={vehicleType} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.vehicleType === vehicleType}
                      onChange={() => handleFilterChange('vehicleType', filters.vehicleType === vehicleType ? '' : vehicleType)}
                    />
                    {vehicleType}
                  </label>
                ))}
              </div>
              <div className="filter-section">
                <label className="filter-label">Seats</label>
                {['2', '4', '5', '7+'].map(seats => (
                  <label key={seats} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.seats === seats}
                      onChange={() => handleFilterChange('seats', filters.seats === seats ? '' : seats)}
                    />
                    {seats} seats
                  </label>
                ))}
              </div>
            </>
          )}

          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default FiltersSidebar;

