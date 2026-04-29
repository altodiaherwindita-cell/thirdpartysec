# Deployment Guide

## Production Checklist

### Security Configuration

1. **Change Default Credentials**
   - Update admin password immediately after first login
   - Use strong, unique passwords for all accounts

2. **Environment Variables**
   ```bash
   # Required production settings
   JWT_SECRET=<generate-strong-random-secret-min-32-chars>
   NODE_ENV=production
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   
   # Optional but recommended
   OPENAI_API_KEY=sk-...
   SMTP_HOST=smtp.yourcompany.com
   SMTP_USER=noreply@yourcompany.com
   SMTP_PASS=<secure-password>
   FRONTEND_URL=https://yourdomain.com
   ```

3. **Database Security**
   - Use SSL/TLS for database connections
   - Restrict database access to application IPs only
   - Enable automatic backups
   - Run migrations before deploying new versions

4. **HTTPS Configuration**
   - Use reverse proxy (nginx/Apache) with Let's Encrypt
   - Enable HSTS headers
   - Redirect all HTTP to HTTPS

5. **Rate Limiting**
   - Already configured in middleware
   - Adjust limits based on your traffic patterns

### Docker Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f
```

### Health Checks

- Backend: `GET /api/health`
- Frontend: Check static file serving
- Database: Included in Docker health check

### Monitoring Recommendations

1. Set up application monitoring (e.g., New Relic, Datadog)
2. Configure log aggregation (e.g., ELK Stack, Splunk)
3. Set up uptime monitoring
4. Monitor database performance and storage
5. Track API error rates and response times

### Backup Strategy

1. **Database**: Daily automated backups with 30-day retention
2. **Documents**: Regular backup of `/uploads` directory
3. **Configuration**: Version control for environment files (excluding secrets)

## Scaling Considerations

### Horizontal Scaling
- Stateless backend allows multiple instances
- Use load balancer (nginx, AWS ALB)
- Sticky sessions not required

### Database Optimization
- Add indexes for frequently queried columns
- Consider read replicas for heavy read workloads
- Implement connection pooling

### Caching
- Consider Redis for session storage
- Cache frequently accessed vendor data
- Implement CDN for static assets

## Troubleshooting

### Common Issues

**Frontend won't connect to backend:**
- Verify `VITE_API_URL` is set correctly
- Check CORS configuration in backend
- Ensure both services are running

**Database connection errors:**
- Verify DATABASE_URL format
- Check network connectivity
- Ensure database user has correct permissions

**File upload failures:**
- Check disk space
- Verify upload directory permissions
- Review file size limits in nginx/proxy

## Support

For issues or questions:
1. Check application logs: `docker-compose logs`
2. Review API documentation
3. Verify environment configuration
4. Check database migration status
