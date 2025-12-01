import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { adminFlightsAPI } from '../../services/adminApi';
import './AdminLayout.css';

const AdminFlights = () => {
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingFlight, setEditingFlight] = useState(null);
    const [formData, setFormData] = useState({
        airline: '',
        flight_number: '',
        departure_airport: '',
        arrival_airport: '',
        departure_time: '',
        arrival_time: '',
        duration: '',
        price: '',
        available_seats: '',
        total_seats: '',
        status: 'scheduled',
        carry_on_fee: '0',
        checked_bag_fee: '35',
        baggage_allowance: '1 Carry-on included'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchFlights();
    }, []);

    const fetchFlights = async () => {
        try {
            setLoading(true);
            const response = await adminFlightsAPI.getAll();
            setFlights(response.data.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching flights:', error);
            setLoading(false);
        }
    };

    const handleOpenModal = (flight = null) => {
        if (flight) {
            setEditingFlight(flight);
            // Format datetime for datetime-local input (YYYY-MM-DDTHH:MM)
            const formatDatetime = (dt) => {
                if (!dt) return '';
                const date = new Date(dt);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };

            setFormData({
                airline: flight.airline || '',
                flight_number: flight.flight_number || '',
                departure_airport: flight.departure_airport || '',
                arrival_airport: flight.arrival_airport || '',
                departure_time: formatDatetime(flight.departure_time),
                arrival_time: formatDatetime(flight.arrival_time),
                duration: flight.duration || '',
                price: flight.price || '',
                available_seats: flight.available_seats || '',
                total_seats: flight.total_seats || '',
                status: flight.status || 'scheduled',
                carry_on_fee: flight.carry_on_fee || '0',
                checked_bag_fee: flight.checked_bag_fee || '35',
                baggage_allowance: flight.baggage_allowance || '1 Carry-on included'
            });
        } else {
            setEditingFlight(null);
            setFormData({
                airline: '',
                flight_number: '',
                departure_airport: '',
                arrival_airport: '',
                departure_time: '',
                arrival_time: '',
                duration: '',
                price: '',
                available_seats: '',
                total_seats: '',
                status: 'scheduled',
                carry_on_fee: '0',
                checked_bag_fee: '35',
                baggage_allowance: '1 Carry-on included'
            });
        }
        setErrors({});
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingFlight) {
                await adminFlightsAPI.update(editingFlight.id, formData);
            } else {
                await adminFlightsAPI.create(formData);
            }

            setShowModal(false);
            fetchFlights();
        } catch (error) {
            console.error('Error saving flight:', error);
            alert(error.response?.data?.error || 'Failed to save flight');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this flight?')) {
            return;
        }

        try {
            await adminFlightsAPI.delete(id);
            fetchFlights();
        } catch (error) {
            console.error('Error deleting flight:', error);
            alert(error.response?.data?.error || 'Failed to delete flight');
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1>Flights Management</h1>
                    <p>Manage flight inventory and schedules</p>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={() => handleOpenModal()}>
                    <FaPlus /> Add Flight
                </button>
            </div>

            <div className="admin-card">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Flight #</th>
                            <th>Airline</th>
                            <th>Route</th>
                            <th>Departure</th>
                            <th>Arrival</th>
                            <th>Duration</th>
                            <th>Price</th>
                            <th>Seats</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {flights.length === 0 ? (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                                    No flights found. Click "Add Flight" to create one.
                                </td>
                            </tr>
                        ) : (
                            flights.map((flight) => (
                                <tr key={flight.id}>
                                    <td>{flight.flight_number}</td>
                                    <td>{flight.airline}</td>
                                    <td>{flight.departure_airport} → {flight.arrival_airport}</td>
                                    <td>
                                        {new Date(flight.departure_time).toLocaleString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                    <td>
                                        {new Date(flight.arrival_time).toLocaleString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                    <td>{flight.duration ? `${flight.duration} min` : 'N/A'}</td>
                                    <td>${parseFloat(flight.price).toFixed(2)}</td>
                                    <td>{flight.available_seats}/{flight.total_seats}</td>
                                    <td>
                                        <button
                                            className="admin-btn admin-btn-secondary admin-btn-sm"
                                            onClick={() => handleOpenModal(flight)}
                                            style={{ marginRight: '8px' }}
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            className="admin-btn admin-btn-danger admin-btn-sm"
                                            onClick={() => handleDelete(flight.id)}
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>{editingFlight ? 'Edit Flight' : 'Add New Flight'}</h2>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="admin-form-group">
                                    <label>Airline *</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.airline}
                                        onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Flight Number *</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.flight_number}
                                        onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Departure Airport Code * (e.g., SFO)</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.departure_airport}
                                        onChange={(e) => setFormData({ ...formData, departure_airport: e.target.value.toUpperCase() })}
                                        placeholder="SFO"
                                        maxLength="5"
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Arrival Airport Code * (e.g., JFK)</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.arrival_airport}
                                        onChange={(e) => setFormData({ ...formData, arrival_airport: e.target.value.toUpperCase() })}
                                        placeholder="JFK"
                                        maxLength="5"
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Departure Date & Time *</label>
                                    <input
                                        type="datetime-local"
                                        className="admin-form-input"
                                        value={formData.departure_time}
                                        onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Arrival Date & Time *</label>
                                    <input
                                        type="datetime-local"
                                        className="admin-form-input"
                                        value={formData.arrival_time}
                                        onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Duration (minutes)</label>
                                    <input
                                        type="number"
                                        className="admin-form-input"
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                        placeholder="120"
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Status *</label>
                                    <select
                                        className="admin-form-input"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        required
                                    >
                                        <option value="scheduled">Scheduled</option>
                                        <option value="delayed">Delayed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div className="admin-form-group">
                                    <label>Price (USD) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="admin-form-input"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Available Seats *</label>
                                    <input
                                        type="number"
                                        className="admin-form-input"
                                        value={formData.available_seats}
                                        onChange={(e) => setFormData({ ...formData, available_seats: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Total Seats *</label>
                                    <input
                                        type="number"
                                        className="admin-form-input"
                                        value={formData.total_seats}
                                        onChange={(e) => setFormData({ ...formData, total_seats: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Carry-On Fee (USD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="admin-form-input"
                                        value={formData.carry_on_fee}
                                        onChange={(e) => setFormData({ ...formData, carry_on_fee: e.target.value })}
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Checked Bag Fee (USD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="admin-form-input"
                                        value={formData.checked_bag_fee}
                                        onChange={(e) => setFormData({ ...formData, checked_bag_fee: e.target.value })}
                                    />
                                </div>

                                <div className="admin-form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Baggage Allowance</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.baggage_allowance}
                                        onChange={(e) => setFormData({ ...formData, baggage_allowance: e.target.value })}
                                        placeholder="1 Carry-on included"
                                    />
                                </div>
                            </div>

                            <div className="admin-modal-actions">
                                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="admin-btn admin-btn-primary">
                                    {editingFlight ? 'Update Flight' : 'Create Flight'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFlights;
