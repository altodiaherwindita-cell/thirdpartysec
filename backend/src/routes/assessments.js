const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const pool = require('../config/database');
const { logger, auditLog } = require('../config/logger');
const validate = require('../middleware/validate');
const { authMiddleware, authorize, vendorAuthMiddleware } = require('../middleware/auth');
const { vendorLinkLimiter } = require('../middleware/rateLimiter');
const emailService = require('../services/emailService');
const aiService = require('../services/aiService');

// Validation rules
const assessmentValidation = [
  body('vendor_id').notEmpty().isUUID().withMessage('Valid vendor ID is required'),
  body('questionnaire_id').optional().isUUID(),
  validate
];

const responseValidation = [
  body('responses').isArray().withMessage('Responses must be an array'),
  body('responses.*.question_id').notEmpty().isUUID(),
  body('responses.*.answer').optional(),
  body('responses.*.answer_json').optional(),
  validate
];

// @route   POST /api/assessments
// @desc    Create new vendor assessment with secure token
// @access  Private (Admin, Analyst)
router.post('/', authMiddleware, authorize('admin', 'analyst'), assessmentValidation, async (req, res) => {
  const { vendor_id, questionnaire_id, token_expires_days = 7 } = req.body;

  try {
    // Verify vendor exists
    const vendorCheck = await pool.query('SELECT id, name FROM vendors WHERE id = $1', [vendor_id]);
    if (vendorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Generate secure token
    const secureToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + parseInt(token_expires_days));

    const result = await pool.query(
      `INSERT INTO vendor_assessments (
        vendor_id, questionnaire_id, secure_token, token_expires_at, 
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [vendor_id, questionnaire_id, secureToken, tokenExpiresAt, 'pending', req.user.id]
    );

    const assessment = result.rows[0];

    // Generate secure link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const secureLink = `${frontendUrl}/assessment/${secureToken}`;

    logger.info('Assessment created', { 
      assessmentId: assessment.id, 
      vendorId: vendor_id,
      userId: req.user.id 
    });

    await auditLog(
      pool,
      'ASSESSMENT_CREATED',
      req.user.id,
      'vendor_assessment',
      assessment.id,
      { vendor_id, questionnaire_id, secure_link: secureLink }
    );

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      data: {
        assessment,
        secureLink,
        tokenExpiresAt
      }
    });
  } catch (error) {
    logger.error('Create assessment error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error creating assessment'
    });
  }
});

// @route   POST /api/assessments/:token/send
// @desc    Send assessment link to vendor via email
// @access  Private (Admin, Analyst)
router.post('/:token/send', authMiddleware, authorize('admin', 'analyst'), async (req, res) => {
  const { token } = req.params;
  const { custom_message } = req.body;

  try {
    const assessmentResult = await pool.query(
      `SELECT va.*, v.name as vendor_name, v.contact_email, q.name as questionnaire_name
       FROM vendor_assessments va
       JOIN vendors v ON va.vendor_id = v.id
       LEFT JOIN questionnaires q ON va.questionnaire_id = q.id
       WHERE va.secure_token = $1`,
      [token]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    const assessment = assessmentResult.rows[0];

    if (!assessment.contact_email) {
      return res.status(400).json({
        success: false,
        message: 'Vendor contact email not set'
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const secureLink = `${frontendUrl}/assessment/${token}`;

    // Send email
    await emailService.sendAssessmentInvite({
      to: assessment.contact_email,
      vendorName: assessment.vendor_name,
      questionnaireName: assessment.questionnaire_name || 'Security Assessment',
      secureLink,
      expiresAt: assessment.token_expires_at,
      customMessage: custom_message
    });

    logger.info('Assessment invite sent', { 
      assessmentId: assessment.id, 
      vendorEmail: assessment.contact_email 
    });

    await auditLog(
      pool,
      'ASSESSMENT_INVITE_SENT',
      req.user.id,
      'vendor_assessment',
      assessment.id,
      { recipient: assessment.contact_email }
    );

    res.json({
      success: true,
      message: 'Assessment invite sent successfully'
    });
  } catch (error) {
    logger.error('Send assessment invite error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error sending assessment invite'
    });
  }
});

// @route   GET /api/assessments/vendor/:token
// @desc    Get assessment details for vendor (token-based auth)
// @access  Public (with valid token)
router.get('/vendor/:token', vendorLinkLimiter, vendorAuthMiddleware, async (req, res) => {
  try {
    const { token } = req.params;
    const assessment = req.vendorAssessment;

    // Get questionnaire with questions
    const questionnaireResult = await pool.query(
      `SELECT q.* FROM questionnaires q
       WHERE q.id = $1 AND q.is_active = true`,
      [assessment.questionnaire_id]
    );

    if (questionnaireResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire not found or inactive'
      });
    }

    const questionnaire = questionnaireResult.rows[0];

    // Get questions
    const questionsResult = await pool.query(
      `SELECT * FROM questions 
       WHERE questionnaire_id = $1 
       ORDER BY section, order_index`,
      [assessment.questionnaire_id]
    );

    // Get existing responses if any
    const responsesResult = await pool.query(
      `SELECT * FROM assessment_responses WHERE assessment_id = $1`,
      [assessment.id]
    );

    // Mark assessment as in_progress if pending
    if (assessment.status === 'pending') {
      await pool.query(
        `UPDATE vendor_assessments 
         SET status = 'in_progress', started_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [assessment.id]
      );
    }

    res.json({
      success: true,
      data: {
        assessment: {
          id: assessment.id,
          vendorName: assessment.vendor_name,
          status: assessment.status,
          tokenExpiresAt: assessment.token_expires_at
        },
        questionnaire,
        questions: questionsResult.rows,
        existingResponses: responsesResult.rows
      }
    });
  } catch (error) {
    logger.error('Get vendor assessment error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching assessment'
    });
  }
});

