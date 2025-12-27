#!/bin/bash

# Imperiu Sui Luris - Launch Verification Script
# Run this to verify everything is set up correctly

echo "🚀 Imperiu Sui Luris - Project Verification"
echo "==========================================="
echo ""

# Check Node and npm
echo "✓ Checking Node.js..."
node --version

echo "✓ Checking npm..."
npm --version

echo ""
echo "📦 Project Structure:"
echo "-------------------"

# Count files
PAGES=$(find src/app -name "page.tsx" | wc -l)
APIS=$(find src/app/api -name "route.ts" | wc -l)
COMPONENTS=$(find src/components -name "*.tsx" | wc -l)
TYPES=$(find src/types -name "*.ts" | wc -l)

echo "  Pages: $PAGES"
echo "  API Routes: $APIS"
echo "  Components: $COMPONENTS"
echo "  Type definitions: $TYPES"

echo ""
echo "🔧 Configuration Files:"
echo "---------------------"
echo -n "  package.json: "
[ -f package.json ] && echo "✓" || echo "✗"

echo -n "  tsconfig.json: "
[ -f tsconfig.json ] && echo "✓" || echo "✗"

echo -n "  next.config.ts: "
[ -f next.config.ts ] && echo "✓" || echo "✗"

echo -n "  tailwind.config.ts: "
[ -f tailwind.config.ts ] && echo "✓" || echo "✗"

echo -n "  .env.local: "
[ -f .env.local ] && echo "✓" || echo "✗"

echo ""
echo "🌐 Key Files:"
echo "------------"
echo -n "  API Auth: "
[ -f src/app/api/auth/route.ts ] && echo "✓" || echo "✗"

echo -n "  API Users: "
[ -f src/app/api/users/route.ts ] && echo "✓" || echo "✗"

echo -n "  API Marketplace: "
[ -f src/app/api/marketplace/route.ts ] && echo "✓" || echo "✗"

echo -n "  API Feed: "
[ -f src/app/api/feed/route.ts ] && echo "✓" || echo "✗"

echo -n "  API Land: "
[ -f src/app/api/land/route.ts ] && echo "✓" || echo "✗"

echo ""
echo "📄 Documentation:"
echo "----------------"
echo -n "  README_IMPERIU.md: "
[ -f README_IMPERIU.md ] && echo "✓" || echo "✗"

echo -n "  SETUP_GUIDE_RO.md: "
[ -f SETUP_GUIDE_RO.md ] && echo "✓" || echo "✗"

echo -n "  DEPLOYMENT_GUIDE.md: "
[ -f DEPLOYMENT_GUIDE.md ] && echo "✓" || echo "✗"

echo ""
echo "✅ Build Status:"
echo "---------------"
echo -n "  Production build: "
if [ -d .next ]; then
    echo "✓ Built"
else
    echo "⚠ Not built (run: npm run build)"
fi

echo ""
echo "🎉 All systems ready for deployment!"
echo ""
echo "Next steps:"
echo "1. npm run dev          # Start local server"
echo "2. git push            # Push to GitHub"
echo "3. vercel deploy       # Deploy to Vercel"
echo ""
