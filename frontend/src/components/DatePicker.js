import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './DatePicker.css';

function DatePicker({ selected, onChange, placeholder, minDate, maxDate, selectsRange, startDate, endDate, inline }) {
  return (
    <div className="date-picker-wrapper">
      <ReactDatePicker
        selected={selected}
        onChange={onChange}
        placeholderText={placeholder}
        minDate={minDate}
        maxDate={maxDate}
        selectsRange={selectsRange}
        startDate={startDate}
        endDate={endDate}
        inline={inline}
        className="date-picker-input"
        dateFormat="MM/dd/yyyy"
        calendarClassName="custom-calendar"
        wrapperClassName="date-picker-wrapper-class"
      />
    </div>
  );
}

export default DatePicker;




