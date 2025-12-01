import React, { useState, useEffect } from 'react';
import { FaPlane, FaClipboardList, FaUsers, FaDollarSign, FaTimes } from 'react-icons/fa';
import { adminAnalyticsAPI, adminBookingsAPI, adminFlightsAPI, adminUsersAPI } from '../../services/adminApi';
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

    // Modal state
    const [activeModal, setActiveModal] = useState(null);
    const [modalData, setModalData] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);

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

            setStats(analyticsRes.data.data || analyticsRes.data);
            const bookingsData = bookingsRes.data.data || bookingsRes.data;
            setRecentBookings(Array.isArray(bookingsData) ? bookingsData.slice(0, 5) : []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
        }
    };

    const handleStatClick = async (type) => {
        console.log('🔍 Stat clicked:', type);
        setActiveModal(type);
        setModalLoading(true);
        setModalData([]);

        try {
            let response;
            switch (type) {
                case 'revenue':
                    response = await adminBookingsAPI.getAll({ status: 'confirmed' });
                    console.log('Revenue response:', response.data);
                    setModalData(response.data.data || []);
                    break;
                case 'bookings':
                    response = await adminBookingsAPI.getAll();
                    console.log('Bookings response:', response.data);
                    setModalData(response.data.data || []);
                    break;
                case 'flights':
                    response = await adminFlightsAPI.getAll();
                    console.log('Flights response:', response.data);
                    setModalData(response.data.data || []);
                    break;
                case 'users':
                    console.log('Fetching users...');
                    response = await adminUsersAPI.getAll();
                    console.log('Users response:', response.data);
                    setModalData(response.data.data || []);
                    break;
                default:
                    break;
            }
            setModalLoading(false);
        } catch (error) {
            console.error('Error fetching modal data:', error);
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalData([]);
    };

    const getStatusBadge = (status) => {
        const badges = {
            confirmed: 'success',
            pending: 'warning',
            cancelled: 'danger',
            scheduled: 'info',
            delayed: 'warning'
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
                <div className="admin-stat-card clickable" onClick={() => handleStatClick('revenue')}>
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

                <div className="admin-stat-card clickable" onClick={() => handleStatClick('bookings')}>
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

                <div className="admin-stat-card clickable" onClick={() => handleStatClick('flights')}>
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

                <div className="admin-stat-card clickable" onClick={() => handleStatClick('users')}>
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
                                    <td>{new Date(booking.booking_date).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Modals */}
            {activeModal && (
                <div className="admin-modal-overlay" onClick={closeModal}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto' }}>
                        <div className="admin-modal-header">
                            <h2>
                                {activeModal === 'revenue' && 'Revenue Details (Confirmed Bookings)'}
                                {activeModal === 'bookings' && 'All Bookings'}
                                {activeModal === 'flights' && 'All Flights'}
                                {activeModal === 'users' && 'All Users'}
                            </h2>
                            <button onClick={closeModal} className="admin-modal-close">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="admin-modal-body">
                            {modalLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            {activeModal === 'revenue' && (
                                                <>
                                                    <th>Ref</th>
                                                    <th>Type</th>
                                                    <th>User ID</th>
                                                    <th>Amount</th>
                                                    <th>Date</th>
                                                </>
                                            )}
                                            {activeModal === 'bookings' && (
                                                <>
                                                    <th>ID</th>
                                                    <th>Reference</th>
                                                    <th>Type</th>
                                                    <th>User ID</th>
                                                    <th>Amount</th>
                                                    <th>Status</th>
                                                    <th>Date</th>
                                                </>
                                            )}
                                            {activeModal === 'flights' && (
                                                <>
                                                    <th>Flight #</th>
                                                    <th>Airline</th>
                                                    <th>Route</th>
                                                    <th>Departure</th>
                                                    <th>Seats</th>
                                                    <th>Status</th>
                                                </>
                                            )}
                                            {activeModal === 'users' && (
                                                <>
                                                    <th>ID</th>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Phone</th>
                                                    <th>Role</th>
                                                    <th>Registered</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modalData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                                    No data found
                                                </td>
                                            </tr>
                                        ) : (
                                            modalData.map((item, index) => (
                                                <tr key={item.id || index}>
                                                    {activeModal === 'revenue' && (
                                                        <>
                                                            <td>{item.booking_reference}</td>
                                                            <td style={{ textTransform: 'capitalize' }}>{item.booking_type}</td>
                                                            <td>#{item.user_id}</td>
                                                            <td>${parseFloat(item.total_amount).toFixed(2)}</td>
                                                            <td>{new Date(item.booking_date).toLocaleDateString()}</td>
                                                        </>
                                                    )}
                                                    {activeModal === 'bookings' && (
                                                        <>
                                                            <td>#{item.id}</td>
                                                            <td>{item.booking_reference}</td>
                                                            <td style={{ textTransform: 'capitalize' }}>{item.booking_type}</td>
                                                            <td>#{item.user_id}</td>
                                                            <td>${parseFloat(item.total_amount).toFixed(2)}</td>
                                                            <td>
                                                                <span className={`admin-badge ${getStatusBadge(item.status)}`}>
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                            <td>{new Date(item.booking_date).toLocaleDateString()}</td>
                                                        </>
                                                    )}
                                                    {activeModal === 'flights' && (
                                                        <>
                                                            <td>{item.flight_number}</td>
                                                            <td>{item.airline}</td>
                                                            <td>{item.departure_airport} → {item.arrival_airport}</td>
                                                            <td>{new Date(item.departure_time).toLocaleDateString()}</td>
                                                            <td>{item.available_seats}/{item.total_seats}</td>
                                                            <td>
                                                                <span className={`admin-badge ${getStatusBadge(item.status)}`}>
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                        </>
                                                    )}
                                                    {activeModal === 'users' && (
                                                        <>
                                                            <td>#{item.id}</td>
                                                            <td>{item.first_name} {item.last_name}</td>
                                                            <td>{item.email}</td>
                                                            <td>{item.phone_number || 'N/A'}</td>
                                                            <td>
                                                                <span className={`admin-badge ${item.role === 'admin' ? 'danger' : 'info'}`}>
                                                                    {item.role}
                                                                </span>
                                                            </td>
                                                            <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