// @route   PUT /api/assessments/vendor/:token/responses
// @desc    Submit/update assessment responses (vendor)
// @access  Public (with valid token)
router.put('/vendor/:token/responses', vendorAuthMiddleware, responseValidation, async (req, res) => {
  const { responses } = req.body;
  const assessment = req.vendorAssessment;

  try {
    // Process each response
    for (const response of responses) {
      const { question_id, answer, answer_json } = response;

      // Check if response exists
      const existingResponse = await pool.query(
        `SELECT id FROM assessment_responses 
         WHERE assessment_id = $1 AND question_id = $2`,
        [assessment.id, question_id]
      );

      if (existingResponse.rows.length > 0) {
        // Update existing response
        await pool.query(
          `UPDATE assessment_responses 
           SET answer = $1, answer_json = $2, updated_at = CURRENT_TIMESTAMP
           WHERE assessment_id = $3 AND question_id = $4`,
          [answer || null, answer_json ? JSON.stringify(answer_json) : null, assessment.id, question_id]
        );
      } else {
        // Insert new response
        await pool.query(
          `INSERT INTO assessment_responses (assessment_id, question_id, answer, answer_json)
           VALUES ($1, $2, $3, $4)`,
          [assessment.id, question_id, answer || null, answer_json ? JSON.stringify(answer_json) : null]
        );
      }
    }

    logger.info('Assessment responses saved', { assessmentId: assessment.id });

    res.json({
      success: true,
      message: 'Responses saved successfully'
    });
  } catch (error) {
    logger.error('Save responses error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error saving responses'
    });
  }
});

