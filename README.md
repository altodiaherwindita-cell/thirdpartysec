# Third Party Security & Data Protection Management Platform

A production-ready web application for cybersecurity/GRC teams to assess, monitor, and manage third-party/vendor security risks aligned with ISO 27001:2022.

## 🚀 Features

### Core Capabilities
- **Vendor Management** - Create, track, and archive vendor profiles with risk tiers
- **Security Assessments** - Customizable questionnaires (ISO 27001, OWASP ASVS, CIS)
- **Secure Vendor Links** - Token-based, time-limited assessment access
- **AI-Powered Analysis** - Automated risk scoring and control gap detection
- **Risk Register** - 3x3 risk matrix with mitigation tracking
- **Data Protection** - Track shared data classifications and flows
- **Document Management** - Upload and track certifications, NDAs, DPAs
- **Continuous Monitoring** - Dashboard with alerts and notifications
- **Audit Logging** - Complete activity trail for compliance

### Security Features
- JWT authentication with RBAC
- Rate limiting on all endpoints
- Input validation and sanitization
- Secure file upload validation
- Token-based vendor access with expiration
- Comprehensive audit logging
- HTTPS-ready configuration

## 🏗️ Tech Stack

### Backend
- Node.js + Express
- PostgreSQL
- JWT Authentication
- OpenAI API (optional)
- Nodemailer (SMTP)

### Frontend
- React 18
- TailwindCSS
- React Router
- Recharts (visualizations)
- Axios

### DevOps
- Docker & Docker Compose
- Multi-stage builds
- Health checks

## 📦 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Option 1: Docker Compose (Recommended)

```bash
cd /workspace

# Copy environment file
cp backend/.env.example backend/.env

# Edit backend/.env with your settings

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# Database: localhost:5432
```

### Option 2: Manual Setup

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
createdb vendor_security_db
psql -d vendor_security_db -f src/config/schema.sql
psql -d vendor_security_db -f src/utils/seed.sql
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Default Credentials

> ⚠️ **Security Warning**: Change these default credentials immediately in production!

```
Email: admin@example.com
Password: <SET_YOUR_OWN_SECURE_PASSWORD>
```

To create a new user with a secure password, use the registration endpoint or update the database directly.

## 📁 Project Structure

```
/workspace
├── backend/
│   ├── src/
│   │   ├── config/         # Database, logger
│   │   ├── middleware/     # Auth, validation, rate limiting
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic (AI, Email)
│   │   ├── utils/          # Helpers, seeds
│   │   └── server.js       # Entry point
│   ├── uploads/            # File uploads
│   ├── logs/               # Application logs
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   └── App.jsx         # Main app
│   └── package.json
├── docker-compose.yml
├── SYSTEM.md
└── README.md
```

## 🤖 AI Integration

The platform includes optional AI-powered features:

1. **Assessment Analysis** - Automatically analyzes vendor responses
2. **Risk Scoring** - Suggests risk levels based on answers
3. **Control Gap Detection** - Identifies missing security controls
4. **Mitigation Recommendations** - Generates actionable remediation steps

Set `OPENAI_API_KEY` in `.env` to enable AI features. Falls back to rule-based analysis if not configured.

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Vendors
- `GET /api/vendors` - List vendors
- `GET /api/vendors/:id` - Get vendor details
- `POST /api/vendors` - Create vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Archive vendor

### Assessments
- `POST /api/assessments` - Create assessment with secure token
- `POST /api/assessments/:token/send` - Send invite email
- `GET /api/assessments/vendor/:token` - Get assessment (vendor)
- `PUT /api/assessments/vendor/:token/responses` - Save responses
- `POST /api/assessments/vendor/:token/submit` - Submit with AI analysis

### Risks
- `GET /api/risks` - List risks
- `POST /api/risks` - Create risk
- `PUT /api/risks/:id` - Update risk
- `GET /api/risks/matrix` - Get risk matrix data

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/:id/download` - Download document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/alerts/expiring` - Get expiring documents

## 🔒 Security Considerations

1. **Change default secrets** - Update `JWT_SECRET` in production
2. **Enable HTTPS** - Use reverse proxy with SSL
3. **Configure SMTP** - Set up proper email credentials
4. **File upload limits** - Adjust `MAX_FILE_SIZE` as needed
5. **Database backups** - Implement regular backup procedures

## 📈 Risk Model

3x3 risk matrix (Likelihood × Impact):

| | Low | Medium | High |
|---|---|---|---|
| **High** | Medium | High | Critical |
| **Medium** | Low | Medium | High |
| **Low** | Low | Low | Medium |

## 🎯 Compliance Alignment

- ISO 27001:2022 controls in questionnaires
- SOC 2 Type II evidence collection
- GDPR data protection tracking
- Vendor risk management best practices

---

**Built for Security & GRC Teams**
