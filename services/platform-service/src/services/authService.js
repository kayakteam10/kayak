const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dbPool = require('../config/database');

const { connectToMongo } = require('../config/mongo');
const { ObjectId } = require('mongodb');

class AuthService {
    async register(userData) {
        const { email, password, first_name, last_name, ssn } = userData;

        const password_hash = await bcrypt.hash(password, 10);

        // Use provided SSN or a temporary placeholder if allowed (but DB requires unique)
        // For simulation, if no SSN provided, generate a random one to avoid collision
        const finalSSN = ssn || `000-${Math.floor(Math.random() * 100)}-${Math.floor(Math.random() * 10000)}`;

        const [result] = await dbPool.execute(
            `INSERT INTO users (email, password_hash, first_name, last_name, role, ssn) VALUES (?, ?, ?, ?, 'user', ?)`,
            [email, password_hash, first_name || '', last_name || '', finalSSN]
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
            `SELECT id, email, first_name, last_name, role, city, state, phone_number, address, zip_code, ssn, mongo_image_id FROM users WHERE id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            throw new Error('User not found');
        }

        const user = rows[0];
        let profilePicture = null;

        // Fetch image from MongoDB if ID exists
        if (user.mongo_image_id) {
            try {
                const db = await connectToMongo();
                const imageDoc = await db.collection('images').findOne({ _id: new ObjectId(user.mongo_image_id) });
                if (imageDoc) {
                    profilePicture = imageDoc.data;
                }
            } catch (err) {
                console.error('Failed to fetch profile picture from Mongo:', err);
            }
        }

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
            profilePicture: profilePicture
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

        let mongoImageId = null;

        // Handle Profile Picture: Store in MongoDB if provided
        if (profilePicture && profilePicture.startsWith('data:image')) {
            try {
                const db = await connectToMongo();
                const result = await db.collection('images').insertOne({
                    userId: userId,
                    data: profilePicture,
                    updatedAt: new Date()
                });
                mongoImageId = result.insertedId.toString();
            } catch (err) {
                console.error('Failed to save profile picture to Mongo:', err);
                // Fallback: Don't update image if Mongo fails, or handle as error
            }
        }

        // Construct update query dynamically based on whether image was updated
        let sql = `UPDATE users SET 
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            phone_number = ?,
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            state = COALESCE(?, state),
            zip_code = ?,
            ssn = ?`;

        const params = [
            firstName || null,
            lastName || null,
            phone,
            address || null,
            city || null,
            state || null,
            zipCode,
            ssn
        ];

        if (mongoImageId) {
            sql += `, mongo_image_id = ?`;
            params.push(mongoImageId);
        }

        sql += ` WHERE id = ?`;
        params.push(userId);

        await dbPool.execute(sql, params);

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
