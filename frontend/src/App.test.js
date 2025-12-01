import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock child components to avoid deep rendering and API calls
jest.mock('./components/Header', () => () => <div data-testid="header">Header</div>);
jest.mock('./components/Footer', () => () => <div data-testid="footer">Footer</div>);
jest.mock('./pages/HomePage', () => () => <div data-testid="home-page">HomePage</div>);
jest.mock('./pages/SearchResultsPage', () => () => <div>SearchResultsPage</div>);
jest.mock('./pages/HotelSearchPage', () => () => <div>HotelSearchPage</div>);
jest.mock('./pages/HotelDetailsPage', () => () => <div>HotelDetailsPage</div>);
jest.mock('./pages/HotelBookingPage', () => () => <div>HotelBookingPage</div>);
jest.mock('./pages/HotelConfirmationPage', () => () => <div>HotelConfirmationPage</div>);
jest.mock('./pages/FlightDetailsPage', () => () => <div>FlightDetailsPage</div>);
jest.mock('./pages/BookingPage', () => () => <div>BookingPage</div>);
jest.mock('./pages/BookingConfirmationPage', () => () => <div>BookingConfirmationPage</div>);
jest.mock('./pages/CarBookingPage', () => () => <div>CarBookingPage</div>);
jest.mock('./pages/ProfilePage', () => () => <div>ProfilePage</div>);
jest.mock('./pages/LoginPage', () => () => <div>LoginPage</div>);
jest.mock('./pages/RegisterPage', () => () => <div>RegisterPage</div>);
jest.mock('./pages/admin/AdminLayout', () => () => <div>AdminLayout</div>);
jest.mock('./pages/admin/AdminDashboard', () => () => <div>AdminDashboard</div>);
jest.mock('./pages/admin/AdminFlights', () => () => <div>AdminFlights</div>);
jest.mock('./pages/admin/AdminBookings', () => () => <div>AdminBookings</div>);

test('renders App with Header and Footer', () => {
    render(<App />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
});
