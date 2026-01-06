#!/bin/bash
# Build and push Docker images to GitHub Container Registry
# Usage: ./build-and-push.sh <github-username> <version>

set -e

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <github-username> [version]"
    echo "Example: $0 myusername 1.0.0"
    exit 1
fi

GITHUB_USERNAME=$1
VERSION=${2:-latest}
REGISTRY="ghcr.io"

echo "================================================"
echo "Building images for registry: $REGISTRY"
echo "GitHub username: $GITHUB_USERNAME"
echo "Version: $VERSION"
echo "================================================"

# Image names
BACKEND_IMAGE="$REGISTRY/$GITHUB_USERNAME/budget-tracker-backend"
FRONTEND_IMAGE="$REGISTRY/$GITHUB_USERNAME/budget-tracker-frontend"

# Build backend
echo ""
echo "Building backend image..."
docker build -t $BACKEND_IMAGE:$VERSION ./backend
docker tag $BACKEND_IMAGE:$VERSION $BACKEND_IMAGE:latest

# Build frontend
echo ""
echo "Building frontend image..."
docker build -t $FRONTEND_IMAGE:$VERSION ./frontend
docker tag $FRONTEND_IMAGE:$VERSION $FRONTEND_IMAGE:latest

echo ""
echo "================================================"
echo "Built images:"
echo "  $BACKEND_IMAGE:$VERSION"
echo "  $BACKEND_IMAGE:latest"
echo "  $FRONTEND_IMAGE:$VERSION"
echo "  $FRONTEND_IMAGE:latest"
echo "================================================"

# Ask before pushing
echo ""
read -p "Push images to registry? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Pushing backend images..."
    docker push $BACKEND_IMAGE:$VERSION
    docker push $BACKEND_IMAGE:latest

    echo ""
    echo "Pushing frontend images..."
    docker push $FRONTEND_IMAGE:$VERSION
    docker push $FRONTEND_IMAGE:latest

    echo ""
    echo "================================================"
    echo "✓ Images pushed successfully!"
    echo "================================================"
    echo ""
    echo "To use these images, update your docker-compose.yml:"
    echo ""
    echo "  backend:"
    echo "    image: $BACKEND_IMAGE:$VERSION"
    echo "    # Remove build section"
    echo ""
    echo "  frontend:"
    echo "    image: $FRONTEND_IMAGE:$VERSION"
    echo "    # Remove build section"
    echo ""
else
    echo "Push cancelled."
fi
