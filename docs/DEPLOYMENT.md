# Deployment Guide

## Development Deployment

### Prerequisites
- Docker and Docker Compose
- Git
- 8GB+ RAM

### Steps
1. Clone the repository
2. Run `./scripts/setup.sh`
3. Access http://localhost:3000

## Production Deployment

### Option 1: Docker Compose (Recommended)

1. **Prepare the server:**
   ```bash
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Clone and configure:**
   ```bash
   git clone https://github.com/BenjajaDev/HOTELERIA_MULTITENANT.git
   cd HOTELERIA_MULTITENANT
   
   # Create production environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit environment files with production values
   nano backend/.env
   nano frontend/.env
   ```

3. **Deploy:**
   ```bash
   ./scripts/deploy.sh
   ```

### Option 2: Kubernetes

Coming soon - Kubernetes deployment manifests.

### Option 3: Cloud Providers

#### AWS ECS
1. Build and push images to ECR
2. Create ECS task definitions
3. Deploy using ECS services

#### Google Cloud Run
1. Build images using Cloud Build
2. Deploy to Cloud Run
3. Configure Cloud SQL for PostgreSQL

#### Azure Container Instances
1. Push images to Azure Container Registry
2. Deploy using Container Instances
3. Use Azure Database for PostgreSQL

## Environment Variables

### Backend (.env)
```bash
NODE_ENV=production
PORT=3001
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=hoteleria_multitenant
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
JWT_SECRET=your-super-secure-jwt-secret
FRONTEND_URL=https://yourdomain.com
```

### Frontend (.env)
```bash
REACT_APP_API_URL=https://yourdomain.com
REACT_APP_NAME=Your Hotel Management System
```

## SSL Configuration

### Using Let's Encrypt
1. Install Certbot
2. Generate certificates
3. Update Nginx configuration
4. Set up auto-renewal

### Using Custom Certificates
1. Obtain SSL certificates
2. Update docker/nginx/nginx.conf
3. Mount certificates in Docker Compose

## Database Backup

### Automated Backups
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec postgres_container pg_dump -U postgres hoteleria_multitenant > backup_$DATE.sql
# Upload to S3 or other storage
EOF

# Schedule with cron
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

## Monitoring

### Health Checks
- Backend: `GET /health`
- Database connection tests
- Disk space monitoring
- Memory usage monitoring

### Logging
- Application logs via Docker logs
- Nginx access logs
- Database logs
- Error tracking with Sentry (optional)

## Security Checklist

- [ ] Change default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Database access restrictions
- [ ] Rate limiting enabled
- [ ] Input validation
- [ ] SQL injection protection
- [ ] XSS protection

## Scaling

### Horizontal Scaling
- Multiple backend instances behind load balancer
- Database read replicas
- CDN for static assets

### Vertical Scaling
- Increase server resources
- Optimize database configuration
- Enable database connection pooling

## Troubleshooting

### Common Issues

**Database Connection Failed:**
- Check database credentials
- Verify network connectivity
- Check PostgreSQL logs

**Frontend Not Loading:**
- Verify API URL in environment
- Check Nginx configuration
- Check browser console for errors

**High Memory Usage:**
- Monitor Docker container resources
- Check for memory leaks
- Optimize database queries

### Log Analysis
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# View database logs
docker-compose logs -f db

# View Nginx logs
docker-compose logs -f nginx
```