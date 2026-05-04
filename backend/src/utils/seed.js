#!/usr/bin/env node
/**
 * Database Seed Script
 * Populates the database with initial data for development and testing
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'vendor_security_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check if already seeded
    const checkQuery = 'SELECT COUNT(*) FROM users';
    const result = await client.query(checkQuery);
    
    if (parseInt(result.rows[0].count) > 0) {
      console.log('⚠️  Database already contains data. Skipping seed.');
      console.log('   To reset, drop and recreate the database.');
      return;
    }
    
    // Create default admin user
    console.log('👤 Creating default admin user...');
    const passwordHash = await bcrypt.hash('Admin123!@#', 10);
    
    const adminQuery = `
      INSERT INTO users (email, password_hash, full_name, role, department)
      VALUES (
        'admin@example.com',
        $1,
        'System Administrator',
        'admin',
        'IT Security'
      );
    `;
    
    await client.query(adminQuery, [passwordHash]);
    console.log('✅ Admin user created (email: admin@example.com, password: Admin123!@#)');
    
    // Create sample analyst user
    console.log('👤 Creating sample analyst user...');
    const analystHash = await bcrypt.hash('Analyst123!@#', 10);
    
    const analystQuery = `
      INSERT INTO users (email, password_hash, full_name, role, department)
      VALUES (
        'analyst@example.com',
        $1,
        'Security Analyst',
        'analyst',
        'IT Security'
      );
    `;
    
    await client.query(analystQuery, [analystHash]);
    console.log('✅ Analyst user created (email: analyst@example.com, password: Analyst123!@#)');
    
    // Get admin user ID
    const adminResult = await client.query('SELECT id FROM users WHERE email = $1', ['admin@example.com']);
    const adminId = adminResult.rows[0].id;
    
    // Create sample vendors
    console.log('🏢 Creating sample vendors...');
    
    const vendors = [
      {
        name: 'CloudTech Solutions',
        email: 'security@cloudtech.example.com',
        phone: '+1-555-0101',
        address: '123 Tech Park, San Francisco, CA 94105',
        website: 'https://cloudtech.example.com',
        industry: 'Cloud Services',
        risk_tier: 'high',
        status: 'active',
        data_classification: ['PII', 'Credentials'],
        critical_system_access: true,
        contract_start: '2024-01-01',
        contract_end: '2025-12-31',
        notes: 'Primary cloud infrastructure provider'
      },
      {
        name: 'DataPay Inc',
        email: 'compliance@datapay.example.com',
        phone: '+1-555-0102',
        address: '456 Finance St, New York, NY 10001',
        website: 'https://datapay.example.com',
        industry: 'Payment Processing',
        risk_tier: 'high',
        status: 'active',
        data_classification: ['Financial', 'PII'],
        critical_system_access: true,
        contract_start: '2023-06-01',
        contract_end: '2026-05-31',
        notes: 'Payment gateway provider - PCI DSS required'
      },
      {
        name: 'SecureAuth Systems',
        email: 'support@secureauth.example.com',
        phone: '+1-555-0103',
        address: '789 Security Blvd, Austin, TX 78701',
        website: 'https://secureauth.example.com',
        industry: 'Identity Management',
        risk_tier: 'medium',
        status: 'active',
        data_classification: ['Credentials', 'PII'],
        critical_system_access: true,
        contract_start: '2024-03-01',
        contract_end: '2025-02-28',
        notes: 'SSO and MFA provider'
      },
      {
        name: 'Office Supplies Co',
        email: 'sales@officesupplies.example.com',
        phone: '+1-555-0104',
        address: '321 Commerce Way, Chicago, IL 60601',
        website: 'https://officesupplies.example.com',
        industry: 'Retail',
        risk_tier: 'low',
        status: 'active',
        data_classification: [],
        critical_system_access: false,
        contract_start: '2024-01-01',
        contract_end: '2024-12-31',
        notes: 'Office supplies vendor - minimal risk'
      },
      {
        name: 'Analytics Pro',
        email: 'privacy@analyticspro.example.com',
        phone: '+1-555-0105',
        address: '555 Data Drive, Seattle, WA 98101',
        website: 'https://analyticspro.example.com',
        industry: 'Analytics',
        risk_tier: 'medium',
        status: 'active',
        data_classification: ['Logs', 'PII'],
        critical_system_access: false,
        contract_start: '2024-02-01',
        contract_end: '2025-01-31',
        notes: 'Web analytics platform'
      }
    ];
    
    const vendorIds = {};
    
    for (const vendor of vendors) {
      const query = `
        INSERT INTO vendors (
          name, contact_email, contact_phone, address, website, industry,
          risk_tier, status, data_classification, critical_system_access,
          contract_start_date, contract_end_date, notes, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING id;
      `;
      
      const result = await client.query(query, [
        vendor.name,
        vendor.email,
        vendor.phone,
        vendor.address,
        vendor.website,
        vendor.industry,
        vendor.risk_tier,
        vendor.status,
        vendor.data_classification,
        vendor.critical_system_access,
        vendor.contract_start,
        vendor.contract_end,
        vendor.notes,
        adminId
      ]);
      
      vendorIds[vendor.name] = result.rows[0].id;
    }
    
    console.log(`✅ Created ${vendors.length} sample vendors`);
    
    // Create sample risks
    console.log('⚠️  Creating sample risks...');
    
    const risks = [
      {
        vendor: 'CloudTech Solutions',
        description: 'Potential data breach due to misconfigured S3 buckets',
        likelihood: 'medium',
        impact: 'high',
        risk_level: 'high',
        mitigation_plan: 'Implement automated S3 bucket scanning and enforce encryption policies',
        owner: 'security-team@example.com',
        status: 'mitigating',
        due_date: '2024-06-30'
      },
      {
        vendor: 'DataPay Inc',
        description: 'PCI DSS certification expiring in 90 days',
        likelihood: 'low',
        impact: 'high',
        risk_level: 'medium',
        mitigation_plan: 'Schedule renewal audit and prepare documentation',
        owner: 'compliance@example.com',
        status: 'open',
        due_date: '2024-05-15'
      },
      {
        vendor: 'Analytics Pro',
        description: 'GDPR data processing agreement needs update',
        likelihood: 'high',
        impact: 'medium',
        risk_level: 'high',
        mitigation_plan: 'Legal team to review and update DPA with latest requirements',
        owner: 'legal@example.com',
        status: 'open',
        due_date: '2024-04-30'
      }
    ];
    
    for (const risk of risks) {
      const query = `
        INSERT INTO risks (
          vendor_id, description, likelihood, impact, risk_level,
          mitigation_plan, owner, status, due_date, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        );
      `;
      
      await client.query(query, [
        vendorIds[risk.vendor],
        risk.description,
        risk.likelihood,
        risk.impact,
        risk.risk_level,
        risk.mitigation_plan,
        risk.owner,
        risk.status,
        risk.due_date,
        adminId
      ]);
    }
    
    console.log(`✅ Created ${risks.length} sample risks`);
    
    // Create sample documents
    console.log('📄 Creating sample document records...');
    
    const documents = [
      {
        vendor: 'CloudTech Solutions',
        type: 'ISO 27001',
        name: 'ISO_27001_Certificate_2024.pdf',
        expiry: '2025-12-31'
      },
      {
        vendor: 'DataPay Inc',
        type: 'SOC 2',
        name: 'SOC2_TypeII_Report_2024.pdf',
        expiry: '2024-08-15'
      },
      {
        vendor: 'SecureAuth Systems',
        type: 'NDA',
        name: 'Mutual_NDA_SecureAuth.pdf',
        expiry: '2026-03-01'
      }
    ];
    
    for (const doc of documents) {
      const query = `
        INSERT INTO documents (
          vendor_id, document_type, file_name, file_path, expiry_date, uploaded_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        );
      `;
      
      await client.query(query, [
        vendorIds[doc.vendor],
        doc.type,
        doc.name,
        `/uploads/${doc.name}`,
        doc.expiry,
        adminId
      ]);
    }
    
    console.log(`✅ Created ${documents.length} sample document records`);
    
    // Create sample audit logs
    console.log('📝 Creating sample audit logs...');
    
    const auditLogs = [
      {
        action: 'USER_LOGIN',
        entity_type: 'user',
        details: { email: 'admin@example.com' }
      },
      {
        action: 'VENDOR_CREATED',
        entity_type: 'vendor',
        details: { name: 'CloudTech Solutions' }
      },
      {
        action: 'RISK_CREATED',
        entity_type: 'risk',
        details: { description: 'S3 bucket misconfiguration' }
      }
    ];
    
    for (const log of auditLogs) {
      const query = `
        INSERT INTO audit_logs (action, user_id, entity_type, details, ip_address)
        VALUES ($1, $2, $3, $4, $5);
      `;
      
      await client.query(query, [
        log.action,
        adminId,
        log.entity_type,
        JSON.stringify(log.details),
        '127.0.0.1'
      ]);
    }
    
    console.log(`✅ Created ${auditLogs.length} sample audit logs`);
    
    console.log('\n✨ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: 2 (admin, analyst)`);
    console.log(`   - Vendors: ${vendors.length}`);
    console.log(`   - Risks: ${risks.length}`);
    console.log(`   - Documents: ${documents.length}`);
    console.log('\n🔐 Default Credentials:');
    console.log('   Admin: admin@example.com / Admin123!@#');
    console.log('   Analyst: analyst@example.com / Analyst123!@#');
    console.log('\n⚠️  IMPORTANT: Change these passwords in production!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
