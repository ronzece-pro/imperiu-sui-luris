#!/bin/bash
set -e

echo "🔧 Starting Render build process..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Build Next.js app
echo "🏗️  Building Next.js application..."
npm run build

echo "✅ Build completed successfully!"
