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
                {[
                  { value: 'sedan', label: 'Sedan' },
                  { value: 'compact', label: 'Compact' },
                  { value: 'suv', label: 'SUV' },
                  { value: 'luxury', label: 'Luxury' },
                  { value: 'van', label: 'Van' },
                  { value: 'truck', label: 'Truck' },
                  { value: 'convertible', label: 'Convertible' }
                ].map(vehicleType => (
                  <label key={vehicleType.value} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.vehicleType === vehicleType.value}
                      onChange={() => handleFilterChange('vehicleType', filters.vehicleType === vehicleType.value ? '' : vehicleType.value)}
                    />
                    {vehicleType.label}
                  </label>
                ))}
              </div>
              <div className="filter-section">
                <label className="filter-label">Seats</label>
                {[
                  { value: '4', label: '4 seats' },
                  { value: '5', label: '5 seats' },
                  { value: '7+', label: '7+ seats' }
                ].map(seats => (
                  <label key={seats.value} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.seats === seats.value}
                      onChange={() => handleFilterChange('seats', filters.seats === seats.value ? '' : seats.value)}
                    />
                    {seats.label}
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

