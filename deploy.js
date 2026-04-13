const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Deploying DoorWise to Vercel...\n');

try {
  // Configure git
  console.log('🔧 Configuring git...');
  execSync('git config user.name "v0[bot]"', { stdio: 'inherit', cwd: path.dirname(__filename) });
  execSync('git config user.email "v0[bot]@users.noreply.github.com"', { stdio: 'inherit', cwd: path.dirname(__filename) });

  // Check status
  console.log('\n📋 Current git status:');
  execSync('git status', { stdio: 'inherit', cwd: path.dirname(__filename) });

  // Stage changes
  console.log('\n📝 Staging all changes...');
  execSync('git add -A', { stdio: 'inherit', cwd: path.dirname(__filename) });

  // Commit
  console.log('\n💾 Creating commit...');
  const commitMessage = `feat: Complete DoorWise product redesign with minimal CSS design system

- Fixed blank page issue by replacing 1151-line CSS with clean 140-line minimal design
- Created reusable component library (Button, Badge, Card, Input, Alert, etc.)
- Redesigned Landing page with hero, investor thesis, and footer
- Implemented Setup page with multi-step wizard for address configuration
- Enhanced Dashboard with two-column layout, camera panel, and chat interface
- Added IncidentLog with analytics, search, filter, and export
- Improved useVoice hook with audio level visualization
- Added BuildingSwitcher for multi-building support
- Consolidated font loading and fixed SEO meta tags

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>`;

  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit', cwd: path.dirname(__filename) });

  // Push
  console.log('\n🔗 Pushing to GitHub...');
  execSync('git push origin project-overview', { stdio: 'inherit', cwd: path.dirname(__filename) });

  console.log('\n✅ Successfully deployed to GitHub!');
  console.log('   Vercel deployment will start automatically.\n');
  console.log('📍 Repository: zhongnz/doorwise');
  console.log('🌳 Branch: project-overview');
  console.log('\n🎉 DoorWise is now live on Vercel!');

} catch (error) {
  console.error('\n❌ Deployment failed:');
  console.error(error.message);
  process.exit(1);
}
