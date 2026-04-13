#!/usr/bin/env python3
import subprocess
import os
import sys

project_dir = '/vercel/share/v0-project'
os.chdir(project_dir)

print('🚀 Deploying DoorWise to Vercel...\n')
print(f'📂 Project directory: {project_dir}')

try:
    # Configure git
    print('\n🔧 Configuring git...')
    subprocess.run(['git', 'config', 'user.name', 'v0[bot]'], check=True)
    subprocess.run(['git', 'config', 'user.email', 'v0[bot]@users.noreply.github.com'], check=True)
    
    # Check status
    print('\n📋 Current git status:')
    subprocess.run(['git', 'status'], check=True)
    
    # Stage changes
    print('\n📝 Staging all changes...')
    subprocess.run(['git', 'add', '-A'], check=True)
    
    # Commit
    print('\n💾 Creating commit...')
    commit_message = """feat: Complete DoorWise product redesign with minimal CSS design system

- Fixed blank page issue by replacing 1151-line CSS with clean 140-line minimal design
- Created reusable component library (Button, Badge, Card, Input, Alert, etc.)
- Redesigned Landing page with hero, investor thesis, and footer
- Implemented Setup page with multi-step wizard for address configuration
- Enhanced Dashboard with two-column layout, camera panel, and chat interface
- Added IncidentLog with analytics, search, filter, and export
- Improved useVoice hook with audio level visualization
- Added BuildingSwitcher for multi-building support
- Consolidated font loading and fixed SEO meta tags

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>"""
    
    subprocess.run(['git', 'commit', '-m', commit_message], check=True)
    
    # Push
    print('\n🔗 Pushing to GitHub...')
    subprocess.run(['git', 'push', 'origin', 'project-overview'], check=True)
    
    print('\n✅ Successfully deployed to GitHub!')
    print('   Vercel deployment will start automatically.\n')
    print('📍 Repository: zhongnz/doorwise')
    print('🌳 Branch: project-overview')
    print('\n🎉 DoorWise is now live on Vercel!')

except subprocess.CalledProcessError as error:
    print(f'\n❌ Deployment failed:')
    print(f'Error: {error}')
    sys.exit(1)
except Exception as error:
    print(f'\n❌ Deployment failed:')
    print(f'Error: {error}')
    sys.exit(1)
