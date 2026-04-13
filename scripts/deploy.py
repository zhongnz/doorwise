#!/usr/bin/env python3
import subprocess
import os
import sys

# Get current working directory and navigate to project
cwd = os.getcwd()
print(f'Current directory: {cwd}')
print(f'Files in current directory: {os.listdir(cwd)}')

# Check if we're already in the project or need to navigate
if os.path.exists('package.json') and os.path.exists('.git'):
    project_dir = cwd
else:
    # Try common paths
    possible_paths = [
        '/vercel/share/v0-project',
        os.path.expanduser('~/v0-project'),
        './v0-project',
    ]
    
    project_dir = None
    for path in possible_paths:
        if os.path.exists(os.path.join(path, 'package.json')):
            project_dir = path
            break
    
    if not project_dir:
        print('Error: Could not find project directory')
        sys.exit(1)

os.chdir(project_dir)
print(f'Changed to: {project_dir}\n')

print('Deploying DoorWise to Vercel...\n')

try:
    # Configure git
    print('Configuring git...')
    subprocess.run(['git', 'config', 'user.name', 'v0[bot]'], check=True, capture_output=True)
    subprocess.run(['git', 'config', 'user.email', 'v0[bot]@users.noreply.github.com'], check=True, capture_output=True)
    
    # Check status
    print('\nCurrent git status:')
    result = subprocess.run(['git', 'status'], check=True)
    
    # Stage changes
    print('\nStaging all changes...')
    subprocess.run(['git', 'add', '-A'], check=True)
    
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
    
    subprocess.run(['git', 'commit', '-m', commit_message], check=True)
    
    # Push
    print('\nPushing to GitHub...')
    subprocess.run(['git', 'push', 'origin', 'project-overview'], check=True)
    
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
