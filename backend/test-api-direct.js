const express = require('express');
const cors = require('cors');
const pool = require('./config/database');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/hotels/search', async (req, res) => {
  try {
    console.log('Hotel search request received:', req.query);
    const { location, check_in, check_out, guests = 1 } = req.query;

    if (!location || !check_in || !check_out) {
      console.log('Missing parameters:', { location, check_in, check_out });
      return res.status(400).json({ error: 'Missing required search parameters' });
    }

    console.log('Searching hotels for location:', location);
    const result = await pool.query(
      `SELECT * FROM hotels 
       WHERE (LOWER(city) LIKE LOWER(?) OR LOWER(address) LIKE LOWER(?))
       ORDER BY star_rating DESC, user_rating DESC`,
      [`%${location}%`, `%${location}%`]
    );

    console.log('Hotels found:', result.rows.length);
    res.json({
      hotels: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Hotel search error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = 8090;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/health`);
  console.log(`Try: http://localhost:${PORT}/api/hotels/search?location=san francisco&check_in=2025-12-12&check_out=2025-12-13&guests=2`);
});
