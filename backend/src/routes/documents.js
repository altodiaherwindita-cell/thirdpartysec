const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { logger, auditLog } = require('../config/logger');
const { authMiddleware, authorize, vendorAuthMiddleware } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext) && allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, images, Word, Excel, and text files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter
});

// @route   POST /api/documents/upload
// @desc    Upload document for vendor
// @access  Private (Admin, Analyst)
router.post('/upload', authMiddleware, authorize('admin', 'analyst'), uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { vendor_id, document_type, expiry_date } = req.body;

    if (!vendor_id || !document_type) {
      // Clean up uploaded file
      fs.unlink(req.file.path, () => {});
      
      return res.status(400).json({
        success: false,
        message: 'Vendor ID and document type are required'
      });
    }

    // Verify vendor exists
    const vendorCheck = await pool.query('SELECT id FROM vendors WHERE id = $1', [vendor_id]);
    if (vendorCheck.rows.length === 0) {
      fs.unlink(req.file.path, () => {});
      
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const result = await pool.query(
      `INSERT INTO documents (
        vendor_id, document_type, file_name, file_path, file_size, mime_type, expiry_date, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        vendor_id,
        document_type,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        expiry_date || null,
        req.user.id
      ]
    );

    const document = result.rows[0];

    logger.info('Document uploaded', { documentId: document.id, userId: req.user.id });

    await auditLog(
      pool,
      'DOCUMENT_UPLOADED',
      req.user.id,
      'document',
      document.id,
      { vendor_id, document_type, file_name: req.file.originalname }
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document }
    });
  } catch (error) {
    logger.error('Upload document error', { error: error.message });
    
    // Clean up file on error
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    
    res.status(500).json({
      success: false,
      message: error.message.includes('Invalid file type') ? error.message : 'Error uploading document'
    });
  }
});

// @route   POST /api/documents/vendor/:token/upload
// @desc    Upload evidence as part of assessment (vendor)
// @access  Public (with valid token)
router.post('/vendor/:token/upload', vendorAuthMiddleware, uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { question_id } = req.body;
    const assessment = req.vendorAssessment;

    if (!question_id) {
      fs.unlink(req.file.path, () => {});
      
      return res.status(400).json({
        success: false,
        message: 'Question ID is required'
      });
    }

    // Save file path in assessment response
    await pool.query(
      `UPDATE assessment_responses 
       SET file_path = $1, updated_at = CURRENT_TIMESTAMP
       WHERE assessment_id = $2 AND question_id = $3`,
      [req.file.path, assessment.id, question_id]
    );

    logger.info('Evidence uploaded by vendor', { 
      assessmentId: assessment.id, 
      question_id 
    });

    res.json({
      success: true,
      message: 'Evidence uploaded successfully',
      data: {
        file_name: req.file.originalname,
        file_path: req.file.path
      }
    });
  } catch (error) {
    logger.error('Vendor upload error', { error: error.message });
    
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    
    res.status(500).json({
      success: false,
      message: error.message.includes('Invalid file type') ? error.message : 'Error uploading file'
    });
  }
});

// @route   GET /api/documents/:id/download
// @desc    Download document
// @access  Private
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = result.rows[0];

    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.download(document.file_path, document.file_name);
  } catch (error) {
    logger.error('Download document error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error downloading document'
    });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document
// @access  Private (Admin)
router.delete('/:id', authMiddleware, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM documents WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = result.rows[0];

    // Delete physical file
    if (fs.existsSync(document.file_path)) {
      fs.unlink(document.file_path, () => {});
    }

    logger.info('Document deleted', { documentId: req.params.id, userId: req.user.id });

    await auditLog(
      pool,
      'DOCUMENT_DELETED',
      req.user.id,
      'document',
      req.params.id,
      {}
    );

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error('Delete document error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error deleting document'
    });
  }
});

// @route   GET /api/documents/expiring
// @desc    Get documents expiring soon
// @access  Private
router.get('/alerts/expiring', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await pool.query(
      `SELECT d.*, v.name as vendor_name
       FROM documents d
       JOIN vendors v ON d.vendor_id = v.id
       WHERE d.expiry_date IS NOT NULL
         AND d.expiry_date <= CURRENT_DATE + INTERVAL '${parseInt(days)} days'
         AND d.is_expired = false
       ORDER BY d.expiry_date ASC`,
      []
    );

    res.json({
      success: true,
      data: { documents: result.rows, count: result.rows.length }
    });
  } catch (error) {
    logger.error('Get expiring documents error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching expiring documents'
    });
  }
});

module.exports = router;
