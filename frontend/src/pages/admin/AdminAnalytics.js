import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell, ComposedChart
} from 'recharts';
import { adminAnalyticsAPI } from '../../services/adminApi';
import ProviderAnalytics from './ProviderAnalytics';
import './AdminLayout.css';

// Updated: Added analytics summary endpoint integration
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

const AdminAnalytics = () => {
    // Utility function to format large numbers (K, M, B)
    const formatNumber = (num) => {
        if (!num || num === 0) return '0';
        const absNum = Math.abs(num);
        if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    };

    const [activeTab, setActiveTab] = useState('revenue');
    const [revenueByProperty, setRevenueByProperty] = useState([]);
    const [revenueByCity, setRevenueByCity] = useState([]);
    const [topProviders, setTopProviders] = useState([]);
    const [bookingTrends, setBookingTrends] = useState([]);
    const [analyticsSummary, setAnalyticsSummary] = useState({
        totalBookings: 0,
        totalRevenue: 0,
        activeProperties: 0
    });
    const [reviewsStats, setReviewsStats] = useState({
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviewsByType: { hotel: 0, flight: 0, car: 0 }
    });

    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [trendPeriod, setTrendPeriod] = useState('30days');

    useEffect(() => {
        fetchAnalytics();
    }, [selectedYear, trendPeriod]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);

            // Fetch all analytics with individual error handling
            const results = await Promise.allSettled([
                adminAnalyticsAPI.getSummary(selectedYear, trendPeriod),
                adminAnalyticsAPI.getRevenueByProperty(selectedYear, trendPeriod),
                adminAnalyticsAPI.getRevenueByCity(selectedYear, trendPeriod),
                adminAnalyticsAPI.getTopProviders(),
                adminAnalyticsAPI.getBookingTrends(trendPeriod),
                adminAnalyticsAPI.getReviewsStats()
            ]);

            // Extract data from successful responses
            const [summaryRes, propertyRes, cityRes, providersRes, trendsRes, reviewsRes] = results;

            console.log('Analytics Responses:', results);

            setAnalyticsSummary(
                summaryRes.status === 'fulfilled' && summaryRes.value?.data?.data
                    ? summaryRes.value.data.data
                    : { totalBookings: 0, totalRevenue: 0, activeProperties: 0 }
            );
            setRevenueByProperty(
                propertyRes.status === 'fulfilled' && propertyRes.value?.data?.data
                    ? propertyRes.value.data.data
                    : []
            );
            setRevenueByCity(
                cityRes.status === 'fulfilled' && cityRes.value?.data?.data
                    ? cityRes.value.data.data
                    : []
            );
            setTopProviders(
                providersRes.status === 'fulfilled' && providersRes.value?.data?.data
                    ? providersRes.value.data.data
                    : []
            );
            setBookingTrends(
                trendsRes.status === 'fulfilled' && trendsRes.value?.data?.data
                    ? trendsRes.value.data.data
                    : []
            );
            setReviewsStats(
                reviewsRes.status === 'fulfilled' && reviewsRes.value?.data?.data
                    ? reviewsRes.value.data.data
                    : { totalReviews: 0, averageRating: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, reviewsByType: { hotel: 0, flight: 0, car: 0 } }
            );
            setLoading(false);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setLoading(false);
        }
    };

    // Process booking trends data for charts
    const processedTrends = () => {
        const grouped = {};
        bookingTrends.forEach(item => {
            const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!grouped[date]) {
                grouped[date] = { date, flight: 0, hotel: 0, car: 0, total: 0, revenue: 0 };
            }
            grouped[date][item.booking_type] = parseInt(item.count);
            grouped[date].total += parseInt(item.count);
            grouped[date].revenue += parseFloat(item.revenue || 0);
        });
        return Object.values(grouped);
    };

    // Calculate summary metrics from analyticsSummary
    const totalRevenue = parseFloat(analyticsSummary.totalRevenue || 0);
    const totalBookings = parseInt(analyticsSummary.totalBookings || 0);
    const avgRevenuePerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    console.log('Current Analytics Summary State:', analyticsSummary);
    console.log('Calculated totalRevenue:', totalRevenue, 'totalBookings:', totalBookings);

    if (loading) {
        return (
            <div className="admin-card" style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', color: '#666' }}>⏳ Loading analytics...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="admin-page-header">
                <h1>📊 Analytics Dashboard</h1>
                <p>Comprehensive business insights and performance metrics</p>
            </div>

            {/* Tab Navigation */}
            <div className="analytics-tabs">
                <button
                    className={`analytics-tab ${activeTab === 'revenue' ? 'active' : ''}`}
                    onClick={() => setActiveTab('revenue')}
                >
                    💰 Revenue & Bookings
                </button>
                <button
                    className={`analytics-tab ${activeTab === 'provider' ? 'active' : ''}`}
                    onClick={() => setActiveTab('provider')}
                >
                    📊 Provider Analytics
                </button>
            </div>

            {/* Revenue Analytics Tab */}
            {activeTab === 'revenue' && (
                <>
                    {/* Filter Controls */}
                    <div className="admin-card" style={{ marginBottom: '24px', padding: '20px' }}>
                        <div style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div>
                                <label style={{ marginRight: '10px', fontWeight: '600', color: '#555' }}>📅 Year:</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="admin-form-input"
                                    style={{ width: '120px', display: 'inline-block', padding: '8px' }}
                                >
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ marginRight: '10px', fontWeight: '600', color: '#555' }}>📈 Trend Period:</label>
                                <select
                                    value={trendPeriod}
                                    onChange={(e) => setTrendPeriod(e.target.value)}
                                    className="admin-form-input"
                                    style={{ width: '150px', display: 'inline-block', padding: '8px' }}
                                >
                                    <option value="7days">Last 7 Days</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="90days">Last 90 Days</option>
                                    <option value="1year">Last Year</option>
                                </select>
                            </div>
                            <button
                                onClick={fetchAnalytics}
                                className="admin-btn admin-btn-primary"
                                style={{ marginLeft: 'auto' }}
                            >
                                🔄 Refresh Data
                            </button>
                        </div>
                    </div>

                    {/* Key Metrics Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        <div className="admin-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '24px' }}>
                            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>💰 Total Revenue ({selectedYear})</div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                ${formatNumber(totalRevenue)}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
                                {totalBookings > 0 ? `${totalBookings.toLocaleString()} bookings` : 'No bookings yet'}
                            </div>
                        </div>

                        <div className="admin-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', padding: '24px' }}>
                            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>📊 Avg Revenue/Booking</div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                ${formatNumber(avgRevenuePerBooking)}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>Per transaction</div>
                        </div>

                        <div className="admin-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', padding: '24px' }}>
                            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>🏨 Active Properties</div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{analyticsSummary.activeProperties || 0}</div>
                            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
                                {analyticsSummary.activeProperties > 0 ? 'Generating revenue' : 'Awaiting bookings'}
                            </div>
                        </div>

                        <div className="admin-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white', padding: '24px' }}>
                            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>⭐ Total Reviews</div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{reviewsStats?.totalReviews || 0}</div>
                            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
                                {(reviewsStats?.averageRating || 0) > 0 ? `Avg: ${(reviewsStats?.averageRating || 0).toFixed(1)} ⭐` : 'No reviews yet'}
                            </div>
                        </div>
                    </div>

                    {/* Top 10 Properties with Revenue */}
                    <div className="admin-card" style={{ marginBottom: '24px' }}>
                        <div className="admin-card-header">
                            <h2>🏆 Top 10 Properties by Revenue</h2>
                        </div>
                        <div style={{ padding: '20px' }}>
                            {revenueByProperty.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                    No revenue data available
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={400}>
                                    <ComposedChart data={revenueByProperty}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Bookings', angle: 90, position: 'insideRight' }} />
                                        <Tooltip
                                            formatter={(value, name) => {
                                                if (name === 'Revenue ($)') return [`$${formatNumber(value)}`, 'Revenue'];
                                                return [value, 'Bookings'];
                                            }}
                                        />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                                        <Bar yAxisId="right" dataKey="bookings" fill="#82ca9d" name="Bookings" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Revenue by City */}
                    <div className="admin-card" style={{ marginBottom: '24px' }}>
                        <div className="admin-card-header">
                            <h2>🌆 City-wise Revenue Distribution</h2>
                        </div>
                        <div style={{ padding: '20px' }}>
                            {revenueByCity.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                    No city revenue data available
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                    {/* Left: Horizontal Bar Chart */}
                                    <div>
                                        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#333' }}>📊 Revenue by City (Top 10)</h3>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={revenueByCity.slice(0, 10)} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="city" type="category" width={100} />
                                                <Tooltip
                                                    formatter={(value) => [`$${formatNumber(value)}`, 'Revenue']}
                                                    labelFormatter={(label) => `City: ${label}`}
                                                />
                                                <Bar dataKey="revenue" fill="#8884d8" radius={[0, 8, 8, 0]}>
                                                    {revenueByCity.slice(0, 10).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Right: Stats Cards and Rankings */}
                                    <div>
                                        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#333' }}>🏆 City Rankings</h3>

                                        {/* Top 3 Cities */}
                                        <div style={{ marginBottom: '20px' }}>
                                            {revenueByCity.slice(0, 3).map((city, index) => (
                                                <div
                                                    key={index}
                                                    style={{
                                                        background: index === 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                                                            index === 1 ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                                                                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                                        color: 'white',
                                                        padding: '16px',
                                                        borderRadius: '12px',
                                                        marginBottom: '12px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                                        </div>
                                                        <div style={{ fontSize: '18px', fontWeight: '700' }}>{city.city}</div>
                                                        <div style={{ fontSize: '12px', opacity: 0.9 }}>{city.bookings} bookings</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '24px', fontWeight: '700' }}>
                                                            ${formatNumber(parseFloat(city.revenue))}
                                                        </div>
                                                        <div style={{ fontSize: '12px', opacity: 0.9 }}>
                                                            ${formatNumber(parseFloat(city.revenue) / city.bookings)}/booking
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Remaining Cities Table */}
                                        {revenueByCity.length > 3 && (
                                            <div>
                                                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#666' }}>Other Cities</h4>
                                                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                                                    <table className="admin-table" style={{ fontSize: '13px' }}>
                                                        <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                                                            <tr>
                                                                <th style={{ padding: '8px' }}>Rank</th>
                                                                <th style={{ padding: '8px' }}>City</th>
                                                                <th style={{ padding: '8px', textAlign: 'right' }}>Revenue</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {revenueByCity.slice(3).map((city, index) => (
                                                                <tr key={index}>
                                                                    <td style={{ padding: '8px' }}>#{index + 4}</td>
                                                                    <td style={{ padding: '8px' }}>{city.city}</td>
                                                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#0088FE' }}>
                                                                        ${formatNumber(parseFloat(city.revenue))}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Providers (Last Month) */}
                    <div className="admin-card" style={{ marginBottom: '24px' }}>
                        <div className="admin-card-header">
                            <h2>🥇 Top 10 Providers - Last Month Performance</h2>
                        </div>
                        <div style={{ padding: '20px' }}>
                            {topProviders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                    No data available for top providers
                                </div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Provider Name</th>
                                            <th>Type</th>
                                            <th>Properties Sold</th>
                                            <th>Revenue Generated</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topProviders.map((provider, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <span style={{
                                                        fontSize: '20px',
                                                        fontWeight: 'bold',
                                                        color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#666'
                                                    }}>
                                                        #{index + 1}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: '600' }}>{provider.provider_name}</td>
                                                <td>
                                                    <span className="admin-badge info">{provider.type}</span>
                                                </td>
                                                <td>{provider.properties_sold}</td>
                                                <td style={{ fontWeight: '600', color: '#00C49F' }}>
                                                    ${formatNumber(parseFloat(provider.revenue))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Booking Trends Over Time */}
                    <div className="admin-card" style={{ marginBottom: '24px' }}>
                        <div className="admin-card-header">
                            <h2>📈 Booking Trends - {trendPeriod.replace('days', ' Days').replace('1year', '1 Year')}</h2>
                        </div>
                        <div style={{ padding: '20px' }}>
                            {processedTrends().length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                    No booking trend data available for selected period
                                </div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <AreaChart data={processedTrends()}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Area type="monotone" dataKey="flight" stackId="1" stroke="#8884d8" fill="#8884d8" name="Flights" />
                                            <Area type="monotone" dataKey="hotel" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Hotels" />
                                            <Area type="monotone" dataKey="car" stackId="1" stroke="#ffc658" fill="#ffc658" name="Cars" />
                                        </AreaChart>
                                    </ResponsiveContainer>

                                    <div style={{ marginTop: '24px' }}>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <LineChart data={processedTrends()}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" />
                                                <YAxis />
                                                <Tooltip formatter={(value) => `$${formatNumber(value)}`} />
                                                <Legend />
                                                <Line type="monotone" dataKey="revenue" stroke="#ff7c7c" strokeWidth={2} name="Revenue ($)" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Reviews Overview */}
                    <div className="admin-card">
                        <div className="admin-card-header">
                            <h2>⭐ Reviews & Ratings Overview</h2>
                        </div>
                        <div style={{ padding: '30px', textAlign: 'center' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px', marginBottom: '30px' }}>
                                <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#0088FE', marginBottom: '8px' }}>
                                        {reviewsStats?.totalReviews || 0}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Total Reviews</div>
                                </div>
                                <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#FFBB28', marginBottom: '8px' }}>
                                        {(reviewsStats?.averageRating || 0).toFixed(1)} ⭐
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Average Rating</div>
                                </div>
                            </div>

                            {reviewsStats && reviewsStats.reviewsByType && (
                                <div style={{ marginTop: '20px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', textAlign: 'left' }}>Reviews by Category</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
                                        <div style={{ padding: '16px', background: '#e3f2fd', borderRadius: '8px', minWidth: '120px' }}>
                                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0088FE' }}>
                                                {reviewsStats.reviewsByType.flight || 0}
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>🛫 Flight Reviews</div>
                                        </div>
                                        <div style={{ padding: '16px', background: '#e8f5e9', borderRadius: '8px', minWidth: '120px' }}>
                                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#00C49F' }}>
                                                {reviewsStats.reviewsByType.hotel || 0}
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>🏨 Hotel Reviews</div>
                                        </div>
                                        <div style={{ padding: '16px', background: '#fff3e0', borderRadius: '8px', minWidth: '120px' }}>
                                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFBB28' }}>
                                                {reviewsStats.reviewsByType.car || 0}
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>🚗 Car Reviews</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Provider Analytics Tab */}
            {activeTab === 'provider' && <ProviderAnalytics />}
        </div>
    );
};

export default AdminAnalytics;
