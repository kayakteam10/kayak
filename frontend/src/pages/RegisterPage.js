import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './AuthPage.css';

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const roleDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setShowRoleDropdown(false);
      }
    };

    if (showRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleDropdown]);

  const handleRoleSelect = (role) => {
    setFormData(prev => ({ ...prev, role }));
    setShowRoleDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.register(formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Create Account</h2>
        <p className="subtitle">Join us to start booking your travels</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              placeholder="Enter your first name"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              placeholder="Enter your last name"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Register as</label>
            <div className="role-dropdown-wrapper" ref={roleDropdownRef}>
              <button
                type="button"
                className="role-dropdown-button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              >
                <span className="role-selected">
                  {formData.role === 'user' ? 'User' : 'Admin'}
                </span>
                <span className="dropdown-arrow">{showRoleDropdown ? '▲' : '▼'}</span>
              </button>
              {showRoleDropdown && (
                <div className="role-dropdown-menu">
                  <button
                    type="button"
                    className={`role-dropdown-item ${formData.role === 'user' ? 'selected' : ''}`}
                    onClick={() => handleRoleSelect('user')}
                  >
                    {formData.role === 'user' && <span className="checkmark">✓</span>}
                    User
                  </button>
                  <button
                    type="button"
                    className={`role-dropdown-item ${formData.role === 'admin' ? 'selected' : ''}`}
                    onClick={() => handleRoleSelect('admin')}
                  >
                    {formData.role === 'admin' && <span className="checkmark">✓</span>}
                    Admin
                  </button>
                </div>
              )}
            </div>
          </div>
          <button type="submit" disabled={loading} className="register-submit-btn">
            {loading ? 'Registering...' : 'Create Account'}
          </button>
        </form>
        <p>
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;


