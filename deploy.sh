#!/bin/bash

# Deploy script for SecureMemo
# Usage: ./deploy.sh [dev|prod]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment argument is provided
if [ $# -eq 0 ]; then
    print_error "Usage: ./deploy.sh [dev|production]"
    print_error "  dev  - Deploy to development (securememo-dev.timo-heimonen.workers.dev)"
    print_error "  production - Deploy to production (securememo.app)"
    exit 1
fi

ENV=$1

case $ENV in
    "dev")
        print_status "Deploying to DEVELOPMENT environment..."
        print_status "Target: securememo-dev.timo-heimonen.workers.dev"
        wrangler deploy --env dev
        print_status "Development deployment completed successfully!"
        ;;
    "production")
        print_warning "=== PRODUCTION DEPLOYMENT WARNING ==="
        print_warning "You are about to deploy to PRODUCTION environment!"
        print_warning "Target: securememo.app"
        print_warning "This will affect live users."
        echo
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [[ $confirm != "yes" ]]; then
            print_error "Production deployment cancelled by user."
            exit 1
        fi
        echo
        print_status "Deploying to PRODUCTION environment..."
        print_status "Target: securememo.app"
        wrangler deploy --env production
        print_status "Production deployment completed successfully!"
        ;;
    *)
        print_error "Invalid environment: $ENV"
        print_error "Usage: ./deploy.sh [dev|production]"
        exit 1
        ;;
esac
