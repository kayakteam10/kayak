import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import HotelSearchPage from './pages/HotelSearchPage';
import HotelDetailsPage from './pages/HotelDetailsPage';
import HotelBookingPage from './pages/HotelBookingPage';
import HotelConfirmationPage from './pages/HotelConfirmationPage';
import FlightDetailsPage from './pages/FlightDetailsPage';
import BookingPage from './pages/BookingPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import CarBookingPage from './pages/CarBookingPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminFlights from './pages/admin/AdminFlights';
import AdminBookings from './pages/admin/AdminBookings';
import AdminHotels from './pages/admin/AdminHotels';
import AdminCars from './pages/admin/AdminCars';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AIConcierge from './components/AIConcierge';

import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin Routes - No Header/Footer */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="flights" element={<AdminFlights />} />
          <Route path="hotels" element={<AdminHotels />} />
          <Route path="cars" element={<AdminCars />} />
          <Route path="bookings" element={<AdminBookings />} />
        </Route>

        {/* User Routes - With Header/Footer */}
        <Route path="*" element={
          <div className="App">
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/hotels" element={<HotelSearchPage />} />
                <Route path="/hotel-details/:id" element={<HotelDetailsPage />} />
                <Route path="/booking/hotel/:id" element={<HotelBookingPage />} />
                <Route path="/hotel-confirmation/:id" element={<HotelConfirmationPage />} />
                <Route path="/flight-details/:id" element={<FlightDetailsPage />} />
                <Route path="/booking/cars/:id" element={<CarBookingPage />} />
                <Route path="/booking/:type/:id" element={<BookingPage />} />
                <Route path="/booking/confirmation/:type/:id" element={<BookingConfirmationPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Routes>
            </main>
            <Footer />
            <AIConcierge />
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
