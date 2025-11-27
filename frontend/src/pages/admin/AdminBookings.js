import React, { useState, useEffect } from 'react';
import { FaEye, FaTimes } from 'react-icons/fa';
import { adminBookingsAPI } from '../../services/adminApi';
import './AdminLayout.css';

const AdminBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        startDate: '',
        endDate: ''
    });
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, [filters]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await adminBookingsAPI.getAll(filters);
            setBookings(response.data.bookings);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setLoading(false);
        }
    };

    const handleViewDetails = async (booking) => {
        try {
            const response = await adminBookingsAPI.getDetails(booking.id);
            setSelectedBooking(response.data.booking);
            setShowDetailsModal(true);
        } catch (error) {
            console.error('Error fetching booking details:', error);
        }
    };

    const handleCancelBooking = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) {
            return;
        }

        try {
            await adminBookingsAPI.cancel(id);
            fetchBookings();
            setShowDetailsModal(false);
        } catch (error) {
            console.error('Error cancelling booking:', error);
            alert(error.response?.data?.error || 'Failed to cancel booking');
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

    const getPaymentStatusBadge = (status) => {
        const badges = {
            paid: 'success',
            pending: 'warning',
            refunded: 'info',
            failed: 'danger'
        };
        return badges[status] || 'info';
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="admin-page-header">
                <h1>Bookings Management</h1>
                <p>View and manage all customer bookings</p>
            </div>

            <div className="admin-card">
                <div className="admin-card-header">
                    <h2>Filters</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div className="admin-form-group" style={{ marginBottom: 0 }}>
                        <label>Status</label>
                        <select
                            className="admin-form-input"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">All Statuses</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="pending">Pending</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="admin-form-group" style={{ marginBottom: 0 }}>
                        <label>Start Date</label>
                        <input
                            type="date"
                            className="admin-form-input"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                    </div>

                    <div className="admin-form-group" style={{ marginBottom: 0 }}>
                        <label>End Date</label>
                        <input
                            type="date"
                            className="admin-form-input"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="admin-card">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Reference</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Payment</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                                    No bookings found
                                </td>
                            </tr>
                        ) : (
                            bookings.map((booking) => (
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
                                    <td>
                                        <span className={`admin-badge ${getPaymentStatusBadge(booking.payment_status)}`}>
                                            {booking.payment_status}
                                        </span>
                                    </td>
                                    <td>{new Date(booking.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button
                                            className="admin-btn admin-btn-secondary admin-btn-sm"
                                            onClick={() => handleViewDetails(booking)}
                                            style={{ marginRight: '8px' }}
                                        >
                                            <FaEye />
                                        </button>
                                        {booking.status !== 'cancelled' && (
                                            <button
                                                className="admin-btn admin-btn-danger admin-btn-sm"
                                                onClick={() => handleCancelBooking(booking.id)}
                                            >
                                                <FaTimes />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showDetailsModal && selectedBooking && (
                <div className="admin-modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>Booking Details</h2>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <strong>Booking Reference:</strong>
                                    <p>{selectedBooking.booking_reference}</p>
                                </div>
                                <div>
                                    <strong>Type:</strong>
                                    <p style={{ textTransform: 'capitalize' }}>{selectedBooking.booking_type}</p>
                                </div>
                                <div>
                                    <strong>Status:</strong>
                                    <p>
                                        <span className={`admin-badge ${getStatusBadge(selectedBooking.status)}`}>
                                            {selectedBooking.status}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <strong>Payment Status:</strong>
                                    <p>
                                        <span className={`admin-badge ${getPaymentStatusBadge(selectedBooking.payment_status)}`}>
                                            {selectedBooking.payment_status}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <strong>Total Amount:</strong>
                                    <p>${parseFloat(selectedBooking.total_amount).toFixed(2)}</p>
                                </div>
                                <div>
                                    <strong>Created:</strong>
                                    <p>{new Date(selectedBooking.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            {selectedBooking.booking_details && (
                                <div style={{ marginTop: '24px' }}>
                                    <strong>Booking Details:</strong>
                                    <pre style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', overflow: 'auto', marginTop: '8px' }}>
                                        {JSON.stringify(JSON.parse(selectedBooking.booking_details), null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="admin-modal-actions">
                            <button className="admin-btn admin-btn-secondary" onClick={() => setShowDetailsModal(false)}>
                                Close
                            </button>
                            {selectedBooking.status !== 'cancelled' && (
                                <button
                                    className="admin-btn admin-btn-danger"
                                    onClick={() => handleCancelBooking(selectedBooking.id)}
                                >
                                    Cancel Booking
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBookings;
