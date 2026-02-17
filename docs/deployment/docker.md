# Docker Deployment Guide for Melo v2

This guide provides instructions for deploying Melo v2 using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+ 
- Docker Compose v2.0+
- 4GB+ RAM recommended
- 10GB+ free disk space

## Quick Start

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd melo-v2
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** (see Environment Configuration section below)

4. **Start the stack:**
   ```bash
   docker compose up -d
   ```

5. **Access the application:**
   - Open http://localhost:3000 in your browser
   - Health check: http://localhost:3000/api/health

## Environment Configuration

### Required Variables

Create a `.env` file in the project root with these variables:

```bash
# Database password
POSTGRES_PASSWORD=your_secure_password_here

# Clerk Authentication (get from https://clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# UploadThing (get from https://uploadthing.com)
UPLOADTHING_SECRET=sk_live_xxxxx
UPLOADTHING_APP_ID=xxxxx

# LiveKit (get from https://livekit.io)
LIVEKIT_API_KEY=xxxxx
LIVEKIT_API_SECRET=xxxxx
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-url

# Site URL (adjust for production)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: Custom port
PORT=3000
```

### Service Accounts Setup

1. **Clerk Authentication:**
   - Create account at https://clerk.com
   - Create new application
   - Copy publishable key and secret key

2. **UploadThing (File Uploads):**
   - Create account at https://uploadthing.com
   - Create new app
   - Copy secret and app ID

3. **LiveKit (Video/Audio):**
   - Create account at https://livekit.io
   - Create new project
   - Copy API key and secret

## Docker Services

The stack includes:

### Core Services
- **app**: Melo v2 Next.js application (port 3000)
- **db**: PostgreSQL 15 database
- **redis**: Redis cache/sessions

### Optional Services
- **nginx**: Reverse proxy (use `--profile production`)

## Development vs Production

### Development
```bash
# Start with hot-reload for development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or just the dependencies
docker compose up db redis
npm run dev  # Run app locally
```

### Production
```bash
# Full production stack with nginx
docker compose --profile production up -d

# Or without nginx (if using external load balancer)
docker compose up -d
```

## Container Optimization

The production Docker image is optimized for size and performance:

- **Multi-stage build**: Separates build and runtime environments
- **Alpine Linux base**: Minimal footprint (~500MB final image)
- **Non-root user**: Security best practices
- **Health checks**: Automatic container health monitoring
- **Signal handling**: Proper shutdown with dumb-init

## Database Management

### Initial Setup
The database will be automatically created on first run.

### Migrations
```bash
# Run database migrations
docker compose exec app npx prisma migrate deploy

# Seed database (if seed file exists)
docker compose exec app npx prisma db seed
```

### Backup
```bash
# Create database backup
docker compose exec db pg_dump -U melo_user melo_v2 > backup.sql

# Restore from backup
docker compose exec -i db psql -U melo_user melo_v2 < backup.sql
```

## Monitoring and Logs

### Health Checks
- Application: http://localhost:3000/api/health
- Database: Auto-checked by Docker
- Redis: Auto-checked by Docker

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f db
docker compose logs -f redis
```

### Container Status
```bash
# Check all containers
docker compose ps

# Check resource usage
docker stats
```

## SSL/HTTPS (Production)

For production deployment with SSL:

1. **Create nginx configuration:**
   ```bash
   mkdir nginx
   # Add your nginx.conf with SSL configuration
   ```

2. **Add SSL certificates:**
   ```bash
   mkdir nginx/certs
   # Copy your SSL certificates here
   ```

3. **Start with nginx profile:**
   ```bash
   docker compose --profile production up -d
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Change port in .env
   PORT=3001
   ```

2. **Database connection issues:**
   ```bash
   # Check database is running
   docker compose ps db
   
   # Check logs
   docker compose logs db
   ```

3. **Build failures:**
   ```bash
   # Rebuild without cache
   docker compose build --no-cache app
   ```

4. **Permission issues:**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

### Reset Everything
```bash
# Stop and remove all containers and volumes
docker compose down -v

# Remove built images
docker compose build --no-cache
```

## Performance Optimization

### Resource Limits
Add to docker-compose.yml for resource constraints:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
```

### Volume Optimizations
- Use named volumes for better performance
- Mount specific directories only when needed
- Consider using tmpfs for temporary data

## Security

- Application runs as non-root user
- Database credentials in environment variables
- No sensitive data in images
- Health checks prevent unhealthy containers

## Support

- Check application logs: `docker compose logs app`
- Verify environment variables are set correctly
- Ensure all external services (Clerk, UploadThing, LiveKit) are configured
- Health check endpoint: `/api/health`