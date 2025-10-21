#!/bin/bash
# Initial setup script for Ido-Esperanto Translator

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     Ido-Esperanto Web Translator - Initial Setup        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "Checking prerequisites..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✓ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js 18 or later."
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✓ npm installed: $NPM_VERSION"
else
    echo "❌ npm not found."
    exit 1
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "✓ Docker installed: $DOCKER_VERSION"
else
    echo "❌ Docker not found. Please install Docker Desktop."
    exit 1
fi

# Check Firebase CLI
if command -v firebase &> /dev/null; then
    FIREBASE_VERSION=$(firebase --version)
    echo "✓ Firebase CLI installed: $FIREBASE_VERSION"
else
    echo "⚠  Firebase CLI not found. Install with: npm install -g firebase-tools"
fi

# Check gcloud
if command -v gcloud &> /dev/null; then
    echo "✓ Google Cloud SDK installed"
else
    echo "⚠  Google Cloud SDK not found (needed for production deployment)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Installing dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install
echo ""

# Install functions dependencies
echo "📦 Installing Cloud Functions dependencies..."
cd functions
npm install
cd ..
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the APy server (first time takes 10-15 min):"
echo "   cd apy-server && docker-compose up -d && cd .."
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "For production deployment, see QUICKSTART.md or run:"
echo "   ./scripts/deploy-all.sh"
echo ""
echo "For help, read:"
echo "   - README.md - Project overview"
echo "   - QUICKSTART.md - Quick start guide"
echo "   - DEPLOYMENT.md - Production deployment"
echo ""

