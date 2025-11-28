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

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, phone, role) VALUES (?, ?, ?, ?, NULL, ?)',
      [email, hashedPassword, firstName, lastName, role]
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
    
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, phone, role, profile_picture, 
              ssn, address, city, state, zip_code, credit_card_last4, credit_card_type 
       FROM users WHERE id = ?`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const u = result.rows[0];
    res.json({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone || '',
      profilePicture: u.profile_picture || '',
      ssn: u.ssn || '',
      address: u.address || '',
      city: u.city || '',
      state: u.state || '',
      zipCode: u.zip_code || '',
      creditCardLast4: u.credit_card_last4 || '',
      creditCardType: u.credit_card_type || ''
    });
  } catch (error) {
    console.error(error);
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
      profilePicture,
      ssn,
      address,
      city,
      state,
      zipCode,
      creditCardLast4,
      creditCardType
    } = req.body;

    // Validate the user data
    const validation = validateUserProfile({
      email: req.user.email, // Already validated email from token
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

    // Update user profile
    await pool.query(
      `UPDATE users SET 
        first_name = ?, 
        last_name = ?, 
        phone = ?, 
        profile_picture = ?,
        ssn = ?,
        address = ?,
        city = ?,
        state = ?,
        zip_code = ?,
        credit_card_last4 = ?,
        credit_card_type = ?
      WHERE id = ?`,
      [
        firstName || null, 
        lastName || null, 
        phone || null, 
        profilePicture || null,
        ssn || null,
        address || null,
        city || null,
        state ? state.toUpperCase() : null,
        zipCode || null,
        creditCardLast4 || null,
        creditCardType || null,
        userId
      ]
    );
    
    // Get updated user
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, phone, profile_picture,
              ssn, address, city, state, zip_code, credit_card_last4, credit_card_type
       FROM users WHERE id = ?`,
      [userId]
    );
    
    const u = result.rows[0];
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        phone: u.phone || '',
        profilePicture: u.profile_picture || '',
        ssn: u.ssn || '',
        address: u.address || '',
        city: u.city || '',
        state: u.state || '',
        zipCode: u.zip_code || '',
        creditCardLast4: u.credit_card_last4 || '',
        creditCardType: u.credit_card_type || ''
      }
    });
  } catch (error) {
    console.error(error);
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


