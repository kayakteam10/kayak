import React, { useState, useEffect } from 'react';
import { FaPlane, FaClipboardList, FaUsers, FaDollarSign, FaTimes, FaHotel, FaCar, FaEdit, FaTrash } from 'react-icons/fa';
import { adminAnalyticsAPI, adminBookingsAPI, adminFlightsAPI, adminUsersAPI, adminHotelsAPI, adminCarsAPI } from '../../services/adminApi';
import './AdminLayout.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalBookings: 0,
        totalRevenue: 0,
        totalUsers: 0,
        totalFlights: 0,
        totalHotels: 0,
        totalCars: 0
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal state
    const [activeModal, setActiveModal] = useState(null);
    const [modalData, setModalData] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Format large numbers (K, M, B)
    const formatNumber = (num) => {
        const value = parseFloat(num);
        if (value >= 1000000000) {
            return (value / 1000000000).toFixed(2) + 'B';
        } else if (value >= 1000000) {
            return (value / 1000000).toFixed(2) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(2) + 'K';
        }
        return value.toFixed(2);
    };

    useEffect(() => {
        fetchData();
    }, [refreshKey]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [analyticsRes, bookingsRes] = await Promise.all([
                adminAnalyticsAPI.getOverview(),
                adminBookingsAPI.getAll({ limit: 10 })
            ]);

            const analyticsData = analyticsRes.data.data || analyticsRes.data;

            setStats({
                ...analyticsData
            });
            const bookingsData = bookingsRes.data.data || bookingsRes.data;
            setRecentBookings(Array.isArray(bookingsData) ? bookingsData.slice(0, 10) : []);
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
        setCurrentPage(1);

        try {
            let response;
            switch (type) {
                case 'revenue':
                    response = await adminBookingsAPI.getAll({ status: 'confirmed', limit: 10000 });
                    console.log('Revenue response:', response.data);
                    setModalData(response.data.data || []);
                    break;
                case 'bookings':
                    response = await adminBookingsAPI.getAll({ limit: 10000 });
                    console.log('Bookings response:', response.data);
                    setModalData(response.data.data || []);
                    break;
                case 'flights':
                    response = await adminFlightsAPI.getAll({ limit: 10000 });
                    console.log('Flights response:', response.data);
                    setModalData(response.data.data || []);
                    break;
                case 'hotels':
                    response = await adminHotelsAPI.getAll({ limit: 10000 });
                    console.log('Hotels response:', response.data);
                    setModalData(response.data.data || []);
                    break;
                case 'cars':
                    response = await adminCarsAPI.getAll({ limit: 10000 });
                    console.log('Cars response:', response.data);
                    setModalData(response.data.data || []);
                    break;
                case 'users':
                    console.log('Fetching users...');
                    response = await adminUsersAPI.getAll({ limit: 10000 });
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
                <p>Overview of your travel booking system</p>
                <button 
                    onClick={() => setRefreshKey(k => k + 1)} 
                    className="admin-btn admin-btn-primary"
                    style={{ marginTop: '10px' }}
                >
                    🔄 Refresh Data
                </button>
            </div>

            <div className="admin-stats-grid">
                <div className="admin-stat-card clickable" onClick={() => handleStatClick('revenue')}>
                    <div className="admin-stat-header">
                        <div>
                            <div className="admin-stat-label">Total Revenue</div>
                            <div className="admin-stat-value">${formatNumber(stats.totalRevenue)}</div>
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

                <div className="admin-stat-card clickable" onClick={() => handleStatClick('hotels')}>
                    <div className="admin-stat-header">
                        <div>
                            <div className="admin-stat-label">Total Hotels</div>
                            <div className="admin-stat-value">{stats.totalHotels}</div>
                        </div>
                        <div className="admin-stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                            <FaHotel />
                        </div>
                    </div>
                </div>

                <div className="admin-stat-card clickable" onClick={() => handleStatClick('cars')}>
                    <div className="admin-stat-header">
                        <div>
                            <div className="admin-stat-label">Total Cars</div>
                            <div className="admin-stat-value">{stats.totalCars}</div>
                        </div>
                        <div className="admin-stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                            <FaCar />
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
                                <td colSpan="6" style={{ textAlign: 'center', padding: '60px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                                    <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                                        No Bookings Yet
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                        Bookings made through your website will appear here automatically
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
                                        💡 Ready to handle 10,000+ bookings for performance testing
                                    </div>
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
                                {activeModal === 'hotels' && 'All Hotels'}
                                {activeModal === 'cars' && 'All Cars'}
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
                                <>
                                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, modalData.length)} of {modalData.length} items
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: currentPage === 1 ? '#f5f5f5' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                        >
                                            Previous
                                        </button>
                                        <span style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: '#f5f5f5' }}>
                                            Page {currentPage} of {Math.ceil(modalData.length / itemsPerPage)}
                                        </span>
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(modalData.length / itemsPerPage), p + 1))}
                                            disabled={currentPage >= Math.ceil(modalData.length / itemsPerPage)}
                                            style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: currentPage >= Math.ceil(modalData.length / itemsPerPage) ? '#f5f5f5' : 'white', cursor: currentPage >= Math.ceil(modalData.length / itemsPerPage) ? 'not-allowed' : 'pointer' }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
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
                                                    <th>Actions</th>
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
                                            {activeModal === 'hotels' && (
                                                <>
                                                    <th>ID</th>
                                                    <th>Hotel Name</th>
                                                    <th>City</th>
                                                    <th>Stars</th>
                                                    <th>Price/Night</th>
                                                    <th>Available</th>
                                                    <th>Rating</th>
                                                    <th>Actions</th>
                                                </>
                                            )}
                                            {activeModal === 'cars' && (
                                                <>
                                                    <th>ID</th>
                                                    <th>Car</th>
                                                    <th>Type</th>
                                                    <th>Location</th>
                                                    <th>Price/Day</th>
                                                    <th>Status</th>
                                                    <th>Rating</th>
                                                    <th>Actions</th>
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
                                                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                                                    No data found
                                                </td>
                                            </tr>
                                        ) : (
                                            modalData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, index) => (
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
                                                            <td>
                                                                <button
                                                                    className="admin-btn admin-btn-secondary admin-btn-sm"
                                                                    onClick={() => alert(`Edit booking #${item.id} - Feature coming soon`)}
                                                                    style={{ marginRight: '8px', padding: '4px 8px', fontSize: '12px' }}
                                                                    title="Edit Booking"
                                                                >
                                                                    <FaEdit />
                                                                </button>
                                                                <button
                                                                    className="admin-btn admin-btn-danger admin-btn-sm"
                                                                    onClick={() => {
                                                                        if (window.confirm(`Are you sure you want to delete booking #${item.id}?`)) {
                                                                            alert('Delete functionality - Coming soon');
                                                                        }
                                                                    }}
                                                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                                                    title="Delete Booking"
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            </td>
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
                                                    {activeModal === 'hotels' && (
                                                        <>
                                                            <td>#{item.id}</td>
                                                            <td style={{ fontWeight: '600' }}>{item.hotel_name}</td>
                                                            <td>{item.city}</td>
                                                            <td>{'⭐'.repeat(item.star_rating || 0)}</td>
                                                            <td>${parseFloat(item.price_per_night || 0).toFixed(2)}</td>
                                                            <td>{item.available_rooms}/{item.total_rooms}</td>
                                                            <td>{parseFloat(item.user_rating || 0).toFixed(1)} ⭐</td>
                                                            <td>
                                                                <button
                                                                    className="admin-btn admin-btn-secondary admin-btn-sm"
                                                                    onClick={() => alert(`Edit hotel #${item.id} - Feature coming soon`)}
                                                                    style={{ marginRight: '8px', padding: '4px 8px', fontSize: '12px' }}
                                                                    title="Edit Hotel"
                                                                >
                                                                    <FaEdit />
                                                                </button>
                                                                <button
                                                                    className="admin-btn admin-btn-danger admin-btn-sm"
                                                                    onClick={() => {
                                                                        if (window.confirm(`Are you sure you want to delete hotel "${item.hotel_name}"?`)) {
                                                                            alert('Delete functionality - Coming soon');
                                                                        }
                                                                    }}
                                                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                                                    title="Delete Hotel"
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            </td>
                                                        </>
                                                    )}
                                                    {activeModal === 'cars' && (
                                                        <>
                                                            <td>#{item.id}</td>
                                                            <td style={{ fontWeight: '600' }}>{item.company} {item.model}</td>
                                                            <td>{item.car_type}</td>
                                                            <td>{item.location_city}</td>
                                                            <td>${parseFloat(item.daily_rental_price || 0).toFixed(2)}</td>
                                                            <td>
                                                                <span className={`admin-badge ${item.status === 'available' ? 'success' : 'warning'}`}>
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                            <td>{parseFloat(item.average_rating || 0).toFixed(1)} ⭐</td>
                                                            <td>
                                                                <button
                                                                    className="admin-btn admin-btn-secondary admin-btn-sm"
                                                                    onClick={() => alert(`Edit car #${item.id} - Feature coming soon`)}
                                                                    style={{ marginRight: '8px', padding: '4px 8px', fontSize: '12px' }}
                                                                    title="Edit Car"
                                                                >
                                                                    <FaEdit />
                                                                </button>
                                                                <button
                                                                    className="admin-btn admin-btn-danger admin-btn-sm"
                                                                    onClick={() => {
                                                                        if (window.confirm(`Are you sure you want to delete car "${item.company} ${item.model}"?`)) {
                                                                            alert('Delete functionality - Coming soon');
                                                                        }
                                                                    }}
                                                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                                                    title="Delete Car"
                                                                >
                                                                    <FaTrash />
                                                                </button>
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
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
