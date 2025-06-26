#!/bin/bash

# HarmonyCode v3.1.0 Publishing Workflow
# Run this after PR is merged to main

echo "🚀 HarmonyCode v3.1.0 Publishing Workflow"
echo "========================================"

# 1. Update local main branch
echo "📥 Updating main branch..."
git checkout main
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# 4. Run tests
echo "🧪 Running tests..."
npm test

# 5. Check what will be published
echo "📋 Checking package contents..."
npm pack --dry-run

# 6. Login check
echo "🔐 Checking npm login status..."
npm whoami || echo "❌ Not logged in to npm. Run: npm login"

echo ""
echo "✅ Pre-publish checks complete!"
echo ""
echo "To publish to npm, run:"
echo "  npm publish"
echo ""
echo "After publishing:"
echo "  1. Create git tag: git tag v3.1.0 && git push origin v3.1.0"
echo "  2. Create GitHub release with CHANGELOG.md content"
echo "  3. Test installation: npm install -g harmonycode@3.1.0"