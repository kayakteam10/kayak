import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, PieChart, Pie,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell
} from 'recharts';
import analyticsApi from '../../services/analyticsApi';

const COLORS = ['#0066CC', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

const ProviderAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [pageClicksData, setPageClicksData] = useState([]);
    const [propertyClicksData, setPropertyClicksData] = useState({ hotel: [], flight: [], car: [] });
    const [leastSeenSections, setLeastSeenSections] = useState([]);
    const [cohortComparison, setCohortComparison] = useState([]);
    const [userTrace, setUserTrace] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(1);

    useEffect(() => {
        fetchProviderAnalytics();
    }, []);

    const fetchProviderAnalytics = async () => {
        try {
            setLoading(true);
            const [pageClicks, hotelClicks, flightClicks, carClicks, leastSeen, locationCohorts] = await Promise.all([
                analyticsApi.pageClicks.getAll({ groupBy: 'page' }),
                analyticsApi.propertyClicks.getAll({ propertyType: 'hotel', limit: 10 }),
                analyticsApi.propertyClicks.getAll({ propertyType: 'flight', limit: 10 }),
                analyticsApi.propertyClicks.getAll({ propertyType: 'car', limit: 10 }),
                analyticsApi.sectionVisibility.getLeastSeen(10),
                analyticsApi.cohorts.getComparison('location')
            ]);

            setPageClicksData(pageClicks.data.data.map(item => ({
                name: item._id.replace('_', ' ').toUpperCase(),
                clicks: item.totalClicks,
                users: item.uniqueUsers
            })));

            setPropertyClicksData({
                hotel: hotelClicks.data.data.map(item => ({ id: item.property_id, clicks: item.clicks, bookings: item.bookings })),
                flight: flightClicks.data.data.map(item => ({ id: item.property_id, clicks: item.clicks, bookings: item.bookings })),
                car: carClicks.data.data.map(item => ({ id: item.property_id, clicks: item.clicks, bookings: item.bookings }))
            });

            setLeastSeenSections(leastSeen.data.data.map(item => ({ name: `${item.page}/${item.section}`, visibility: item.visibility_score })));
            setCohortComparison(locationCohorts.data.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching provider analytics:', error);
            setLoading(false);
        }
    };

    const fetchUserTrace = async (userId) => {
        try {
            const response = await analyticsApi.userTrace.getUserTrace(userId);
            setUserTrace(response.data);
        } catch (error) {
            console.error('Error fetching user trace:', error);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><h2>Loading Provider Analytics...</h2></div>;

    return (
        <div>
            <div className="admin-card" style={{ marginBottom: '24px' }}>
                <h2>📈 Clicks Per Page</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={pageClicksData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="clicks" fill="#0066CC" name="Total Clicks" />
                        <Bar dataKey="users" fill="#4ECDC4" name="Unique Users" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="admin-card" style={{ marginBottom: '24px' }}>
                <h2>👁️ Least Seen Sections</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={leastSeenSections} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={200} />
                        <Tooltip />
                        <Bar dataKey="visibility" fill="#FF6B6B" name="Visibility %" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="admin-card" style={{ marginBottom: '24px' }}>
                <h2>📊 Property Clicks</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                        <Pie
                            data={[
                                { name: 'Hotels', value: propertyClicksData.hotel.reduce((sum, item) => sum + item.clicks, 0) },
                                { name: 'Flights', value: propertyClicksData.flight.reduce((sum, item) => sum + item.clicks, 0) },
                                { name: 'Cars', value: propertyClicksData.car.reduce((sum, item) => sum + item.clicks, 0) }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            outerRadius={120}
                           dataKey="value"
                        >
                            {COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="admin-card">
                <h2>👤 User Trace</h2>
                <div style={{ marginBottom: '20px' }}>
                    <input 
                        type="number" 
                        value={selectedUserId} 
                        onChange={(e) => setSelectedUserId(e.target.value)} 
                        placeholder="Enter User ID"
                        min="1"
                        style={{ 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            border: '1px solid #d1d5db', 
                            marginRight: '10px',
                            width: '150px'
                        }} 
                    />
                    <button onClick={() => fetchUserTrace(selectedUserId)} className="admin-btn admin-btn-primary">Load Trace</button>
                </div>
                {userTrace && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
                            {[
                                { label: 'Activities', value: userTrace.stats.totalActivities, bg: '#667eea' },
                                { label: 'Searches', value: userTrace.stats.totalSearches, bg: '#f093fb' },
                                { label: 'Bookings', value: userTrace.stats.bookings, bg: '#4facfe' },
                                { label: 'Logins', value: userTrace.stats.logins, bg: '#43e97b' }
                            ].map((stat, idx) => (
                                <div key={idx} style={{ background: stat.bg, color: 'white', padding: '20px', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>{stat.label}</div>
                                    <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stat.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProviderAnalytics;
