import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AIConcierge from './AIConcierge';
import '../App.css';

function Header() {
  const { isAuthenticated, user, logout: contextLogout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    contextLogout();
    setShowDropdown(false);
    window.location.href = '/';
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo tripweave-logo">
          <span className="tripweave-block">T</span>
          <span className="tripweave-block">R</span>
          <span className="tripweave-block">I</span>
          <span className="tripweave-block">P</span>
          <span className="tripweave-block">W</span>
          <span className="tripweave-block">E</span>
          <span className="tripweave-block">A</span>
          <span className="tripweave-block">V</span>
          <span className="tripweave-block">E</span>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Home</Link>
          {isAuthenticated ? (
            <>
              <div className="user-menu" ref={dropdownRef}>
                <button
                  className="user-menu-button"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" className="header-profile-pic" />
                  ) : (
                    <span className="user-icon">👤</span>
                  )}
                  <span className="user-name">{user?.name || 'User'}</span>
                  <span className="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
                </button>
                {showDropdown && (
                  <div className="user-dropdown">
                    {user?.role === 'admin' ? (
                      <>
                        <Link
                          to="/admin"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          Admin Panel
                        </Link>
                        <Link
                          to="/profile?tab=profile"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          Profile Settings
                        </Link>
                        <div className="dropdown-divider"></div>
                        <button
                          className="dropdown-item logout-item"
                          onClick={handleLogout}
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/profile?tab=bookings"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          My Bookings
                        </Link>
                        <Link
                          to="/profile?tab=reviews"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          My Reviews
                        </Link>
                        <Link
                          to="/profile?tab=profile"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          Profile Settings
                        </Link>
                        <Link
                          to="/profile?tab=payment"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          Payment Methods
                        </Link>
                        <div className="dropdown-divider"></div>
                        <button
                          className="dropdown-item logout-item"
                          onClick={handleLogout}
                        >
                          Logout
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                className="nav-link nav-auth logout-btn"
                onClick={handleLogout}
                title="Logout"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link nav-auth">Login</Link>
              <Link to="/register" className="nav-link nav-auth">Register</Link>
            </>
          )}
        </nav>
      </div>
      <AIConcierge />
    </header>
  );
}

export default Header;
