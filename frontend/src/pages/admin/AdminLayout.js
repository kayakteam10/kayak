import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { FaChartLine, FaPlane, FaClipboardList, FaSignOutAlt, FaHome } from 'react-icons/fa';
import './AdminLayout.css';

const AdminLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Check if user is admin
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        // Get user info from token or API
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const userData = JSON.parse(userStr);
            if (userData.role !== 'admin') {
                alert('Access denied. Admin privileges required.');
                navigate('/');
                return;
            }
            setUser(userData);
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const navItems = [
        { path: '/admin', label: 'Dashboard', icon: <FaChartLine /> },
        { path: '/admin/flights', label: 'Flights', icon: <FaPlane /> },
        { path: '/admin/bookings', label: 'Bookings', icon: <FaClipboardList /> },
    ];

    return (
        <div className="admin-layout">
            <div className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <h2>Admin Panel</h2>
                    <p>{user?.email || 'Administrator'}</p>
                </div>

                <nav className="admin-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <span className="admin-nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}

                    <Link to="/" className="admin-nav-item">
                        <span className="admin-nav-icon"><FaHome /></span>
                        <span>Back to Site</span>
                    </Link>

                    <button onClick={handleLogout} className="admin-nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <span className="admin-nav-icon"><FaSignOutAlt /></span>
                        <span>Logout</span>
                    </button>
                </nav>
            </div>

            <div className="admin-content">
                <Outlet />
            </div>
        </div>
    );
};

export default AdminLayout;
