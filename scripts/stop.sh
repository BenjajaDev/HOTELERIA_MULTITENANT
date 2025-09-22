#!/bin/bash

# Stop all development services

echo "🛑 Stopping Hotel Management System services..."

docker-compose -f docker-compose.dev.yml down

echo "✅ All services stopped!"