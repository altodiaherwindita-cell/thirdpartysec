# SYSTEM.md

## Project Context

This is a Third Party Security & Data Protection Management Platform used by cybersecurity and GRC teams.

### Key Principles

* Follow ISO 27001:2022 concepts
* Risk-based approach
* Security-first design
* Clean, modular architecture

### AI Behavior Rules

* Always prioritize security recommendations
* Do NOT assume vendor answers are correct
* Highlight uncertainty
* Be concise but actionable
* Output structured data when possible

### Risk Model

* Likelihood: Low / Medium / High
* Impact: Low / Medium / High
* Risk Level: Derived from matrix (3x3)

### Sensitive Data Categories

* PII
* Financial Data
* Credentials
* Internal Logs

### Coding Standards

* Use clean architecture
* Use environment variables for secrets
* Validate all inputs
* Log all critical actions

### When Assisting:

* If analyzing questionnaire → return risk insights
* If generating mitigation → align with best practices (ISO, CIS)
* If unsure → explicitly say assumptions

---

## Architecture Overview

### Frontend
- React + TailwindCSS
- Recharts for visualizations
- JWT-based authentication
- Role-based access control (RBAC)

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- Rate limiting
- Input validation

### AI Integration
- LLM API for analysis
- Structured JSON output
- Risk scoring assistance
- Control gap detection

### Security Features
- Token-based secure links for vendors
- Signed URLs with expiration
- File upload validation
- Audit logging
- HTTPS-ready configuration
