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
        departure_city: '',
        arrival_city: '',
        departure_time: '',
        arrival_time: '',
        price: '',
        available_seats: '',
        total_seats: '',
        aircraft_type: 'Boeing 737',
        carry_on_fee: '0',
        checked_bag_fee: '0',
        baggage_allowance: '1 carry-on, 1 checked bag'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchFlights();
    }, []);

    const fetchFlights = async () => {
        try {
            setLoading(true);
            const response = await adminFlightsAPI.getAll();
            setFlights(response.data.flights);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching flights:', error);
            setLoading(false);
        }
    };

    const handleOpenModal = (flight = null) => {
        if (flight) {
            setEditingFlight(flight);
            setFormData({
                airline: flight.airline,
                flight_number: flight.flight_number,
                departure_city: flight.departure_city,
                arrival_city: flight.arrival_city,
                departure_time: flight.departure_time,
                arrival_time: flight.arrival_time,
                price: flight.price,
                available_seats: flight.available_seats,
                total_seats: flight.total_seats || flight.available_seats,
                aircraft_type: flight.aircraft_type || 'Boeing 737',
                carry_on_fee: flight.carry_on_fee || '0',
                checked_bag_fee: flight.checked_bag_fee || '0',
                baggage_allowance: flight.baggage_allowance || '1 carry-on, 1 checked bag'
            });
        } else {
            setEditingFlight(null);
            setFormData({
                airline: '',
                flight_number: '',
                departure_city: '',
                arrival_city: '',
                departure_time: '',
                arrival_time: '',
                price: '',
                available_seats: '',
                total_seats: '',
                aircraft_type: 'Boeing 737',
                carry_on_fee: '0',
                checked_bag_fee: '0',
                baggage_allowance: '1 carry-on, 1 checked bag'
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
                            <th>Price</th>
                            <th>Seats</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {flights.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                                    No flights found. Click "Add Flight" to create one.
                                </td>
                            </tr>
                        ) : (
                            flights.map((flight) => (
                                <tr key={flight.id}>
                                    <td>{flight.flight_number}</td>
                                    <td>{flight.airline}</td>
                                    <td>{flight.departure_city} → {flight.arrival_city}</td>
                                    <td>{flight.departure_time?.slice(0, 5)}</td>
                                    <td>{flight.arrival_time?.slice(0, 5)}</td>
                                    <td>${parseFloat(flight.price).toFixed(2)}</td>
                                    <td>{flight.available_seats}/{flight.total_seats || flight.available_seats}</td>
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
                                    <label>Departure City *</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.departure_city}
                                        onChange={(e) => setFormData({ ...formData, departure_city: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Arrival City *</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.arrival_city}
                                        onChange={(e) => setFormData({ ...formData, arrival_city: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Departure Time *</label>
                                    <input
                                        type="time"
                                        className="admin-form-input"
                                        value={formData.departure_time}
                                        onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Arrival Time *</label>
                                    <input
                                        type="time"
                                        className="admin-form-input"
                                        value={formData.arrival_time}
                                        onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label>Price *</label>
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
