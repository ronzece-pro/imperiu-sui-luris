#!/bin/bash

# 🚀 Imperiu Sui Luris - Quick Start Script
# This script helps you get started with the project

set -e

echo ""
echo "🚀 =========================================="
echo "   Imperiu Sui Luris - Quick Start"
echo "=========================================="
echo ""

# Get user's choice
echo "What would you like to do?"
echo ""
echo "1. Run development server (npm run dev)"
echo "2. Build for production (npm run build)"
echo "3. Push to GitHub"
echo "4. Deploy to Vercel"
echo "5. View documentation"
echo "6. Run verification"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
  1)
    echo ""
    echo "🔥 Starting development server..."
    echo "📝 Open http://localhost:3000 in your browser"
    echo ""
    npm run dev
    ;;
  2)
    echo ""
    echo "🏗️  Building for production..."
    npm run build
    echo ""
    echo "✅ Build complete! Ready for deployment."
    ;;
  3)
    echo ""
    echo "📤 Preparing for GitHub..."
    echo ""
    if [ -d .git ]; then
      echo "Adding files..."
      git add .
      read -p "Enter commit message: " commit_msg
      git commit -m "$commit_msg"
      echo ""
      echo "Ready to push! Run: git push origin main"
    else
      echo "❌ Git not initialized. Run: git init"
    fi
    ;;
  4)
    echo ""
    echo "☁️  Deploying to Vercel..."
    echo ""
    if command -v vercel &> /dev/null; then
      vercel
    else
      echo "Installing Vercel CLI..."
      npm install -g vercel
      vercel
    fi
    ;;
  5)
    echo ""
    echo "📚 Opening documentation..."
    echo ""
    echo "Available documentation:"
    echo "  - README_IMPERIU.md (Full documentation)"
    echo "  - DEPLOYMENT_GUIDE.md (Deployment instructions)"
    echo "  - SETUP_GUIDE_RO.md (Romanian guide)"
    echo "  - FINAL_SUMMARY.md (Complete summary)"
    echo ""
    read -p "Which file would you like to open? (or press enter to skip): " doc
    if [ ! -z "$doc" ]; then
      cat "$doc.md"
    fi
    ;;
  6)
    echo ""
    echo "🔍 Running verification..."
    ./verify-setup.sh
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✅ Done!"
echo ""
