const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dbPool = require('../config/database');

class AuthService {
    async register(userData) {
        const { email, password, first_name, last_name } = userData;

        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await dbPool.execute(
            `INSERT INTO users (email, password_hash, first_name, last_name, role, ssn) VALUES (?, ?, ?, ?, 'user', ?)`,
            [email, password_hash, first_name || '', last_name || '', '000-00-0000']
        );

        const token = this.generateToken(result.insertId, email, 'user');

        return { userId: result.insertId, email, token };
    }

    async login(email, password) {
        const [rows] = await dbPool.execute(
            `SELECT * FROM users WHERE email = ?`,
            [email]
        );

        if (rows.length === 0) {
            throw new Error('Invalid credentials');
        }

        const user = rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(user.id, user.email, user.role);

        return {
            userId: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            token
        };
    }

    async getUserProfile(userId) {
        const [rows] = await dbPool.execute(
            `SELECT id, email, first_name, last_name, role, city, state, phone_number, address, zip_code, ssn, profile_picture FROM users WHERE id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            throw new Error('User not found');
        }

        const user = rows[0];
        return {
            userId: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            phone: user.phone_number,
            address: user.address,
            city: user.city,
            state: user.state,
            zipCode: user.zip_code,
            ssn: user.ssn,
            profilePicture: user.profile_picture
        };
    }

    async updateUserProfile(userId, updateData) {
        const { firstName, lastName, phone, address, city, state, zipCode, ssn, profilePicture } = updateData;

        // Validate mandatory fields
        if (!phone) {
            throw new Error('Phone number is required');
        }
        if (!ssn) {
            throw new Error('SSN is required');
        }
        if (!zipCode) {
            throw new Error('ZIP code is required');
        }

        // Check if phone number is unique (excluding current user)
        const [phoneCheck] = await dbPool.execute(
            'SELECT id FROM users WHERE phone_number = ? AND id != ?',
            [phone, userId]
        );
        if (phoneCheck.length > 0) {
            throw new Error('Phone number already exists');
        }

        // Check if SSN is unique (excluding current user)
        const [ssnCheck] = await dbPool.execute(
            'SELECT id FROM users WHERE ssn = ? AND id != ?',
            [ssn, userId]
        );
        if (ssnCheck.length > 0) {
            throw new Error('SSN already exists');
        }

        await dbPool.execute(
            `UPDATE users SET 
                first_name = COALESCE(?, first_name),
                last_name = COALESCE(?, last_name),
                phone_number = ?,
                address = COALESCE(?, address),
                city = COALESCE(?, city),
                state = COALESCE(?, state),
                zip_code = ?,
                ssn = ?,
                profile_picture = COALESCE(?, profile_picture)
            WHERE id = ?`,
            [
                firstName || null,
                lastName || null,
                phone,
                address || null,
                city || null,
                state || null,
                zipCode,
                ssn,
                profilePicture || null,
                userId
            ]
        );

        return this.getUserProfile(userId);
    }

    generateToken(userId, email, role) {
        return jwt.sign(
            { userId, email, role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );
    }
}

module.exports = new AuthService();
