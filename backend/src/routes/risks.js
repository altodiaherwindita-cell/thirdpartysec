const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const pool = require('../config/database');
const { logger, auditLog } = require('../config/logger');
const validate = require('../middleware/validate');
const { authMiddleware, authorize } = require('../middleware/auth');

// Validation rules
const riskValidation = [
  body('vendor_id').notEmpty().isUUID().withMessage('Valid vendor ID is required'),
  body('description').notEmpty().trim().withMessage('Risk description is required'),
  body('likelihood').isIn(['low', 'medium', 'high']).withMessage('Invalid likelihood'),
  body('impact').isIn(['low', 'medium', 'high']).withMessage('Invalid impact'),
  body('owner').optional(),
  body('mitigation_plan').optional(),
  body('due_date').optional().isISO8601(),
  validate
];

// Helper: Calculate risk level from likelihood and impact
const calculateRiskLevel = (likelihood, impact) => {
  const matrix = {
    low: { low: 'low', medium: 'low', high: 'medium' },
    medium: { low: 'low', medium: 'medium', high: 'high' },
    high: { low: 'medium', medium: 'high', high: 'critical' }
  };
  
  return matrix[likelihood]?.[impact] || 'medium';
};

// @route   GET /api/risks
// @desc    Get all risks with filtering
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { vendor_id, status, risk_level } = req.query;

    let query = `
      SELECT r.*, v.name as vendor_name, u.full_name as owner_name
      FROM risks r
      JOIN vendors v ON r.vendor_id = v.id
      LEFT JOIN users u ON r.owner_user_id = u.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (vendor_id) {
      query += ` AND r.vendor_id = $${paramIndex}`;
      values.push(vendor_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND r.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (risk_level) {
      query += ` AND r.risk_level = $${paramIndex}`;
      values.push(risk_level);
      paramIndex++;
    }

    query += ` ORDER BY 
      CASE r.risk_level 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      r.created_at DESC`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: { risks: result.rows }
    });
  } catch (error) {
    logger.error('Get risks error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching risks'
    });
  }
});

// @route   POST /api/risks
// @desc    Create new risk
// @access  Private (Admin, Analyst)
router.post('/', authMiddleware, authorize('admin', 'analyst'), riskValidation, async (req, res) => {
  const {
    vendor_id,
    assessment_id,
    description,
    likelihood,
    impact,
    mitigation_plan,
    owner,
    due_date
  } = req.body;

  try {
    const risk_level = calculateRiskLevel(likelihood, impact);

    const result = await pool.query(
      `INSERT INTO risks (
        vendor_id, assessment_id, description, likelihood, impact, 
        risk_level, mitigation_plan, owner, due_date, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
      RETURNING *`,
      [
        vendor_id,
        assessment_id || null,
        description,
        likelihood,
        impact,
        risk_level,
        mitigation_plan || null,
        owner || null,
        due_date || null,
        req.user.id
      ]
    );

    const risk = result.rows[0];

    logger.info('Risk created', { riskId: risk.id, userId: req.user.id });

    await auditLog(
      pool,
      'RISK_CREATED',
      req.user.id,
      'risk',
      risk.id,
      { description, risk_level }
    );

    res.status(201).json({
      success: true,
      message: 'Risk created successfully',
      data: { risk }
    });
  } catch (error) {
    logger.error('Create risk error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error creating risk'
    });
  }
});

// @route   PUT /api/risks/:id
// @desc    Update risk
// @access  Private (Admin, Analyst)
router.put('/:id', authMiddleware, authorize('admin', 'analyst'), async (req, res) => {
  const { id } = req.params;
  const {
    description,
    likelihood,
    impact,
    mitigation_plan,
    owner,
    status,
    due_date
  } = req.body;

  try {
    // Calculate new risk level if likelihood or impact changed
    let risk_level = null;
    if (likelihood && impact) {
      risk_level = calculateRiskLevel(likelihood, impact);
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    
    if (likelihood !== undefined) {
      fields.push(`likelihood = $${paramIndex++}`);
      values.push(likelihood);
    }
    
    if (impact !== undefined) {
      fields.push(`impact = $${paramIndex++}`);
      values.push(impact);
    }
    
    if (risk_level !== null) {
      fields.push(`risk_level = $${paramIndex++}`);
      values.push(risk_level);
    }
    
    if (mitigation_plan !== undefined) {
      fields.push(`mitigation_plan = $${paramIndex++}`);
      values.push(mitigation_plan);
    }
    
    if (owner !== undefined) {
      fields.push(`owner = $${paramIndex++}`);
      values.push(owner);
    }
    
    if (status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(status);
      
      if (status === 'closed') {
        fields.push(`resolved_at = CURRENT_TIMESTAMP`);
      }
    }
    
    if (due_date !== undefined) {
      fields.push(`due_date = $${paramIndex++}`);
      values.push(due_date);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE risks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Risk not found'
      });
    }

    logger.info('Risk updated', { riskId: id, userId: req.user.id });

    await auditLog(
      pool,
      'RISK_UPDATED',
      req.user.id,
      'risk',
      id,
      { updates: req.body }
    );

    res.json({
      success: true,
      message: 'Risk updated successfully',
      data: { risk: result.rows[0] }
    });
  } catch (error) {
    logger.error('Update risk error', { error: error.message, riskId: id });
    res.status(500).json({
      success: false,
      message: 'Error updating risk'
    });
  }
});

// @route   DELETE /api/risks/:id
// @desc    Delete risk
// @access  Private (Admin)
router.delete('/:id', authMiddleware, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM risks WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Risk not found'
      });
    }

    logger.info('Risk deleted', { riskId: id, userId: req.user.id });

    await auditLog(
      pool,
      'RISK_DELETED',
      req.user.id,
      'risk',
      id,
      {}
    );

    res.json({
      success: true,
      message: 'Risk deleted successfully'
    });
  } catch (error) {
    logger.error('Delete risk error', { error: error.message, riskId: id });
    res.status(500).json({
      success: false,
      message: 'Error deleting risk'
    });
  }
});

// @route   GET /api/risks/matrix
// @desc    Get risk matrix data for visualization
// @access  Private
router.get('/matrix', authMiddleware, async (req, res) => {
  try {
    const matrixQuery = `
      SELECT 
        likelihood,
        impact,
        risk_level,
        COUNT(*) as count
      FROM risks
      WHERE status != 'closed'
      GROUP BY likelihood, impact, risk_level
      ORDER BY 
        CASE likelihood WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
        CASE impact WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END
    `;

    const result = await pool.query(matrixQuery);

    // Build 3x3 matrix
    const matrix = {
      high: { high: 0, medium: 0, low: 0 },
      medium: { high: 0, medium: 0, low: 0 },
      low: { high: 0, medium: 0, low: 0 }
    };

    result.rows.forEach(row => {
      if (matrix[row.likelihood]) {
        matrix[row.likelihood][row.impact] = parseInt(row.count);
      }
    });

    res.json({
      success: true,
      data: { matrix, raw: result.rows }
    });
  } catch (error) {
    logger.error('Get risk matrix error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching risk matrix'
    });
  }
});

module.exports = router;
