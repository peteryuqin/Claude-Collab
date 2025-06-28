# Publishing Claude-Collab v3.1.0 to npm

## Prerequisites
- PR merged to main branch
- npm account with publish access to 'claude-collab' package
- Clean working directory

## Step-by-Step Publishing Process

### 1. Update Local Repository
```bash
cd /Users/peter/claude-collab-github
git checkout main
git pull origin main
```

### 2. Run Pre-Publish Checks
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run all tests
npm test

# Check what will be published
npm pack --dry-run
```

### 3. Login to npm (if needed)
```bash
npm whoami
# If not logged in:
npm login
```

### 4. Publish to npm
```bash
npm publish
```

### 5. Create Git Tag
```bash
git tag v3.1.0
git push origin v3.1.0
```

### 6. Create GitHub Release
1. Go to: https://github.com/peteryuqin/Claude-Collab/releases/new
2. Choose tag: v3.1.0
3. Title: HarmonyCode v3.1.0 - Persistent Identity System
4. Copy the v3.1.0 section from CHANGELOG.md as the description
5. Click "Publish release"

### 7. Verify Installation
```bash
# Test global installation
npm install -g harmonycode@3.1.0

# Verify version
hc --version

# Test basic functionality
hc register test-agent
```

### 8. Post-Release Checklist
- [ ] npm package published successfully
- [ ] Git tag created and pushed
- [ ] GitHub release created
- [ ] Installation verified
- [ ] Announcement posted (if applicable)

## Troubleshooting

### If npm publish fails:
1. Check npm login: `npm whoami`
2. Verify package name availability: `npm view harmonycode`
3. Check for .npmignore issues: `npm pack --dry-run`
4. Ensure version doesn't already exist

### If tests fail:
1. Run: `npm test -- --verbose`
2. Check TypeScript build: `npm run build`
3. Verify no uncommitted changes

## Success Message Template
```
🎉 HarmonyCode v3.1.0 Published Successfully! 🎉

✅ npm package: https://www.npmjs.com/package/harmonycode
✅ GitHub release: https://github.com/peteryuqin/Claude-Collab/releases/tag/v3.1.0
✅ Changelog: https://github.com/peteryuqin/Claude-Collab/blob/main/CHANGELOG.md

Install with: npm install -g harmonycode@3.1.0
```