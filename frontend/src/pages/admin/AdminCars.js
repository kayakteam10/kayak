import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { adminCarsAPI } from '../../services/adminApi';
import './AdminLayout.css';

const AdminCars = () => {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);

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
        alert(`Edit car #${car.id}`);
    };

    const handleDelete = (car) => {
        if (window.confirm(`Are you sure you want to delete ${car.company} ${car.model}?`)) {
            alert(`Delete car #${car.id}`);
        }
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
                                    <td>{car.average_rating ? parseFloat(car.average_rating).toFixed(1) + ' ⭐' : 'N/A'}</td>
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
        </div>
    );
};

export default AdminCars;
