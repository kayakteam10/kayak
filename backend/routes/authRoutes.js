const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Profile routes
router.get('/me', authenticateToken, authController.me);
router.put('/me', authenticateToken, authController.updateMe);

module.exports = router;


