const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    logger.info('User authenticated', { userId: decoded.id, email: decoded.email });
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired. Please login again.' 
      });
    }
    
    logger.warn('Authentication failed', { error: error.message });
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Authorization failed', { 
        userId: req.user.id, 
        requiredRoles: roles,
        userRole: req.user.role 
      });
      
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Vendor token authentication (for secure links)
const vendorAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.params.token || req.query.token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const pool = require('../config/database');
    const result = await pool.query(
      `SELECT va.*, v.name as vendor_name, v.contact_email
       FROM vendor_assessments va
       JOIN vendors v ON va.vendor_id = v.id
       WHERE va.secure_token = $1 
       AND va.token_expires_at > NOW()
       AND va.token_used = false`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    req.vendorAssessment = result.rows[0];
    logger.info('Vendor authenticated via secure token', { 
      assessmentId: result.rows[0].id,
      vendorName: result.rows[0].vendor_name 
    });
    
    next();
  } catch (error) {
    logger.error('Vendor authentication error', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

module.exports = { authMiddleware, authorize, vendorAuthMiddleware };
