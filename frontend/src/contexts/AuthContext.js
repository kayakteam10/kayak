import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    const profilePicture = localStorage.getItem('profilePicture');

    if (token && userId) {
      setUser({
        id: parseInt(userId),
        name: userName,
        role: userRole,
        profilePicture,
        token
      });
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('userId', userData.userId);
    localStorage.setItem('userName', userData.firstName);
    localStorage.setItem('userRole', userData.role);
    
    if (userData.profilePicture) {
      localStorage.setItem('profilePicture', userData.profilePicture);
    }

    setUser({
      id: userData.userId,
      name: userData.firstName,
      role: userData.role,
      profilePicture: userData.profilePicture,
      token: userData.token
    });
    setIsAuthenticated(true);

    // Dispatch events for backward compatibility
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('login'));
  };

  const logout = () => {
    const userId = localStorage.getItem('userId');
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('profilePicture');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    
    // Clear user-specific chat session
    if (userId) {
      localStorage.removeItem(`aiChatSessionId_user${userId}`);
    }

    setUser(null);
    setIsAuthenticated(false);

    // Dispatch events for backward compatibility
    window.dispatchEvent(new Event('logout'));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
