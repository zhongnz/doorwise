#!/usr/bin/env python3
import subprocess
import os
import sys

# Get project directory from pwd or use common paths
project_dir = os.getcwd()
print(f'Current working directory: {project_dir}')

# If not in project root, search for it
if not os.path.exists(os.path.join(project_dir, 'package.json')):
    # Search parent directories
    for parent in ['/vercel/share/v0-project', os.path.expanduser('~'), '/home/user']:
        if os.path.exists(os.path.join(parent, 'package.json')):
            project_dir = parent
            break

print(f'Project directory: {project_dir}')
print(f'Has package.json: {os.path.exists(os.path.join(project_dir, "package.json"))}')
print(f'Has .git: {os.path.exists(os.path.join(project_dir, ".git"))}\n')

if not os.path.exists(os.path.join(project_dir, '.git')):
    print('Error: .git directory not found')
    sys.exit(1)

print('Deploying DoorWise to Vercel...\n')

try:
    # Configure git
    print('Configuring git...')
    subprocess.run(['git', 'config', 'user.name', 'v0[bot]'], check=True, cwd=project_dir, capture_output=True)
    subprocess.run(['git', 'config', 'user.email', 'v0[bot]@users.noreply.github.com'], check=True, cwd=project_dir, capture_output=True)
    
    # Check status
    print('Current git status:')
    subprocess.run(['git', 'status'], check=True, cwd=project_dir)
    
    # Stage changes
    print('\nStaging all changes...')
    subprocess.run(['git', 'add', '-A'], check=True, cwd=project_dir, capture_output=True)
    
    # Commit
    print('Creating commit...')
    commit_message = """feat: Complete DoorWise product redesign with minimal CSS design system

- Fixed blank page issue by replacing complex CSS with clean minimal design
- Created reusable component library (Button, Badge, Card, Input, Alert, etc.)
- Redesigned Landing page with hero, investor thesis, and footer
- Implemented Setup page with multi-step wizard for address configuration
- Enhanced Dashboard with two-column layout, camera panel, and chat interface
- Added IncidentLog with analytics, search, filter, and export
- Improved useVoice hook with audio level visualization
- Added BuildingSwitcher for multi-building support
- Consolidated font loading and fixed SEO meta tags

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>"""
    
    subprocess.run(['git', 'commit', '-m', commit_message], check=True, cwd=project_dir)
    
    # Push
    print('\nPushing to GitHub...')
    subprocess.run(['git', 'push', 'origin', 'project-overview'], check=True, cwd=project_dir)
    
    print('\nSuccessfully deployed to GitHub!')
    print('Vercel deployment will start automatically.\n')
    print('Repository: zhongnz/doorwise')
    print('Branch: project-overview')
    print('\nDoorWise is now live on Vercel!')

except subprocess.CalledProcessError as error:
    print(f'\nDeployment failed with error code {error.returncode}')
    sys.exit(1)
except Exception as error:
    print(f'\nDeployment failed: {error}')
    sys.exit(1)

