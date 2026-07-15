# Deployment Guide

## Local Development

### Prerequisites
- Python 3.11+
- pip
- Virtual environment

### Steps

1. **Clone and navigate**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate  # Windows
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

5. **Run server**:
   ```bash
   # Using startup script
   bash run.sh  # Linux/Mac
   run.bat  # Windows
   
   # Or directly
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Access API**:
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
   - OpenAPI: http://localhost:8000/openapi.json

---

## Docker Deployment

### Prerequisites
- Docker
- Docker Compose

### Using Docker Compose (Recommended)

1. **Build and run**:
   ```bash
   docker-compose up --build
   ```

2. **Stop**:
   ```bash
   docker-compose down
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f backend
   ```

### Using Docker Manually

1. **Build image**:
   ```bash
   docker build -t trinetra-api:latest .
   ```

2. **Run container**:
   ```bash
   docker run -d \
     --name trinetra-api \
     -p 8000:8000 \
     -e SUPABASE_URL=<your_url> \
     -e SUPABASE_KEY=<your_key> \
     -e SUPABASE_SERVICE_KEY=<your_service_key> \
     -v $(pwd)/ml_results:/app/ml_results \
     -v $(pwd)/logs:/app/logs \
     trinetra-api:latest
   ```

3. **Check health**:
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

---

## Cloud Deployment

### AWS (EC2 + Load Balancer)

1. **Launch EC2 instance**:
   - OS: Ubuntu 22.04
   - Type: t3.medium or larger
   - Storage: 30GB+

2. **SSH into instance**:
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```

3. **Install dependencies**:
   ```bash
   sudo apt update
   sudo apt install -y python3.11 python3-pip docker.io docker-compose
   sudo usermod -aG docker ubuntu
   ```

4. **Clone and deploy**:
   ```bash
   git clone <your-repo> trinetra
   cd trinetra/backend
   cp .env.example .env
   # Edit .env with your credentials
   docker-compose up -d
   ```

5. **Setup security group**:
   - Allow HTTP (80)
   - Allow HTTPS (443)
   - Allow port 8000 (for direct access)

### Heroku

1. **Install Heroku CLI**:
   ```bash
   curl https://cli-assets.heroku.com/install.sh | sh
   ```

2. **Create Procfile**:
   ```
   web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

3. **Deploy**:
   ```bash
   heroku login
   heroku create trinetra-api
   heroku config:set SUPABASE_URL=<your_url>
   heroku config:set SUPABASE_KEY=<your_key>
   git push heroku main
   ```

### Google Cloud Run

1. **Create CloudRun service**:
   ```bash
   gcloud run deploy trinetra-api \
     --source . \
     --platform managed \
     --region us-central1 \
     --memory 512Mi \
     --cpu 1 \
     --port 8000
   ```

2. **Set environment variables**:
   ```bash
   gcloud run services update trinetra-api \
     --set-env-vars SUPABASE_URL=<your_url>,SUPABASE_KEY=<your_key>
   ```

### Azure Container Instances

1. **Create resource group**:
   ```bash
   az group create --name trinetra --location eastus
   ```

2. **Create container**:
   ```bash
   az container create \
     --resource-group trinetra \
     --name trinetra-api \
     --image <your-registry>/trinetra-api:latest \
     --ports 8000 \
     --environment-variables SUPABASE_URL=<your_url> SUPABASE_KEY=<your_key> \
     --cpu 1 \
     --memory 1
   ```

---

## Production Configuration

### Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# API
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=false

# Environment
ENVIRONMENT=production
DEBUG=false

# Logging
LOG_LEVEL=WARNING

# CORS (restrict to your domain)
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# Security
TRUSTED_HOSTS=yourdomain.com,api.yourdomain.com
```

### Nginx Reverse Proxy

```nginx
upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /health {
        proxy_pass http://backend;
        access_log off;
    }
}
```

### Systemd Service (Linux)

```ini
[Unit]
Description=Trinetra Mule Detection API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/www-data/trinetra/backend
ExecStart=/home/www-data/trinetra/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable with:
```bash
sudo systemctl enable trinetra
sudo systemctl start trinetra
sudo systemctl status trinetra
```

---

## Monitoring & Logging

### Health Checks

```bash
# Check health
curl http://localhost:8000/api/v1/health

# Check status with details
curl http://localhost:8000/api/v1/status
```

### Log Monitoring

```bash
# View application logs
docker-compose logs -f backend

# View specific service logs
tail -f logs/app.log
```

### Metrics to Monitor

- **Request latency**: Response time per endpoint
- **Error rate**: 5xx and 4xx errors
- **Database connectivity**: Supabase connection status
- **Model performance**: Prediction latency
- **Memory usage**: RAM consumption
- **CPU usage**: Processor utilization

---

## Backup & Recovery

### Database Backups

Supabase handles automatic backups. To backup data:

```bash
# Export data from Supabase
pg_dump \
  -h your-project.supabase.co \
  -U postgres \
  -d postgres \
  > backup.sql
```

### ML Results Backup

```bash
# Backup ml_results directory
tar -czf ml_results_backup.tar.gz ml_results/

# Restore
tar -xzf ml_results_backup.tar.gz
```

---

## Scaling Considerations

### Load Balancing

Deploy multiple instances behind a load balancer:

```yaml
# Docker Compose scale example
docker-compose up -d --scale backend=3
```

### Database Connection Pooling

Adjust connection pool settings in `app/database.py`:

```python
SUPABASE_POOL_SIZE = 10
SUPABASE_MAX_OVERFLOW = 20
```

### Caching

Implement Redis for caching:

```bash
# Add to docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

---

## Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Find process using port 8000
lsof -i :8000
# Kill process
kill -9 <PID>
```

**Supabase connection timeout**:
- Check firewall rules
- Verify SUPABASE_URL and credentials
- Test connectivity: `ping your-project.supabase.co`

**Out of memory**:
- Increase container memory limit
- Optimize model loading
- Enable request batching

**High latency**:
- Profile with: `python -m cProfile -o profile.stats app/main.py`
- Check database query performance
- Monitor network latency

---

## Rollback Procedure

### Docker

```bash
# Stop current version
docker-compose down

# Run previous version
docker pull trinetra-api:previous
docker run -d <options> trinetra-api:previous
```

### Git

```bash
# Revert to previous commit
git revert HEAD
git push

# Redeploy
docker-compose up --build
```

---

## Support

For issues, check:
1. Application logs
2. Health endpoint (`/api/v1/health`)
3. Status endpoint (`/api/v1/status`)
4. Database connectivity
5. Environment variables configuration
