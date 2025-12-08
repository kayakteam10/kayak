import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { adminHotelsAPI } from '../../services/adminApi';
import './AdminLayout.css';

const AdminHotels = () => {
    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingHotel, setEditingHotel] = useState(null);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        fetchHotels();
    }, []);

    const fetchHotels = async () => {
        try {
            setLoading(true);
            const response = await adminHotelsAPI.getAll();
            setHotels(response.data.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching hotels:', error);
            setLoading(false);
        }
    };

    const handleEdit = (hotel) => {
        setEditingHotel(hotel);
        setFormData({
            hotel_name: hotel.hotel_name,
            city: hotel.city,
            star_rating: hotel.star_rating,
            price_per_night: hotel.price_per_night,
            available_rooms: hotel.available_rooms
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await adminHotelsAPI.update(editingHotel.id, formData);
            alert('Hotel updated successfully!');
            setEditingHotel(null);
            fetchHotels(); // Refresh the list
        } catch (error) {
            console.error('Error updating hotel:', error);
            alert('Failed to update hotel');
        }
    };

    const handleDelete = async (hotel) => {
        if (window.confirm(`Are you sure you want to delete ${hotel.hotel_name}?`)) {
            try {
                await adminHotelsAPI.delete(hotel.id);
                alert('Hotel deleted successfully!');
                fetchHotels(); // Refresh the list
            } catch (error) {
                console.error('Error deleting hotel:', error);
                alert('Failed to delete hotel');
            }
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="admin-page-header">
                <h1>Hotels</h1>
                <p>Manage hotel listings</p>
            </div>

            <div className="admin-card">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>City</th>
                            <th>Stars</th>
                            <th>Price/Night</th>
                            <th>Available Rooms</th>
                            <th>Rating</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hotels.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                                    No hotels found
                                </td>
                            </tr>
                        ) : (
                            hotels.map((hotel) => (
                                <tr key={hotel.id}>
                                    <td>#{hotel.id}</td>
                                    <td>{hotel.hotel_name}</td>
                                    <td>{hotel.city}</td>
                                    <td>{'⭐'.repeat(Math.floor(hotel.star_rating) || 0)}</td>
                                    <td>${parseFloat(hotel.price_per_night).toFixed(2)}</td>
                                    <td>{hotel.available_rooms}</td>
                                    <td>{hotel.user_rating ? parseFloat(hotel.user_rating).toFixed(1) : '0.0'}</td>
                                    <td>
                                        <button
                                            className="admin-btn admin-btn-secondary admin-btn-sm"
                                            onClick={() => handleEdit(hotel)}
                                            style={{ marginRight: '8px' }}
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            className="admin-btn admin-btn-danger admin-btn-sm"
                                            onClick={() => handleDelete(hotel)}
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

            {/* Edit Modal */}
            {editingHotel && (
                <div className="modal-overlay" onClick={() => setEditingHotel(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Hotel</h2>
                            <button className="modal-close" onClick={() => setEditingHotel(null)}>
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate}>
                            <div className="form-group">
                                <label>Hotel Name</label>
                                <input
                                    type="text"
                                    name="hotel_name"
                                    value={formData.hotel_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Star Rating</label>
                                <input
                                    type="number"
                                    name="star_rating"
                                    value={formData.star_rating}
                                    onChange={handleChange}
                                    min="0"
                                    max="5"
                                    step="0.1"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Price Per Night ($)</label>
                                <input
                                    type="number"
                                    name="price_per_night"
                                    value={formData.price_per_night}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Available Rooms</label>
                                <input
                                    type="number"
                                    name="available_rooms"
                                    value={formData.available_rooms}
                                    onChange={handleChange}
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditingHotel(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="admin-btn admin-btn-primary">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHotels;
