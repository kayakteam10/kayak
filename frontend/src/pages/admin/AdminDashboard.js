import React, { useState, useEffect } from 'react';
import { FaPlane, FaClipboardList, FaUsers, FaDollarSign } from 'react-icons/fa';
import { adminAnalyticsAPI, adminBookingsAPI } from '../../services/adminApi';
import './AdminLayout.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalBookings: 0,
        totalRevenue: 0,
        totalUsers: 0,
        totalFlights: 0
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [analyticsRes, bookingsRes] = await Promise.all([
                adminAnalyticsAPI.getOverview(),
                adminBookingsAPI.getAll({ limit: 5 })
            ]);

            setStats(analyticsRes.data);
            setRecentBookings(bookingsRes.data.bookings.slice(0, 5));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            confirmed: 'success',
            pending: 'warning',
            cancelled: 'danger'
        };
        return badges[status] || 'info';
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="admin-page-header">
                <h1>Dashboard</h1>
                <p>Overview of your flight booking system</p>
            </div>

            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="admin-stat-header">
                        <div>
                            <div className="admin-stat-label">Total Revenue</div>
                            <div className="admin-stat-value">${stats.totalRevenue.toLocaleString()}</div>
                        </div>
                        <div className="admin-stat-icon green">
                            <FaDollarSign />
                        </div>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-header">
                        <div>
                            <div className="admin-stat-label">Total Bookings</div>
                            <div className="admin-stat-value">{stats.totalBookings}</div>
                        </div>
                        <div className="admin-stat-icon blue">
                            <FaClipboardList />
                        </div>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-header">
                        <div>
                            <div className="admin-stat-label">Total Flights</div>
                            <div className="admin-stat-value">{stats.totalFlights}</div>
                        </div>
                        <div className="admin-stat-icon purple">
                            <FaPlane />
                        </div>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-header">
                        <div>
                            <div className="admin-stat-label">Total Users</div>
                            <div className="admin-stat-value">{stats.totalUsers}</div>
                        </div>
                        <div className="admin-stat-icon orange">
                            <FaUsers />
                        </div>
                    </div>
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-card-header">
                    <h2>Recent Bookings</h2>
                </div>

                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Reference</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentBookings.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                    No bookings yet
                                </td>
                            </tr>
                        ) : (
                            recentBookings.map((booking) => (
                                <tr key={booking.id}>
                                    <td>#{booking.id}</td>
                                    <td>{booking.booking_reference}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{booking.booking_type}</td>
                                    <td>${parseFloat(booking.total_amount).toFixed(2)}</td>
                                    <td>
                                        <span className={`admin-badge ${getStatusBadge(booking.status)}`}>
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td>{new Date(booking.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminDashboard;
