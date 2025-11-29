import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('token') !== null);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'User');
  const [profilePicture, setProfilePicture] = useState(localStorage.getItem('profilePicture') || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Update login state when storage changes or login/logout events
  useEffect(() => {
    const updateLoginState = () => {
      setIsLoggedIn(localStorage.getItem('token') !== null);
      setUserName(localStorage.getItem('userName') || 'User');
      setProfilePicture(localStorage.getItem('profilePicture') || '');
    };

    // Initial check
    updateLoginState();

    // Listen for storage changes (cross-tab)
    window.addEventListener('storage', updateLoginState);

    // Listen for custom login event (same-tab)
    window.addEventListener('login', updateLoginState);
    window.addEventListener('logout', updateLoginState);

    return () => {
      window.removeEventListener('storage', updateLoginState);
      window.removeEventListener('login', updateLoginState);
      window.removeEventListener('logout', updateLoginState);
    };
  }, []);

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
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('profilePicture');
    setIsLoggedIn(false);
    setUserName('User');
    setProfilePicture('');
    setShowDropdown(false);
    // Dispatch custom event to notify of logout
    window.dispatchEvent(new Event('logout'));
    window.location.href = '/';
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo kayak-logo">
          <span className="kayak-block">K</span>
          <span className="kayak-block">A</span>
          <span className="kayak-block">Y</span>
          <span className="kayak-block">A</span>
          <span className="kayak-block">K</span>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Home</Link>
          {isLoggedIn ? (
            <>
              <div className="user-menu" ref={dropdownRef}>
                <button
                  className="user-menu-button"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="header-profile-pic" />
                  ) : (
                    <span className="user-icon">👤</span>
                  )}
                  <span className="user-name">{userName}</span>
                  <span className="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
                </button>
                {showDropdown && (
                  <div className="user-dropdown">
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
    </header>
  );
}

export default Header;
