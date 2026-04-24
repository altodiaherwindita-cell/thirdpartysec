const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const pool = require('../config/database');
const { logger, auditLog } = require('../config/logger');
const validate = require('../middleware/validate');
const { authMiddleware, authorize } = require('../middleware/auth');

// Validation rules
const vendorValidation = [
  body('name').notEmpty().trim().withMessage('Vendor name is required'),
  body('contact_email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('risk_tier').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().isIn(['active', 'archived', 'pending']),
  body('data_classification').optional().isArray(),
  body('critical_system_access').optional().isBoolean(),
  validate
];

// @route   GET /api/vendors
// @desc    Get all vendors with filtering and pagination
// @access  Private (Admin, Analyst, Compliance Officer)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      risk_tier, 
      status, 
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    
    let query = `
      SELECT v.*, u.full_name as created_by_name
      FROM vendors v
      LEFT JOIN users u ON v.created_by = u.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramIndex = 1;

    if (risk_tier) {
      query += ` AND v.risk_tier = $${paramIndex}`;
      values.push(risk_tier);
      paramIndex++;
    }

    if (status) {
      query += ` AND v.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (v.name ILIKE $${paramIndex} OR v.contact_email ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY v.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM vendors v WHERE 1=1`;
    const countValues = [];
    let countParamIndex = 1;

    if (risk_tier) {
      countQuery += ` AND risk_tier = $${countParamIndex}`;
      countValues.push(risk_tier);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countValues.push(status);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (name ILIKE $${countParamIndex} OR contact_email ILIKE $${countParamIndex})`;
      countValues.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        vendors: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get vendors error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching vendors'
    });
  }
});

// @route   GET /api/vendors/:id
// @desc    Get single vendor with full details
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const vendorResult = await pool.query(
      `SELECT v.*, u.full_name as created_by_name
       FROM vendors v
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.id = $1`,
      [id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const vendor = vendorResult.rows[0];

    // Get related data
    const [assessments, risks, documents, dataFlows] = await Promise.all([
      pool.query(
        `SELECT id, questionnaire_id, status, overall_risk_score, created_at, completed_at
         FROM vendor_assessments
         WHERE vendor_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [id]
      ),
      pool.query(
        `SELECT * FROM risks WHERE vendor_id = $1 AND status != 'closed'
         ORDER BY 
           CASE risk_level 
             WHEN 'critical' THEN 1 
             WHEN 'high' THEN 2 
             WHEN 'medium' THEN 3 
             WHEN 'low' THEN 4 
           END`,
        [id]
      ),
      pool.query(
        `SELECT id, document_type, file_name, expiry_date, is_expired, created_at
         FROM documents
         WHERE vendor_id = $1
         ORDER BY created_at DESC`,
        [id]
      ),
      pool.query(
        `SELECT * FROM data_flows WHERE vendor_id = $1 ORDER BY created_at DESC`,
        [id]
      )
    ]);

    // Get timeline activities
    const timelineResult = await pool.query(
      `SELECT 
         al.action,
         al.details,
         al.created_at,
         u.full_name as user_name,
         al.entity_type
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_id = $1
       ORDER BY al.created_at DESC
       LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      data: {
        vendor,
        assessments: assessments.rows,
        risks: risks.rows,
        documents: documents.rows,
        dataFlows: dataFlows.rows,
        timeline: timelineResult.rows
      }
    });
  } catch (error) {
    logger.error('Get vendor details error', { error: error.message, vendorId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor details'
    });
  }
});

// @route   POST /api/vendors
// @desc    Create new vendor
// @access  Private (Admin, Analyst)
router.post('/', authMiddleware, authorize('admin', 'analyst'), vendorValidation, async (req, res) => {
  const {
    name,
    contact_email,
    contact_phone,
    address,
    website,
    industry,
    risk_tier,
    data_classification,
    critical_system_access,
    contract_start_date,
    contract_end_date,
    notes
  } = req.body;

  try {
    // Auto-calculate risk tier if not provided
    let calculatedRiskTier = risk_tier;
    if (!calculatedRiskTier) {
      if (critical_system_access || (data_classification && data_classification.includes('PII'))) {
        calculatedRiskTier = 'high';
      } else {
        calculatedRiskTier = 'medium';
      }
    }

    const result = await pool.query(
      `INSERT INTO vendors (
        name, contact_email, contact_phone, address, website, industry,
        risk_tier, data_classification, critical_system_access,
        contract_start_date, contract_end_date, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        name,
        contact_email,
        contact_phone,
        address,
        website,
        industry,
        calculatedRiskTier,
        data_classification || [],
        critical_system_access || false,
        contract_start_date,
        contract_end_date,
        notes,
        req.user.id
      ]
    );

    const vendor = result.rows[0];

    logger.info('Vendor created', { vendorId: vendor.id, userId: req.user.id });

    await auditLog(
      pool,
      'VENDOR_CREATED',
      req.user.id,
      'vendor',
      vendor.id,
      { name, risk_tier: calculatedRiskTier }
    );

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: { vendor }
    });
  } catch (error) {
    logger.error('Create vendor error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error creating vendor'
    });
  }
});

// @route   PUT /api/vendors/:id
// @desc    Update vendor
// @access  Private (Admin, Analyst)
router.put('/:id', authMiddleware, authorize('admin', 'analyst'), vendorValidation, async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // Remove fields that shouldn't be updated directly
    const { id: _, created_by, created_at, ...validUpdates } = updateData;

    const fields = Object.keys(validUpdates);
    const values = Object.values(validUpdates);

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE vendors SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${fields.length + 1}
       RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    logger.info('Vendor updated', { vendorId: id, userId: req.user.id });

    await auditLog(
      pool,
      'VENDOR_UPDATED',
      req.user.id,
      'vendor',
      id,
      { updates: validUpdates }
    );

    res.json({
      success: true,
      message: 'Vendor updated successfully',
      data: { vendor: result.rows[0] }
    });
  } catch (error) {
    logger.error('Update vendor error', { error: error.message, vendorId: id });
    res.status(500).json({
      success: false,
      message: 'Error updating vendor'
    });
  }
});

// @route   DELETE /api/vendors/:id
// @desc    Archive vendor (soft delete)
// @access  Private (Admin)
router.delete('/:id', authMiddleware, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE vendors SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    logger.info('Vendor archived', { vendorId: id, userId: req.user.id });

    await auditLog(
      pool,
      'VENDOR_ARCHIVED',
      req.user.id,
      'vendor',
      id,
      {}
    );

    res.json({
      success: true,
      message: 'Vendor archived successfully',
      data: { vendor: result.rows[0] }
    });
  } catch (error) {
    logger.error('Archive vendor error', { error: error.message, vendorId: id });
    res.status(500).json({
      success: false,
      message: 'Error archiving vendor'
    });
  }
});

module.exports = router;
