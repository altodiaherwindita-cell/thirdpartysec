#!/usr/bin/env node
/**
 * Database Migration Script
 * Creates all tables and indexes for the Third Party Security Platform
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'vendor_security_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migration...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../config/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await client.query(schema);
    console.log('✅ Schema created successfully');
    
    // Create email templates
    console.log('📧 Creating email templates...');
    
    const assessmentInviteTemplate = `
      INSERT INTO email_templates (name, subject, body_html, body_text, variables) 
      VALUES (
        'assessment_invite',
        'Security Assessment Required - {{vendorName}}',
        '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><h2 style="color: #2563eb;">Security Assessment Request</h2><p>Dear {{contactName}},</p><p>We are conducting our annual vendor security assessment as part of our ISO 27001 compliance program.</p><p>Please complete the security questionnaire by clicking the link below:</p><p><a href="{{assessmentLink}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">Start Assessment</a></p><p>This link will expire on {{expiryDate}}.</p><p>If you have any questions, please don''t hesitate to contact us.</p><p>Best regards,<br/>Security Team</p><hr/><p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p></body></html>',
        'Dear {{contactName}},\n\nWe are conducting our annual vendor security assessment as part of our ISO 27001 compliance program.\n\nPlease complete the security questionnaire by visiting:\n{{assessmentLink}}\n\nThis link will expire on {{expiryDate}}.\n\nIf you have any questions, please don''t hesitate to contact us.\n\nBest regards,\nSecurity Team\n\n---\nThis is an automated message. Please do not reply.',
        '{"vendorName": "string", "contactName": "string", "assessmentLink": "string", "expiryDate": "string"}'::jsonb
      )
      ON CONFLICT (name) DO UPDATE SET 
        subject = EXCLUDED.subject,
        body_html = EXCLUDED.body_html,
        body_text = EXCLUDED.body_text,
        updated_at = CURRENT_TIMESTAMP;
    `;
    
    await client.query(assessmentInviteTemplate);
    console.log('✅ Email templates created');
    
    // Create default questionnaire if not exists
    console.log('📋 Creating default questionnaire...');
    
    const defaultQuestionnaire = `
      INSERT INTO questionnaires (id, name, description, framework, version, is_active)
      VALUES (
        '550e8400-e29b-41d4-a716-446655440001',
        'ISO 27001:2022 Vendor Security Assessment',
        'Standard security questionnaire for vendor assessments aligned with ISO 27001:2022 controls',
        'ISO 27001',
        '1.0',
        true
      )
      ON CONFLICT DO NOTHING;
    `;
    
    await client.query(defaultQuestionnaire);
    
    // Add default questions
    const questions = [
      {
        section: 'Information Security Policies',
        text: 'Does your organization have documented information security policies?',
        type: 'yes_no',
        control: 'ISO 27001 A.5.1',
        weight: 2
      },
      {
        section: 'Information Security Policies',
        text: 'How often are your security policies reviewed and updated?',
        type: 'multiple_choice',
        options: JSON.stringify(['Annually', 'Bi-annually', 'Quarterly', 'Ad-hoc', 'Never']),
        control: 'ISO 27001 A.5.1',
        weight: 1
      },
      {
        section: 'Access Control',
        text: 'Do you implement multi-factor authentication (MFA) for remote access?',
        type: 'yes_no',
        control: 'ISO 27001 A.8.3',
        weight: 3
      },
      {
        section: 'Access Control',
        text: 'Describe your access review process:',
        type: 'text',
        control: 'ISO 27001 A.8.3',
        weight: 2
      },
      {
        section: 'Cryptography',
        text: 'Is data encrypted in transit using TLS 1.2 or higher?',
        type: 'yes_no',
        control: 'ISO 27001 A.8.24',
        weight: 3
      },
      {
        section: 'Cryptography',
        text: 'Is sensitive data encrypted at rest?',
        type: 'yes_no',
        control: 'ISO 27001 A.8.24',
        weight: 3
      },
      {
        section: 'Operations Security',
        text: 'Do you have a vulnerability management program in place?',
        type: 'yes_no',
        control: 'ISO 27001 A.8.8',
        weight: 2
      },
      {
        section: 'Operations Security',
        text: 'How frequently do you perform vulnerability scans?',
        type: 'multiple_choice',
        options: JSON.stringify(['Weekly', 'Monthly', 'Quarterly', 'Annually', 'Never']),
        control: 'ISO 27001 A.8.8',
        weight: 2
      },
      {
        section: 'Incident Management',
        text: 'Do you have a formal incident response plan?',
        type: 'yes_no',
        control: 'ISO 27001 A.5.24',
        weight: 3
      },
      {
        section: 'Incident Management',
        text: 'What is your typical incident response time?',
        type: 'multiple_choice',
        options: JSON.stringify(['< 1 hour', '1-4 hours', '4-24 hours', '> 24 hours', 'Not defined']),
        control: 'ISO 27001 A.5.24',
        weight: 2
      },
      {
        section: 'Business Continuity',
        text: 'Do you have a business continuity plan (BCP)?',
        type: 'yes_no',
        control: 'ISO 27001 A.5.29',
        weight: 2
      },
      {
        section: 'Business Continuity',
        text: 'When was your BCP last tested?',
        type: 'multiple_choice',
        options: JSON.stringify(['Within 6 months', '6-12 months', '1-2 years', '> 2 years', 'Never tested']),
        control: 'ISO 27001 A.5.30',
        weight: 2
      },
      {
        section: 'Data Protection',
        text: 'Are you GDPR compliant or do you handle EU personal data?',
        type: 'yes_no',
        control: 'ISO 27001 A.8.1',
        weight: 3
      },
      {
        section: 'Data Protection',
        text: 'Upload your most recent SOC 2 Type II or ISO 27001 certificate:',
        type: 'file_upload',
        control: 'ISO 27001 A.8.1',
        weight: 3
      },
      {
        section: 'Supply Chain Security',
        text: 'Do you assess your own third-party vendors for security?',
        type: 'yes_no',
        control: 'ISO 27001 A.5.19',
        weight: 2
      }
    ];
    
    for (const q of questions) {
      const query = `
        INSERT INTO questions (questionnaire_id, section, question_text, question_type, options, control_reference, weight, order_index)
        VALUES (
          '550e8400-e29b-41d4-a716-446655440001',
          $1, $2, $3, $4, $5, $6, $7
        )
        ON CONFLICT DO NOTHING;
      `;
      
      await client.query(query, [
        q.section,
        q.text,
        q.type,
        q.options || null,
        q.control,
        q.weight,
        questions.indexOf(q)
      ]);
    }
    
    console.log('✅ Default questionnaire created with', questions.length, 'questions');
    
    console.log('\n✨ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run seed script: npm run db:seed');
    console.log('2. Start the server: npm run dev');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
