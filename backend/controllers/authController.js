const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { validateUserProfile, validateEmail } = require('../utils/validation');

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'user' } = req.body;

    // Validate email format
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.error });
    }

    // Check if user exists (duplicate prevention)
    const userExists = await pool.query(
      'SELECT email FROM users WHERE email = ?',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique SSN (for demo purposes - in production, this would be handled differently)
    const ssn = `999-${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, ssn, role) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, firstName, lastName, ssn, role]
    );

    // Get the inserted user
    const userId = result.insertId || result.rows[0]?.id;
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
      [userId]
    );
    const user = userResult.rows[0] || { id: userId, email, first_name: firstName, last_name: lastName };

    res.status(201).json({
      message: 'User registered successfully',
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Logout user
const logout = (req, res) => {
  res.json({ message: 'Logout successful' });
};

// Get current user profile
const me = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Fetch user from MySQL
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, phone_number, role, 
              ssn, address, city, state, zip_code, credit_card_last4 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = result.rows[0];

    // 2. Fetch profile image from MongoDB (if exists)
    let profileImage = null;
    try {
      const { getUserProfileImage } = require('../utils/mongoHelpers');
      profileImage = await getUserProfileImage(userId);
    } catch (mongoError) {
      console.error('MongoDB image fetch error:', mongoError);
      // Continue without image if MongoDB fails
    }

    // 3. Return combined data from MySQL and MongoDB
    res.json({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone_number || '',

      // Image data from MongoDB (base64)
      profilePicture: profileImage?.base64_data || '',

      ssn: u.ssn || '',
      address: u.address || '',
      city: u.city || '',
      state: u.state || '',
      zipCode: u.zip_code || '',
      creditCardLast4: u.credit_card_last4 || ''
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update current user profile
const updateMe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      firstName,
      lastName,
      phone,
      profilePicture,  // Base64 string from frontend
      ssn,
      address,
      city,
      state,
      zipCode,
      creditCardLast4
    } = req.body;

    // Validate the user data
    const validation = validateUserProfile({
      email: req.user.email,
      ssn,
      zip_code: zipCode,
      state,
      phone,
      credit_card_last4: creditCardLast4
    });

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        validationErrors: validation.errors
      });
    }

    // Check for duplicate SSN if provided
    if (ssn) {
      const ssnCheck = await pool.query(
        'SELECT id FROM users WHERE ssn = ? AND id != ?',
        [ssn, userId]
      );
      if (ssnCheck.rows.length > 0) {
        return res.status(400).json({ error: 'SSN already registered to another user' });
      }
    }

    // Handle profile picture upload to MongoDB
    if (profilePicture && profilePicture.startsWith('data:image')) {
      const { saveUserProfileImage } = require('../utils/mongoHelpers');

      // Extract MIME type from data URI
      const mimeMatch = profilePicture.match(/data:(image\/\w+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      // Validate size (5MB limit for profile pictures)
      const sizeInBytes = Math.round((profilePicture.length * 3) / 4);
      if (sizeInBytes > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image too large (max 5MB for profile pictures)' });
      }

      try {
        // Save image to MongoDB
        await saveUserProfileImage(userId, profilePicture, mimeType);
      } catch (mongoError) {
        console.error('MongoDB save error:', mongoError);
        return res.status(500).json({ error: 'Failed to save profile picture' });
      }
    }

    // Update user profile in MySQL
    await pool.query(
      `UPDATE users SET 
        first_name = ?, 
        last_name = ?, 
        phone_number = ?, 
        ssn = ?,
        address = ?,
        city = ?,
        state = ?,
        zip_code = ?,
        credit_card_last4 = ?
      WHERE id = ?`,
      [
        firstName || null,
        lastName || null,
        phone || null,
        ssn || null,
        address || null,
        city || null,
        state ? state.toUpperCase() : null,
        zipCode || null,
        creditCardLast4 || null,
        userId
      ]
    );

    // Return updated user data using me() function
    return me(req, res);

  } catch (error) {
    console.error('Error in updateMe:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  logout,
  me,
  updateMe
};


