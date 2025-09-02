#!/bin/bash
# Flower Shop Deployment Script

set -e

# Configuration
PROJECT_NAME="flower-shop"
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
REGISTRY="ghcr.io/flower-shop"

echo "🚀 Starting deployment for $PROJECT_NAME"
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"

# Function to check deployment status
check_health() {
    local service=$1
    local port=$2
    echo "Checking health for $service..."
    
    for i in {1..30}; do
        if curl -f http://localhost:$port/health >/dev/null 2>&1; then
            echo "✅ $service is healthy"
            return 0
        fi
        echo "Waiting for $service to be ready... ($i/30)"
        sleep 10
    done
    
    echo "❌ $service failed health check"
    return 1
}

# Pull latest images
echo "📦 Pulling Docker images..."
docker-compose -f docker-compose.$ENVIRONMENT.yml pull

# Database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.$ENVIRONMENT.yml run --rm \
    order-service npm run migrate

# Stop old containers
echo "🛑 Stopping old containers..."
docker-compose -f docker-compose.$ENVIRONMENT.yml down

# Start new containers
echo "🚀 Starting new containers..."
docker-compose -f docker-compose.$ENVIRONMENT.yml up -d

# Health checks
echo "🏥 Running health checks..."
check_health "frontend" 80
check_health "api-gateway" 8000
check_health "user-service" 3001
check_health "product-service" 3002
check_health "cart-service" 3003
check_health "order-service" 3004

# Run smoke tests
echo "🔥 Running smoke tests..."
npm run test:smoke -- --env=$ENVIRONMENT

# Update load balancer
if [ "$ENVIRONMENT" == "production" ]; then
    echo "⚖️ Updating load balancer..."
    ./scripts/update-load-balancer.sh $VERSION
fi

# Send notifications
echo "📧 Sending deployment notifications..."
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"✅ $PROJECT_NAME deployed to $ENVIRONMENT (version: $VERSION)\"}"

echo "✨ Deployment completed successfully!"