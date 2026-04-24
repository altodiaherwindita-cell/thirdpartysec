const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, param } = require('express-validator');
const pool = require('../config/database');
const { logger, auditLog } = require('../config/logger');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const express = require('express');
const router = express.Router();

// Apply rate limiting to auth endpoints
router.use(authLimiter);

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

// @route   POST /api/auth/login
// @desc    User login
// @access  Public
router.post('/login', loginValidation, async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      logger.warn('Login failed - user not found', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      logger.warn('Login failed - invalid password', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info('User logged in successfully', { userId: user.id, email });

    await auditLog(
      pool,
      'USER_LOGIN',
      user.id,
      'user',
      user.id,
      { action: 'login', ip: req.ip }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          department: user.department
        }
      }
    });
  } catch (error) {
    logger.error('Login error', { error: error.message, email });
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', require('../middleware/auth').authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, department, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user: result.rows[0] }
    });
  } catch (error) {
    logger.error('Get current user error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
});

module.exports = router;
