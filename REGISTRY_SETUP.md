# Container Registry Setup Guide

This guide explains how to use pre-built Docker images from GitHub Container Registry instead of building from Dockerfiles.

## Benefits

- **Faster deployments**: No need to build images on the production server
- **Consistency**: Same image across all environments
- **Version control**: Tag and track different versions
- **Bandwidth savings**: Pull once, run many times

## Prerequisites

- Docker installed on both development and production machines
- GitHub account
- GitHub Personal Access Token (PAT) with `write:packages` and `read:packages` scopes

## One-Time Setup

### 1. Create GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: "Docker Registry Access"
4. Scopes: Select `write:packages`, `read:packages`, `delete:packages`
5. Click "Generate token"
6. **Save the token securely** (you won't see it again!)

### 2. Login to GitHub Container Registry

On your **development machine** (where you build images):

```bash
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

On your **production server** (where you deploy):

```bash
# For public images, no login needed
# For private images, login the same way:
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## Building and Pushing Images

### Method 1: Using the Helper Script (Recommended)

```bash
# Build and push with version tag
./build-and-push.sh YOUR_GITHUB_USERNAME 1.0.0

# Build and push with latest tag
./build-and-push.sh YOUR_GITHUB_USERNAME
```

The script will:
1. Build both frontend and backend images
2. Tag them with your version and "latest"
3. Ask for confirmation before pushing
4. Push to GitHub Container Registry

### Method 2: Manual Build and Push

```bash
# Set your variables
GITHUB_USERNAME="your-github-username"
VERSION="1.0.0"

# Build backend
docker build -t ghcr.io/$GITHUB_USERNAME/budget-tracker-backend:$VERSION ./backend
docker tag ghcr.io/$GITHUB_USERNAME/budget-tracker-backend:$VERSION ghcr.io/$GITHUB_USERNAME/budget-tracker-backend:latest

# Build frontend
docker build -t ghcr.io/$GITHUB_USERNAME/budget-tracker-frontend:$VERSION ./frontend
docker tag ghcr.io/$GITHUB_USERNAME/budget-tracker-frontend:$VERSION ghcr.io/$GITHUB_USERNAME/budget-tracker-frontend:latest

# Push to registry
docker push ghcr.io/$GITHUB_USERNAME/budget-tracker-backend:$VERSION
docker push ghcr.io/$GITHUB_USERNAME/budget-tracker-backend:latest
docker push ghcr.io/$GITHUB_USERNAME/budget-tracker-frontend:$VERSION
docker push ghcr.io/$GITHUB_USERNAME/budget-tracker-frontend:latest
```

## Deploying on Production Server

### 1. Update docker-compose.yml

Use the `docker-compose.registry.yml` file (or update your existing docker-compose.yml):

```yaml
services:
  backend:
    image: ghcr.io/YOUR_GITHUB_USERNAME/budget-tracker-backend:latest
    # Remove the 'build:' section
    environment:
      # ... your environment variables

  frontend:
    image: ghcr.io/YOUR_GITHUB_USERNAME/budget-tracker-frontend:latest
    # Remove the 'build:' section
    environment:
      # ... your environment variables
```

### 2. Pull and Run

```bash
cd /docker/budget-tracker-personal

# Pull latest images
docker-compose pull

# Stop existing containers
docker-compose down

# Start with new images
docker-compose up -d

# View logs
docker-compose logs -f
```

## Updating Your Application

When you make code changes:

### On Development Machine:

```bash
# 1. Make your code changes
# 2. Build and push new version
./build-and-push.sh YOUR_GITHUB_USERNAME 1.0.1

# Or push to latest
./build-and-push.sh YOUR_GITHUB_USERNAME
```

### On Production Server:

```bash
# Pull latest images
docker-compose pull

# Restart containers with new images
docker-compose up -d

# Or do it in one command
docker-compose pull && docker-compose up -d
```

## Making Images Public

By default, images pushed to ghcr.io are private. To make them public:

1. Go to your GitHub profile
2. Click "Packages"
3. Click on the package (e.g., "budget-tracker-backend")
4. Click "Package settings"
5. Scroll to "Danger Zone"
6. Click "Change visibility" → "Public"

Public images don't require authentication to pull.

## Versioning Strategy

Recommended tagging strategy:

- `latest` - Always points to the most recent build
- `1.0.0` - Specific version (semantic versioning)
- `v1.0.0` - Alternative version format
- `dev` - Development/testing builds
- `prod` - Production-ready builds

Example:

```bash
# Tag as version and latest
./build-and-push.sh myusername 1.2.0

# Production uses specific version for stability
docker-compose.yml: image: ghcr.io/myusername/budget-tracker-backend:1.2.0

# Development uses latest
docker-compose.dev.yml: image: ghcr.io/myusername/budget-tracker-backend:latest
```

## Troubleshooting

### "unauthorized: authentication required"

- Make sure you've logged in with `docker login ghcr.io`
- Verify your PAT has `write:packages` and `read:packages` scopes
- Check that the PAT hasn't expired

### "denied: permission_denied"

- Verify the image name matches your GitHub username
- For private images, ensure you're logged in on the machine pulling the image

### Images not updating

```bash
# Force pull latest images
docker-compose pull --no-cache

# Remove old images
docker images | grep budget-tracker
docker rmi <image-id>

# Pull and restart
docker-compose up -d --force-recreate
```

### Check which version is running

```bash
# Check image digest
docker images --digests | grep budget-tracker

# Check when image was created
docker inspect ghcr.io/username/budget-tracker-backend:latest | grep Created
```

## Files in This Repo

- `build-and-push.sh` - Helper script to build and push images
- `docker-compose.yml` - Standard compose file (with build sections)
- `docker-compose.registry.yml` - Example compose file using registry images
- `REGISTRY_SETUP.md` - This guide

## Quick Reference

```bash
# Login to registry
echo "TOKEN" | docker login ghcr.io -u USERNAME --password-stdin

# Build and push
./build-and-push.sh USERNAME VERSION

# Pull and deploy
docker-compose pull && docker-compose up -d

# View logs
docker-compose logs -f

# Check running containers
docker-compose ps
```
