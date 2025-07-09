#!/bin/bash

# VPS Deployment Script for Seiron Backend

echo "🐉 Seiron VPS Deployment Script"
echo "================================"

# Check if VPS_HOST is provided
if [ -z "$1" ]; then
    echo "Usage: ./deploy-to-vps.sh <vps-host-or-ip>"
    echo "Example: ./deploy-to-vps.sh your-domain.com"
    echo "Example: ./deploy-to-vps.sh 123.45.67.89"
    exit 1
fi

VPS_HOST=$1

echo "📦 Preparing deployment for: $VPS_HOST"

# Update nginx.conf with actual domain
sed -i.bak "s/your-domain.com/$VPS_HOST/g" nginx.conf

# Create deployment directory
ssh root@$VPS_HOST "mkdir -p /opt/seiron"

# Copy files to VPS
echo "📤 Copying files to VPS..."
scp -r backend docker-compose.prod.yml nginx.conf .env.production root@$VPS_HOST:/opt/seiron/

# Connect to VPS and deploy
echo "🚀 Deploying on VPS..."
ssh root@$VPS_HOST << 'ENDSSH'
cd /opt/seiron

# Copy production env
cp .env.production .env

# Build and start services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Show status
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment complete!"
echo "Backend available at: http://$VPS_HOST:8000"
ENDSSH

echo ""
echo "🎯 Next steps:"
echo "1. Update Vercel environment variables:"
echo "   VITE_API_URL=http://$VPS_HOST:8000"
echo "   VITE_WS_URL=ws://$VPS_HOST:8000"
echo ""
echo "2. For HTTPS, set up SSL certificates on your VPS"