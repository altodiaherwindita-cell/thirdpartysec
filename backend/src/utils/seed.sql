-- Seed data for Third Party Security Platform
-- Run after schema.sql

-- Insert default admin user (password: password123)
INSERT INTO users (email, password_hash, full_name, role, department) VALUES
('admin@example.com', '$2a$10$rHk9bX8qJ5zKvL7mN3pO4eYwQxZ6tU2vW8sA1cD9fG3hI5jK7lM9nO', 'Admin User', 'admin', 'Security'),
('analyst@example.com', '$2a$10$rHk9bX8qJ5zKvL7mN3pO4eYwQxZ6tU2vW8sA1cD9fG3hI5jK7lM9nO', 'Security Analyst', 'analyst', 'Security'),
('compliance@example.com', '$2a$10$rHk9bX8qJ5zKvL7mN3pO4eYwQxZ6tU2vW8sA1cD9fG3hI5jK7lM9nO', 'Compliance Officer', 'compliance_officer', 'Compliance');

-- Insert sample vendors
INSERT INTO vendors (name, contact_email, contact_phone, industry, risk_tier, status, data_classification, critical_system_access, notes, created_by) VALUES
('CloudTech Solutions', 'security@cloudtech.com', '+1-555-0101', 'Cloud Services', 'high', 'active', ARRAY['PII', 'Credentials'], true, 'Primary cloud infrastructure provider', (SELECT id FROM users WHERE email = 'admin@example.com')),
('DataPay Inc', 'compliance@datapay.com', '+1-555-0102', 'Payment Processing', 'critical', 'active', ARRAY['PII', 'Financial'], true, 'Payment gateway integration', (SELECT id FROM users WHERE email = 'admin@example.com')),
('SecureMail Corp', 'info@securemail.com', '+1-555-0103', 'Email Services', 'medium', 'active', ARRAY['PII'], false, 'Corporate email provider', (SELECT id FROM users WHERE email = 'admin@example.com')),
('Office Supplies Co', 'sales@officesupplies.com', '+1-555-0104', 'Retail', 'low', 'active', ARRAY[]::varchar[], false, 'Office equipment vendor', (SELECT id FROM users WHERE email = 'admin@example.com')),
('Analytics Pro', 'support@analyticspro.com', '+1-555-0105', 'Data Analytics', 'high', 'pending', ARRAY['PII', 'Logs'], true, 'Business intelligence platform', (SELECT id FROM users WHERE email = 'admin@example.com'));

-- Insert ISO 27001 Questionnaire
INSERT INTO questionnaires (name, description, framework, version, created_by) VALUES
('ISO 27001:2022 Vendor Assessment', 'Comprehensive security assessment based on ISO 27001:2022 controls', 'ISO 27001', '1.0', (SELECT id FROM users WHERE email = 'admin@example.com'));

-- Insert questions for ISO 27001 questionnaire
DO $$
DECLARE
    questionnaire_id UUID;
BEGIN
    SELECT id INTO questionnaire_id FROM questionnaires WHERE name = 'ISO 27001:2022 Vendor Assessment';

    -- Access Control Questions
    INSERT INTO questions (questionnaire_id, section, question_text, question_type, options, is_required, control_reference, order_index) VALUES
    (questionnaire_id, 'Access Control', 'Do you implement multi-factor authentication (MFA) for all user accounts?', 'yes_no', NULL, true, 'A.5.15', 1),
    (questionnaire_id, 'Access Control', 'How often do you review user access rights?', 'multiple_choice', 
     json_build_array('Monthly', 'Quarterly', 'Annually', 'Ad-hoc'), true, 'A.5.15', 2),
    (questionnaire_id, 'Access Control', 'Describe your password policy requirements', 'text', NULL, true, 'A.5.15', 3);

    -- Cryptography Questions
    INSERT INTO questions (questionnaire_id, section, question_text, question_type, options, is_required, control_reference, order_index) VALUES
    (questionnaire_id, 'Cryptography', 'Is data encrypted at rest in your systems?', 'yes_no', NULL, true, 'A.8.24', 4),
    (questionnaire_id, 'Cryptography', 'Is data encrypted in transit using TLS 1.2 or higher?', 'yes_no', NULL, true, 'A.8.24', 5),
    (questionnaire_id, 'Cryptography', 'What encryption standards do you use?', 'text', NULL, true, 'A.8.24', 6);

    -- Incident Management Questions
    INSERT INTO questions (questionnaire_id, section, question_text, question_type, options, is_required, control_reference, order_index) VALUES
    (questionnaire_id, 'Incident Management', 'Do you have a formal incident response plan?', 'yes_no', NULL, true, 'A.5.23', 7),
    (questionnaire_id, 'Incident Management', 'How quickly do you notify customers of security incidents?', 'multiple_choice',
     json_build_array('Within 24 hours', 'Within 48 hours', 'Within 72 hours', 'More than 72 hours'), true, 'A.5.23', 8),
    (questionnaire_id, 'Incident Management', 'Describe your incident response process', 'text', NULL, true, 'A.5.23', 9);

    -- Business Continuity Questions
    INSERT INTO questions (questionnaire_id, section, question_text, question_type, options, is_required, control_reference, order_index) VALUES
    (questionnaire_id, 'Business Continuity', 'Do you have documented business continuity plans?', 'yes_no', NULL, true, 'A.5.30', 10),
    (questionnaire_id, 'Business Continuity', 'How often do you test your backup and recovery procedures?', 'multiple_choice',
     json_build_array('Monthly', 'Quarterly', 'Annually', 'Never'), true, 'A.5.30', 11);

    -- Supplier Relationships Questions
    INSERT INTO questions (questionnaire_id, section, question_text, question_type, options, is_required, control_reference, order_index) VALUES
    (questionnaire_id, 'Supplier Relationships', 'Do you conduct security assessments of your own suppliers?', 'yes_no', NULL, true, 'A.5.19', 12),
    (questionnaire_id, 'Supplier Relationships', 'Please upload your latest SOC 2 or ISO 27001 certificate', 'file_upload', NULL, false, 'A.5.19', 13);

