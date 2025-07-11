#!/usr/bin/env node

/**
 * WalletConnect Configuration Test
 * 
 * This script validates the WalletConnect configuration
 * and tests various scenarios
 */

const fs = require('fs')
const path = require('path')

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }
  
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match) {
      env[match[1]] = match[2]
    }
  })
  
  return env
}

function validateProjectId(projectId) {
  if (!projectId) {
    return { valid: false, reason: 'Project ID is empty' }
  }
  
  if (projectId.includes('your_') || projectId.includes('_here')) {
    return { valid: false, reason: 'Project ID contains placeholder text' }
  }
  
  if (projectId.trim().length === 0) {
    return { valid: false, reason: 'Project ID is empty after trimming' }
  }
  
  if (!/^[a-zA-Z0-9-_]+$/.test(projectId)) {
    return { valid: false, reason: 'Project ID contains invalid characters' }
  }
  
  return { valid: true, reason: 'Valid project ID' }
}

function testWalletConnectConfig() {
  log('🐉 Seiron WalletConnect Configuration Test', 'cyan')
  log('='.repeat(50), 'dim')
  log('')
  
  const envFiles = [
    '.env',
    '.env.local',
    '.env.example'
  ]
  
  const projectRoot = path.join(__dirname, '..')
  let allConfigs = {}
  
  log('📁 Checking environment files:', 'blue')
  
  envFiles.forEach(file => {
    const filePath = path.join(projectRoot, file)
    const exists = fs.existsSync(filePath)
    
    if (exists) {
      const env = readEnvFile(filePath)
      allConfigs[file] = env
      log(`  ✅ ${file} - Found`, 'green')
    } else {
      log(`  ❌ ${file} - Not found`, 'red')
    }
  })
  
  log('')
  log('🔍 Validating WalletConnect configuration:', 'blue')
  
  // Check each environment file
  Object.entries(allConfigs).forEach(([file, config]) => {
    const projectId = config.VITE_WALLETCONNECT_PROJECT_ID
    const validation = validateProjectId(projectId)
    
    log(`  📄 ${file}:`, 'dim')
    log(`    Project ID: ${projectId || '(empty)'}`, 'dim')
    
    if (validation.valid) {
      log(`    ✅ Valid - ${validation.reason}`, 'green')
    } else {
      log(`    ❌ Invalid - ${validation.reason}`, 'red')
    }
    log('')
  })
  
  // Overall assessment
  log('📊 Overall Assessment:', 'blue')
  
  const activeConfig = allConfigs['.env.local'] || allConfigs['.env'] || {}
  const activeProjectId = activeConfig.VITE_WALLETCONNECT_PROJECT_ID
  const activeValidation = validateProjectId(activeProjectId)
  
  if (activeValidation.valid) {
    log('  ✅ WalletConnect is properly configured', 'green')
    log('  🎉 Your app should support WalletConnect connections', 'green')
  } else {
    log('  ⚠️  WalletConnect is not configured', 'yellow')
    log('  📝 The app will work without WalletConnect, but with limited wallet support', 'yellow')
  }
  
  log('')
  log('🔧 Configuration recommendations:', 'blue')
  
  if (!activeValidation.valid) {
    log('  1. Run: npm run setup:walletconnect', 'cyan')
    log('  2. Or manually set VITE_WALLETCONNECT_PROJECT_ID in .env', 'cyan')
    log('  3. Get Project ID from: https://cloud.walletconnect.com/', 'cyan')
  } else {
    log('  ✅ Configuration looks good!', 'green')
    log('  🚀 You can now test wallet connections in your app', 'green')
  }
  
  log('')
  log('📋 Supported wallets on Sei Network:', 'blue')
  log('  ✅ MetaMask (Recommended)', 'green')
  log('  ✅ WalletConnect compatible wallets', 'green')
  log('  ✅ Browser-injected wallets', 'green')
  log('  ❌ Coinbase Smart Wallet (Not supported on Sei Network)', 'red')
  
  log('')
  log('🔍 For more detailed testing, run your app and check the browser console', 'dim')
  log('   Look for "WalletConnect configuration" logs', 'dim')
  
  return activeValidation.valid
}

// Run the test
try {
  const isValid = testWalletConnectConfig()
  process.exit(isValid ? 0 : 1)
} catch (error) {
  log('❌ Error running WalletConnect configuration test:', 'red')
  log(error.message, 'red')
  process.exit(1)
}