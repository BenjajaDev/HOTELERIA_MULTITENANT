#!/bin/bash

# Development setup script for Hotel Management System

echo "🏨 Setting up Hotel Management System..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment files from examples
echo "📝 Creating environment files..."

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
fi

# Build and start development environment
echo "🐳 Building and starting Docker containers..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo "✅ Services are running!"
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:3001"
    echo "🗄️  Database: localhost:5432"
    echo ""
    echo "📚 Demo credentials:"
    echo "   Tenant ID: demo"
    echo "   Email: admin@demo.com"
    echo "   Password: password123"
    echo ""
    echo "🛠️  To stop services: ./scripts/stop.sh"
    echo "📋 To view logs: docker-compose -f docker-compose.dev.yml logs -f"
else
    echo "❌ Some services failed to start. Check logs with:"
    echo "docker-compose -f docker-compose.dev.yml logs"
fi