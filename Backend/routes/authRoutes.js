const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/auth');
const { logAuditAction } = require('../middlewares/audit');

const { authLimiter } = require('../middlewares/rateLimiter');
const { registerValidation, loginValidation } = require('../middlewares/validator');

// Public routes
router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, logAuditAction('user_login'), authController.login);
router.post('/refresh-token', authLimiter, authController.refreshToken);

// Protected routes
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, logAuditAction('update_profile'), authController.updateProfile);
router.post('/logout', verifyToken, logAuditAction('user_logout'), authController.logout);

module.exports = router;
