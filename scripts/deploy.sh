#!/bin/bash

# Production deployment script

echo "🚀 Deploying Hotel Management System to production..."

# Build production images
echo "🏗️  Building production images..."
docker-compose build

# Start production services
echo "▶️  Starting production services..."
docker-compose --profile production up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Production deployment complete!"
    echo ""
    echo "🌐 Application: http://localhost"
    echo "🔧 Backend API: http://localhost/api"
    echo ""
    echo "📋 To view logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
else
    echo "❌ Deployment failed. Check logs with:"
    echo "docker-compose logs"
fi