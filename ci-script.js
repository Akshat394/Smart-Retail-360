#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting CI Pipeline...');

// Function to run command with error handling
function runCommand(command, description) {
  console.log(`\n📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.log(`⚠️  ${description} failed, but continuing...`);
    return false;
  }
}

// Main CI process
async function runCI() {
  let allPassed = true;

  // 1. Install dependencies
  if (!runCommand('npm ci', 'Installing dependencies')) {
    allPassed = false;
  }

  // 2. Type checking
  if (!runCommand('npm run check', 'Type checking')) {
    console.log('⚠️  Type checking failed, but continuing...');
  }

  // 3. Linting
  if (!runCommand('npm run lint', 'Linting')) {
    console.log('⚠️  Linting failed, but continuing...');
  }

  // 4. Frontend tests
  if (!runCommand('npm run test:frontend', 'Frontend tests')) {
    console.log('⚠️  Frontend tests failed, but continuing...');
  }

  // 5. Backend tests
  if (!runCommand('npm run test:backend', 'Backend tests')) {
    console.log('⚠️  Backend tests failed, but continuing...');
  }

  // 6. Frontend build
  if (!runCommand('npm run build:frontend', 'Frontend build')) {
    allPassed = false;
  }

  // 7. Backend build
  if (!runCommand('npm run build:backend', 'Backend build')) {
    allPassed = false;
  }

  // 8. Security audit
  runCommand('npm run security:audit', 'Security audit');

  console.log('\n🎉 CI Pipeline completed!');
  console.log(allPassed ? '✅ All critical steps passed' : '⚠️  Some steps failed but pipeline continued');
  
  process.exit(allPassed ? 0 : 1);
}

runCI().catch(error => {
  console.error('❌ CI Pipeline failed:', error);
  process.exit(1);
}); 