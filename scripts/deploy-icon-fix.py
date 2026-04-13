#!/usr/bin/env python3
import subprocess
import os

project_dir = os.getcwd()

print('Deploying icon fix to Vercel...\n')

try:
    # Configure git
    subprocess.run(['git', 'config', 'user.name', 'v0[bot]'], check=True, cwd=project_dir, capture_output=True)
    subprocess.run(['git', 'config', 'user.email', 'v0[bot]@users.noreply.github.com'], check=True, cwd=project_dir, capture_output=True)
    
    # Stage and commit
    subprocess.run(['git', 'add', '-A'], check=True, cwd=project_dir, capture_output=True)
    subprocess.run(['git', 'commit', '-m', 'fix: Replace invalid Waveform icon with Activity icon from lucide-react'], check=True, cwd=project_dir)
    
    # Push
    subprocess.run(['git', 'push', 'origin', 'project-overview'], check=True, cwd=project_dir)
    
    print('\nSuccessfully deployed icon fix!')

except Exception as error:
    print(f'Error: {error}')
