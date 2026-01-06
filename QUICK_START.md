# Quick Start: Container Registry Workflow

## First Time Setup (5 minutes)

### 1. Get GitHub Token
- Go to: https://github.com/settings/tokens
- Click "Generate new token (classic)"
- Select: `write:packages` + `read:packages`
- Save the token!

### 2. Login to Registry (Development Machine)
```bash
cd /root/projects/financials
echo "YOUR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 3. Build and Push Your First Images
```bash
./build-and-push.sh YOUR_GITHUB_USERNAME 1.0.0
# Type 'y' when prompted to push
```

### 4. Update docker-compose.registry.yml
Replace `YOUR_GITHUB_USERNAME` with your actual username:
```yaml
image: ghcr.io/YOUR_GITHUB_USERNAME/budget-tracker-backend:latest
image: ghcr.io/YOUR_GITHUB_USERNAME/budget-tracker-frontend:latest
```

### 5. Deploy on Production Server
```bash
# SSH into your production server
ssh your-server

# Copy docker-compose.registry.yml to /docker/budget-tracker-personal/docker-compose.yml
# OR just update the image: lines in your existing docker-compose.yml

cd /docker/budget-tracker-personal

# Pull images and start
docker-compose pull
docker-compose up -d
```

## Daily Workflow

### When You Make Code Changes:

**On Development Machine:**
```bash
# 1. Edit your code (App.jsx, server.js, etc.)

# 2. Build and push new version
./build-and-push.sh YOUR_GITHUB_USERNAME

# 3. That's it! Images are now in the registry
```

**On Production Server:**
```bash
# Pull latest and restart
cd /docker/budget-tracker-personal
docker-compose pull && docker-compose up -d
```

## Common Commands

### Development (Build & Push)
```bash
# Build and push latest
./build-and-push.sh myusername

# Build and push specific version
./build-and-push.sh myusername 1.0.1
```

### Production (Pull & Deploy)
```bash
# Pull and restart
docker-compose pull && docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

## Comparison: Before vs After

### BEFORE (Building on Server)
```bash
cd /docker/budget-tracker-personal
docker-compose build  # 5-10 minutes
docker-compose up -d
```

### AFTER (Using Registry)
```bash
cd /docker/budget-tracker-personal
docker-compose pull   # 30 seconds
docker-compose up -d  # 10 seconds
```

## Your Image Names

After you set up, your images will be:

```
ghcr.io/YOUR_GITHUB_USERNAME/budget-tracker-backend:latest
ghcr.io/YOUR_GITHUB_USERNAME/budget-tracker-frontend:latest
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username (lowercase).

## Need Help?

See [REGISTRY_SETUP.md](REGISTRY_SETUP.md) for detailed documentation.
