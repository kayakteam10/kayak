import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { adminCarsAPI } from '../../services/adminApi';
import './AdminLayout.css';

const AdminCars = () => {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCar, setEditingCar] = useState(null);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        fetchCars();
    }, []);

    const fetchCars = async () => {
        try {
            setLoading(true);
            const response = await adminCarsAPI.getAll();
            setCars(response.data.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching cars:', error);
            setLoading(false);
        }
    };

    const handleEdit = (car) => {
        setEditingCar(car);
        setFormData({
            company: car.company,
            model: car.model,
            car_type: car.car_type,
            location_city: car.city,
            num_seats: car.num_seats,
            daily_rental_price: car.daily_rental_price,
            status: car.status
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await adminCarsAPI.update(editingCar.id, formData);
            alert('Car updated successfully!');
            setEditingCar(null);
            fetchCars(); // Refresh the list
        } catch (error) {
            console.error('Error updating car:', error);
            alert('Failed to update car');
        }
    };

    const handleDelete = async (car) => {
        if (window.confirm(`Are you sure you want to delete ${car.company} ${car.model}?`)) {
            try {
                await adminCarsAPI.delete(car.id);
                alert('Car deleted successfully!');
                fetchCars(); // Refresh the list
            } catch (error) {
                console.error('Error deleting car:', error);
                alert('Failed to delete car');
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
                <h1>Cars</h1>
                <p>Manage car rental listings</p>
            </div>

            <div className="admin-card">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Make & Model</th>
                            <th>Type</th>
                            <th>City</th>
                            <th>Price/Day</th>
                            <th>Seats</th>
                            <th>Rating</th>
                            <th>Available</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cars.length === 0 ? (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                                    No cars found
                                </td>
                            </tr>
                        ) : (
                            cars.map((car) => (
                                <tr key={car.id}>
                                    <td>#{car.id}</td>
                                    <td>{car.company} {car.model}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{car.car_type}</td>
                                    <td>{car.city}</td>
                                    <td>${parseFloat(car.daily_rental_price).toFixed(2)}</td>
                                    <td>{car.num_seats}</td>
                                    <td>{car.average_rating ? parseFloat(car.average_rating).toFixed(1) + ' ⭐' : '0.0'}</td>
                                    <td>
                                        <span className={`admin-badge ${car.status === 'available' ? 'success' : 'danger'}`}>
                                            {car.status === 'available' ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="admin-btn admin-btn-secondary admin-btn-sm"
                                            onClick={() => handleEdit(car)}
                                            style={{ marginRight: '8px' }}
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            className="admin-btn admin-btn-danger admin-btn-sm"
                                            onClick={() => handleDelete(car)}
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
            {editingCar && (
                <div className="modal-overlay" onClick={() => setEditingCar(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Car</h2>
                            <button className="modal-close" onClick={() => setEditingCar(null)}>
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate}>
                            <div className="form-group">
                                <label>Company</label>
                                <input
                                    type="text"
                                    name="company"
                                    value={formData.company}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Model</label>
                                <input
                                    type="text"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Car Type</label>
                                <select
                                    name="car_type"
                                    value={formData.car_type}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Type</option>
                                    <option value="sedan">Sedan</option>
                                    <option value="suv">SUV</option>
                                    <option value="compact">Compact</option>
                                    <option value="luxury">Luxury</option>
                                    <option value="van">Van</option>
                                    <option value="truck">Truck</option>
                                    <option value="convertible">Convertible</option>
                                    <option value="electric">Electric</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>City</label>
                                <input
                                    type="text"
                                    name="location_city"
                                    value={formData.location_city}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Daily Rental Price ($)</label>
                                <input
                                    type="number"
                                    name="daily_rental_price"
                                    value={formData.daily_rental_price}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Number of Seats</label>
                                <input
                                    type="number"
                                    name="num_seats"
                                    value={formData.num_seats}
                                    onChange={handleChange}
                                    min="1"
                                    max="15"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="available">Available</option>
                                    <option value="unavailable">Unavailable</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditingCar(null)}>
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

export default AdminCars;
