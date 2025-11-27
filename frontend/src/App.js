import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import FlightDetailsPage from './pages/FlightDetailsPage';
import BookingPage from './pages/BookingPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminFlights from './pages/admin/AdminFlights';
import AdminBookings from './pages/admin/AdminBookings';

import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin Routes - No Header/Footer */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="flights" element={<AdminFlights />} />
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
                <Route path="/flight-details/:id" element={<FlightDetailsPage />} />
                <Route path="/booking/:type/:id" element={<BookingPage />} />
                <Route path="/booking/confirmation/:type/:id" element={<BookingConfirmationPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
