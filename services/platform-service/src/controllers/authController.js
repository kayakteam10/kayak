const authService = require('../services/authService');
const logger = require('../utils/logger');

class AuthController {
    async register(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, error: 'Email and password required' });
            }

            const result = await authService.register(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, error: 'Email already exists' });
            }
            logger.error(`Registration error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            if (error.message === 'Invalid credentials') {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
            logger.error(`Login error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getProfile(req, res) {
        try {
            const result = await authService.getUserProfile(req.user.userId);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            if (error.message === 'User not found') {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            logger.error(`Get user profile error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const result = await authService.updateUserProfile(req.user.userId, req.body);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            logger.error(`Update user profile error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new AuthController();