// @route   POST /api/assessments/vendor/:token/submit
// @desc    Submit final assessment and trigger AI analysis
// @access  Public (with valid token)
router.post('/vendor/:token/submit', vendorAuthMiddleware, async (req, res) => {
  const assessment = req.vendorAssessment;

  try {
    // Get all responses
    const responsesResult = await pool.query(
      `SELECT ar.*, q.question_text, q.question_type, q.control_reference
       FROM assessment_responses ar
       JOIN questions q ON ar.question_id = q.id
       WHERE ar.assessment_id = $1`,
      [assessment.id]
    );

    if (responsesResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No responses to submit'
      });
    }

    // Run AI analysis
    const aiAnalysis = await aiService.analyzeAssessment(responsesResult.rows);

    // Calculate risk score
    const riskScore = calculateRiskScore(responsesResult.rows, aiAnalysis);

    // Update assessment
    await pool.query(
      `UPDATE vendor_assessments 
       SET status = 'completed', 
           completed_at = CURRENT_TIMESTAMP,
           token_used = true,
           token_used_at = CURRENT_TIMESTAMP,
           overall_risk_score = $1,
           ai_analysis = $2
       WHERE id = $3`,
      [riskScore, JSON.stringify(aiAnalysis), assessment.id]
    );

    // Auto-create risks from AI analysis
    if (aiAnalysis.issues && aiAnalysis.issues.length > 0) {
      for (const issue of aiAnalysis.issues) {
        await pool.query(
          `INSERT INTO risks (vendor_id, assessment_id, description, likelihood, impact, risk_level, mitigation_plan, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')`,
          [
            assessment.vendor_id,
            assessment.id,
            issue.description,
            issue.likelihood || 'medium',
            issue.impact || 'medium',
            issue.risk_level || 'medium',
            issue.recommendation || ''
          ]
        );
      }
    }

    logger.info('Assessment submitted', { assessmentId: assessment.id, riskScore });

    await auditLog(
      pool,
      'ASSESSMENT_SUBMITTED',
      null,
      'vendor_assessment',
      assessment.id,
      { riskScore, vendor_id: assessment.vendor_id }
    );

    // Notify internal users about completion
    await emailService.notifyAssessmentComplete({
      assessmentId: assessment.id,
      vendorName: assessment.vendor_name,
      riskScore
    });

    res.json({
      success: true,
      message: 'Assessment submitted successfully',
      data: {
        riskScore,
        aiAnalysis
      }
    });
  } catch (error) {
    logger.error('Submit assessment error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error submitting assessment'
    });
  }
});

// Helper function to calculate risk score
function calculateRiskScore(responses, aiAnalysis) {
  let totalScore = 0;
  let maxScore = 0;

  responses.forEach(response => {
    const weight = 1; // Could be based on question weight
    maxScore += weight;

    if (response.question_type === 'yes_no') {
      totalScore += (response.answer === 'yes' || response.answer === 'true') ? weight : 0;
    } else if (response.question_type === 'multiple_choice') {
      // Score based on answer quality
      totalScore += weight * 0.8; // Simplified
    } else {
      totalScore += weight * 0.5; // Text/file uploads get partial credit
    }
  });

  // Adjust based on AI analysis
  if (aiAnalysis.risk_level === 'high') {
    totalScore *= 0.7;
  } else if (aiAnalysis.risk_level === 'critical') {
    totalScore *= 0.5;
  }

  return Math.round((totalScore / maxScore) * 100);
}

// @route   GET /api/assessments
// @desc    Get all assessments (internal)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { vendor_id, status } = req.query;

    let query = `
      SELECT va.*, v.name as vendor_name, q.name as questionnaire_name
      FROM vendor_assessments va
      JOIN vendors v ON va.vendor_id = v.id
      LEFT JOIN questionnaires q ON va.questionnaire_id = q.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (vendor_id) {
      query += ` AND va.vendor_id = $${paramIndex}`;
      values.push(vendor_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND va.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    query += ` ORDER BY va.created_at DESC`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: { assessments: result.rows }
    });
  } catch (error) {
    logger.error('Get assessments error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching assessments'
    });
  }
});

module.exports = router;
