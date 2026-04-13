#!/usr/bin/env python3
import subprocess
import os

project_dir = os.getcwd()

print(f'Deploying fix to Vercel...\n')

try:
    print('Configuring git...')
    subprocess.run(['git', 'config', 'user.name', 'v0[bot]'], check=True, cwd=project_dir, capture_output=True)
    subprocess.run(['git', 'config', 'user.email', 'v0[bot]@users.noreply.github.com'], check=True, cwd=project_dir, capture_output=True)
    
    print('Staging changes...')
    subprocess.run(['git', 'add', '-A'], check=True, cwd=project_dir, capture_output=True)
    
    print('Creating commit...')
    subprocess.run(['git', 'commit', '-m', 'fix: Remove duplicate STORAGE_KEYS export causing build error\n\n- Fixed build failure by removing duplicate STORAGE_KEYS export from useLocalStorage.js\n- STORAGE_KEYS now only exported from constants.js\n- useLocalStorage.js imports STORAGE_KEYS from constants.js\n\nCo-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>'], check=True, cwd=project_dir)
    
    print('Pushing to GitHub...')
    subprocess.run(['git', 'push', 'origin', 'project-overview'], check=True, cwd=project_dir)
    
    print('\n✅ Deployment complete!')
    print('Vercel will automatically rebuild and deploy the fix.')

except subprocess.CalledProcessError as e:
    print(f'Error: {e}')
    exit(1)