END $$;

-- Insert sample assessments
DO $$
DECLARE
    vendor_id UUID;
    questionnaire_id UUID;
    assessment_id UUID;
BEGIN
    SELECT id INTO vendor_id FROM vendors WHERE name = 'CloudTech Solutions';
    SELECT id INTO questionnaire_id FROM questionnaires WHERE name = 'ISO 27001:2022 Vendor Assessment';

    INSERT INTO vendor_assessments (vendor_id, questionnaire_id, secure_token, token_expires_at, status, overall_risk_score, created_by)
    VALUES (vendor_id, questionnaire_id, 'sample_token_12345', NOW() + INTERVAL '7 days', 'completed', 75, (SELECT id FROM users WHERE email = 'admin@example.com'))
    RETURNING id INTO assessment_id;

    -- Insert sample responses
    INSERT INTO assessment_responses (assessment_id, question_id, answer)
    SELECT assessment_id, id, 'yes'
    FROM questions WHERE questionnaire_id = questionnaire_id AND question_type = 'yes_no'
    LIMIT 5;
END $$;

-- Insert sample risks
DO $$
DECLARE
    vendor_id UUID;
    assessment_id UUID;
BEGIN
    SELECT id INTO vendor_id FROM vendors WHERE name = 'CloudTech Solutions';
    SELECT id INTO assessment_id FROM vendor_assessments WHERE vendor_id = vendor_id LIMIT 1;

    INSERT INTO risks (vendor_id, assessment_id, description, likelihood, impact, risk_level, mitigation_plan, owner, status, created_by) VALUES
    (vendor_id, assessment_id, 'MFA not implemented for all admin accounts', 'high', 'high', 'critical', 'Require MFA implementation within 30 days', 'Security Team', 'open', (SELECT id FROM users WHERE email = 'admin@example.com')),
    (vendor_id, assessment_id, 'Backup testing performed only annually', 'medium', 'high', 'high', 'Increase backup testing frequency to quarterly', 'IT Operations', 'mitigating', (SELECT id FROM users WHERE email = 'admin@example.com')),
    (vendor_id, NULL, 'Vendor has access to production database', 'medium', 'high', 'high', 'Implement database activity monitoring', 'Security Team', 'open', (SELECT id FROM users WHERE email = 'admin@example.com'));
END $$;

-- Insert sample documents
DO $$
DECLARE
    vendor_id UUID;
BEGIN
    SELECT id INTO vendor_id FROM vendors WHERE name = 'CloudTech Solutions';

    INSERT INTO documents (vendor_id, document_type, file_name, file_path, file_size, mime_type, expiry_date, uploaded_by) VALUES
    (vendor_id, 'NDA', 'CloudTech_NDA_2024.pdf', '/uploads/sample_nda.pdf', 245000, 'application/pdf', '2025-12-31', (SELECT id FROM users WHERE email = 'admin@example.com')),
    (vendor_id, 'ISO 27001', 'CloudTech_ISO_Certificate.pdf', '/uploads/sample_iso.pdf', 890000, 'application/pdf', '2025-06-30', (SELECT id FROM users WHERE email = 'admin@example.com'));
END $$;

-- Insert sample data flows
DO $$
DECLARE
    vendor_id UUID;
BEGIN
    SELECT id INTO vendor_id FROM vendors WHERE name = 'CloudTech Solutions';

    INSERT INTO data_flows (vendor_id, data_category, data_description, purpose, encryption_in_transit, encryption_at_rest, retention_period_days, cross_border_transfer) VALUES
    (vendor_id, 'PII', 'Customer names and email addresses', 'User authentication and notifications', true, true, 730, false),
    (vendor_id, 'Credentials', 'User session tokens', 'Session management', true, false, 1, false);
END $$;

-- Insert email template
INSERT INTO email_templates (name, subject, body_html, variables) VALUES
('assessment_invite', 'Security Assessment Request', 
 '<html><body><h1>Assessment Request</h1><p>Please complete the assessment.</p></body></html>',
 json_build_array('vendorName', 'questionnaireName', 'secureLink', 'expiresAt'));
