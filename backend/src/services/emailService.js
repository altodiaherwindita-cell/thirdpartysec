const nodemailer = require('nodemailer');
const { logger } = require('../config/logger');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// Send assessment invite email
const sendAssessmentInvite = async ({ to, vendorName, questionnaireName, secureLink, expiresAt, customMessage }) => {
  try {
    const transporter = createTransporter();

    const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a365d; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f7fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .button { display: inline-block; background: #2b6cb0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #edf2f7; padding: 20px; border-radius: 0 0 8px 8px; font-size: 12px; color: #718096; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Security Assessment Request</h1>
          </div>
          <div class="content">
            <p>Dear ${vendorName} Team,</p>
            
            <p>We are conducting our annual third-party security assessment as part of our ISO 27001 compliance requirements.</p>
            
            <p>Please complete the <strong>${questionnaireName}</strong> by clicking the secure link below:</p>
            
            <p style="text-align: center;">
              <a href="${secureLink}" class="button">Start Assessment</a>
            </p>
            
            ${customMessage ? `<div style="background: white; padding: 15px; border-left: 4px solid #2b6cb0; margin: 20px 0;">${customMessage}</div>` : ''}
            
            <p><strong>Important Information:</strong></p>
            <ul>
              <li>This link will expire on: <strong>${expiresDate}</strong></li>
              <li>You can save your progress and return later</li>
              <li>The assessment typically takes 20-30 minutes to complete</li>
            </ul>
            
            <p>If you have any questions, please don't hesitate to reach out.</p>
            
            <p>Best regards,<br/>Vendor Security Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Vendor Security Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Security Assessment Request
      
      Dear ${vendorName} Team,
      
      We are conducting our annual third-party security assessment as part of our ISO 27001 compliance requirements.
      
      Please complete the ${questionnaireName} by visiting: ${secureLink}
      
      This link will expire on: ${expiresDate}
      
      You can save your progress and return later.
      The assessment typically takes 20-30 minutes to complete.
      
      If you have any questions, please don't hesitate to reach out.
      
      Best regards,
      Vendor Security Team
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@example.com',
      to,
      subject: `Security Assessment Request - ${questionnaireName}`,
      html,
      text
    });

    logger.info('Assessment invite email sent', { to, vendorName });
  } catch (error) {
    logger.error('Failed to send assessment invite email', { error: error.message, to });
    throw new Error('Failed to send email invitation');
  }
};

// Notify internal users about assessment completion
const notifyAssessmentComplete = async ({ assessmentId, vendorName, riskScore }) => {
  try {
    const pool = require('../config/database');
    
    // Get all admin and analyst users
    const usersResult = await pool.query(
      `SELECT email, full_name FROM users WHERE role IN ('admin', 'analyst') AND is_active = true`
    );

    const transporter = createTransporter();
    
    let riskLevel = 'Medium';
    let riskColor = '#ecc94b';
    if (riskScore >= 80) {
      riskLevel = 'Low';
      riskColor = '#48bb78';
    } else if (riskScore < 50) {
      riskLevel = 'High';
      riskColor = '#f56565';
    }

    for (const user of usersResult.rows) {
      const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Assessment Completed: ${vendorName}</h2>
          <p>A new vendor security assessment has been completed and requires your review.</p>
          <p><strong>Vendor:</strong> ${vendorName}</p>
          <p><strong>Risk Score:</strong> ${riskScore}/100</p>
          <p><strong>Risk Level:</strong> <span style="color: ${riskColor};">${riskLevel}</span></p>
          <p>Please log in to the platform to review the detailed analysis and AI recommendations.</p>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@example.com',
        to: user.email,
        subject: `Assessment Completed - ${vendorName}`,
        html
      });
    }

    logger.info('Assessment completion notifications sent', { assessmentId });
  } catch (error) {
    logger.error('Failed to send assessment completion notifications', { error: error.message });
  }
};

// Send document expiry alert
const sendDocumentExpiryAlert = async ({ vendorName, documentType, expiryDate, recipientEmail }) => {
  try {
    const transporter = createTransporter();
    
    const daysUntilExpiry = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #c53030;">⚠️ Document Expiry Alert</h2>
        <p>The following document for <strong>${vendorName}</strong> is expiring soon:</p>
        <ul>
          <li><strong>Document Type:</strong> ${documentType}</li>
          <li><strong>Expiry Date:</strong> ${new Date(expiryDate).toLocaleDateString()}</li>
          <li><strong>Days Remaining:</strong> ${daysUntilExpiry}</li>
        </ul>
        <p>Please take action to renew or update this document.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@example.com',
      to: recipientEmail,
      subject: `Document Expiry Alert - ${vendorName}`,
      html
    });

    logger.info('Document expiry alert sent', { vendorName, documentType });
  } catch (error) {
    logger.error('Failed to send document expiry alert', { error: error.message });
  }
};

module.exports = {
  sendAssessmentInvite,
  notifyAssessmentComplete,
  sendDocumentExpiryAlert
};
