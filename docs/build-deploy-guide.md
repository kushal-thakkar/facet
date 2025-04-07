# Facet Build and Deployment Guide

This document provides instructions for building and deploying the Facet application in different environments.

## Local Development Build

### Frontend

To build the frontend for local development:

```bash
cd frontend
bun install
bun dev
```

The development server will be available at http://localhost:3000 with hot reloading enabled.

### Backend

To build the backend for local development:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000 with auto-reloading.

## Docker Development Environment

The easiest way to get started is to use Docker Compose to set up the entire development environment:

```bash
docker-compose -f docker-compose.dev.yml up
```

This will start:
- Frontend at http://localhost:3000
- Backend at http://localhost:8000
- PostgreSQL at localhost:5432
- ClickHouse at localhost:8123
- Mock database at http://localhost:8080

### Rebuilding Docker Images

If you make changes to the Dockerfiles or dependency files:

```bash
docker-compose build
```

To rebuild a specific service:

```bash
docker-compose build frontend
```

### Docker Development Tips

- Container logs: `docker-compose logs -f [service-name]`
- Shell access: `docker-compose exec [service-name] sh`
- Restart a service: `docker-compose restart [service-name]`
- PostgreSQL CLI: `docker-compose exec postgres psql -U facet -d facet`
- ClickHouse CLI: `docker-compose exec clickhouse clickhouse-client`

## Production Build

### Frontend Production Build

To create an optimized production build:

```bash
cd frontend
bun install
bun build
```

The build output will be in the `.next` directory. To start the production server:

```bash
bun start
```

### Backend Production Build

For production, it's recommended to use Gunicorn with Uvicorn workers:

```bash
cd backend
pip install gunicorn
gunicorn -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000 main:app
```

## Docker Production Deployment

### Building Production Docker Images

Production Docker images use multi-stage builds to minimize image size:

```bash
# Build the frontend production image
docker build -t facet-frontend:prod -f frontend/Dockerfile.prod frontend

# Build the backend production image
docker build -t facet-backend:prod -f backend/Dockerfile.prod backend
```

### Docker Compose for Production

A production Docker Compose file is provided:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Production Environment Variables

Set these environment variables for production:

**Frontend:**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NODE_ENV=production`
- `BUN_ENV=production`

**Backend:**
- `ENVIRONMENT=production`
- `SECRET_KEY` - Random string for security
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `ALLOWED_ORIGINS` - CORS allowed origins

## Cloud Deployment

### AWS Deployment

#### Prerequisites
- AWS CLI configured
- ECR repositories for frontend and backend images
- ECS cluster or EKS cluster

#### Push Docker Images to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push frontend image
docker tag facet-frontend:prod <account-id>.dkr.ecr.us-east-1.amazonaws.com/facet-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/facet-frontend:latest

# Tag and push backend image
docker tag facet-backend:prod <account-id>.dkr.ecr.us-east-1.amazonaws.com/facet-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/facet-backend:latest
```

#### ECS Task Definition

Create an ECS task definition with both containers:

```json
{
  "family": "facet-app",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/facet-frontend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 80,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NEXT_PUBLIC_API_URL", "value": "https://api.example.com" }
      ]
    },
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/facet-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "hostPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "ENVIRONMENT", "value": "production" },
        { "name": "ALLOWED_ORIGINS", "value": "https://app.example.com" }
      ]
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole"
}
```

#### Deploy to ECS

```bash
aws ecs create-service --cluster facet-cluster --service-name facet-service --task-definition facet-app:1 --desired-count 1 --launch-type FARGATE
```

### Kubernetes Deployment

#### Prerequisites
- kubectl configured
- Kubernetes cluster

#### Kubernetes Manifests

Create deployment manifests:

**frontend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: facet-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: facet-frontend
  template:
    metadata:
      labels:
        app: facet-frontend
    spec:
      containers:
      - name: frontend
        image: facet-frontend:prod
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "http://facet-backend:8000"
```

**backend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: facet-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: facet-backend
  template:
    metadata:
      labels:
        app: facet-backend
    spec:
      containers:
      - name: backend
        image: facet-backend:prod
        ports:
        - containerPort: 8000
        env:
        - name: ENVIRONMENT
          value: "production"
```

**services.yaml:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: facet-frontend
spec:
  selector:
    app: facet-frontend
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
---
apiVersion: v1
kind: Service
metadata:
  name: facet-backend
spec:
  selector:
    app: facet-backend
  ports:
  - port: 8000
    targetPort: 8000
```

#### Deploy to Kubernetes

```bash
kubectl apply -f frontend-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f services.yaml
```

## Continuous Deployment

### GitHub Actions Workflow

Create a GitHub Actions workflow for continuous deployment:

```yaml
name: CD Pipeline

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push frontend image
        uses: docker/build-push-action@v2
        with:
          context: ./frontend
          file: ./frontend/Dockerfile.prod
          push: true
          tags: ${{ steps.login-ecr.outputs.registry }}/facet-frontend:latest
      
      - name: Build and push backend image
        uses: docker/build-push-action@v2
        with:
          context: ./backend
          file: ./backend/Dockerfile.prod
          push: true
          tags: ${{ steps.login-ecr.outputs.registry }}/facet-backend:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster facet-cluster --service facet-service --force-new-deployment
```

## Database Migration

### PostgreSQL Migration

For PostgreSQL schema migrations, use Alembic:

```bash
cd backend
alembic revision --autogenerate -m "Create initial tables"
alembic upgrade head
```

### ClickHouse Migration

For ClickHouse, use SQL migration scripts:

```bash
clickhouse-client --host=localhost --query="$(cat ./scripts/migrations/001_create_tables.sql)"
```

## SSL Configuration

### Setting up SSL with Nginx

Sample Nginx configuration:

```nginx
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring and Logging

### Prometheus and Grafana Setup

1. Add Prometheus client to the backend:

```python
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()
Instrumentator().instrument(app).expose(app)
```

2. Configure Prometheus to scrape metrics:

```yaml
scrape_configs:
  - job_name: 'facet-backend'
    scrape_interval: 15s
    static_configs:
      - targets: ['backend:8000']
```

3. Set up Grafana dashboards for monitoring backend performance.

### Centralized Logging with ELK Stack

1. Configure filebeat to collect logs from Docker containers
2. Send logs to Elasticsearch
3. Create Kibana dashboards for log analysis

## Troubleshooting Deployment Issues

### Common Issues

1. **Connection issues between services**
   - Check network configuration and firewall rules
   - Verify service names and ports
   - Ensure services are in the same Docker network

2. **Database connection issues**
   - Verify connection strings and credentials
   - Check database server is accessible from the application

3. **Performance issues**
   - Monitor CPU, memory, and disk usage
   - Check for slow database queries
   - Consider adding caching

### Debug Mode

Enable debug mode for more detailed logs:

**Frontend:**
```bash
BUN_ENV=development bun dev
```

**Backend:**
```bash
uvicorn app.main:app --reload --log-level debug
```

## Rollback Procedure

In case of deployment issues:

1. **Docker Compose:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d --force-recreate
   ```

2. **Kubernetes:**
   ```bash
   kubectl rollout undo deployment/facet-frontend
   kubectl rollout undo deployment/facet-backend
   ```

3. **AWS ECS:**
   ```bash
   aws ecs update-service --cluster facet-cluster --service facet-service --task-definition facet-app:previous-version
   ```