#!/bin/bash

set -e

echo "🚀 Deploying DoorWise to Vercel..."
echo ""

# Configure git
git config user.name "v0[bot]"
git config user.email "v0[bot]@users.noreply.github.com"

# Check git status
echo "📋 Current git status:"
git status

echo ""
echo "📝 Staging changes..."
git add -A

echo ""
echo "💾 Committing changes..."
git commit -m "feat: Complete DoorWise product redesign with minimal CSS design system

- Fixed blank page issue by replacing 1151-line CSS with clean 140-line minimal design system
- Created reusable component library with Button, Badge, Card, Input, Alert, etc.
- Redesigned Landing page with hero section, investor thesis, and footer
- Implemented Setup page with multi-step wizard for address configuration
- Enhanced Dashboard with two-column layout, camera panel, and chat interface
- Added IncidentLog with analytics, search, filter, and export capabilities
- Improved useVoice hook with audio level visualization and user speaking detection
- Added BuildingSwitcher for multi-building support
- Consolidated font loading and fixed meta tags for SEO
- All components now use clean, minimal CSS with proper color system and typography

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>"

echo ""
echo "🔗 Pushing to GitHub..."
git push origin project-overview

echo ""
echo "✅ Successfully deployed to GitHub!"
echo "   Vercel deployment will start automatically."
echo ""
echo "📍 Repository: zhongnz/doorwise"
echo "🌳 Branch: project-overview"
echo ""
echo "🎉 DoorWise is now deployed!"
