import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { adminHotelsAPI } from '../../services/adminApi';
import './AdminLayout.css';

const AdminHotels = () => {
    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(true);

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
        alert(`Edit hotel #${hotel.id}`);
    };

    const handleDelete = (hotel) => {
        if (window.confirm(`Are you sure you want to delete ${hotel.hotel_name}?`)) {
            alert(`Delete hotel #${hotel.id}`);
        }
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
                                    <td>{hotel.user_rating ? parseFloat(hotel.user_rating).toFixed(1) : 'N/A'}</td>
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
        </div>
    );
};

export default AdminHotels;
