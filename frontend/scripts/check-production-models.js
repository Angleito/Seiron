#!/usr/bin/env node

/**
 * Script to check model availability in production
 * Can be run locally or in CI/CD to verify models are properly deployed
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Production URL (update this with your actual production URL)
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://your-app.vercel.app';

// Models to check
const MODELS_TO_CHECK = [
  // Critical models (must work)
  { path: '/models/seiron.glb', critical: true },
  { path: '/models/seiron_animated.gltf', critical: true },
  { path: '/models/seiron_animated.bin', critical: true },
  
  // Important models
  { path: '/models/seiron_animated_lod_high.gltf', critical: false },
  
  // Optimized models (may have issues)
  { path: '/models/seiron.glb', critical: false },
  { path: '/models/seiron_animated.gltf', critical: false },
  
  // Textures
  { path: '/models/textures/Material.002_baseColor.png', critical: true },
  { path: '/models/textures/Material.002_normal.png', critical: false },
  { path: '/models/textures/Material.002_metallicRoughness.png', critical: false },
  { path: '/models/textures/Material.002_emissive.png', critical: false },
];

async function checkModel(baseUrl, model) {
  return new Promise((resolve) => {
    const url = new URL(model.path, baseUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      method: 'HEAD',
      timeout: 10000,
    };
    
    const req = protocol.request(url, options, (res) => {
      const result = {
        ...model,
        status: res.statusCode,
        headers: res.headers,
        success: res.statusCode === 200,
        size: res.headers['content-length'] ? parseInt(res.headers['content-length']) : null,
        contentType: res.headers['content-type'],
      };
      
      // Check if file is suspiciously small
      if (result.success && result.size && result.size < 1000) {
        result.warning = 'File is suspiciously small';
        result.success = false;
      }
      
      resolve(result);
    });
    
    req.on('error', (error) => {
      resolve({
        ...model,
        status: 0,
        success: false,
        error: error.message,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        ...model,
        status: 0,
        success: false,
        error: 'Request timeout',
      });
    });
    
    req.end();
  });
}

async function checkAllModels(baseUrl) {
  console.log(`🔍 Checking model availability at: ${baseUrl}\n`);
  
  const results = await Promise.all(
    MODELS_TO_CHECK.map(model => checkModel(baseUrl, model))
  );
  
  // Separate results by status
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const criticalFailures = failed.filter(r => r.critical);
  
  // Display results
  console.log('✅ Successfully loaded models:');
  successful.forEach(result => {
    const sizeKB = result.size ? `${(result.size / 1024).toFixed(1)} KB` : 'unknown size';
    console.log(`   ${result.path} (${sizeKB})`);
  });
  
  if (failed.length > 0) {
    console.log('\n❌ Failed to load models:');
    failed.forEach(result => {
      const reason = result.error || `HTTP ${result.status}`;
      const critical = result.critical ? ' [CRITICAL]' : '';
      console.log(`   ${result.path} - ${reason}${critical}`);
      if (result.warning) {
        console.log(`     ⚠️  ${result.warning}`);
      }
    });
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total models checked: ${results.length}`);
  console.log(`   Successful: ${successful.length}`);
  console.log(`   Failed: ${failed.length}`);
  console.log(`   Critical failures: ${criticalFailures.length}`);
  
  // Recommendations
  if (criticalFailures.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES DETECTED:');
    console.log('   The following critical models are missing:');
    criticalFailures.forEach(result => {
      console.log(`   - ${result.path}`);
    });
    console.log('\n   Recommended actions:');
    console.log('   1. Verify models are in public/models directory');
    console.log('   2. Check vercel.json buildCommand includes: cp -r public/models dist/');
    console.log('   3. Ensure no .vercelignore is excluding models');
    console.log('   4. Check Vercel deployment logs for errors');
    console.log('   5. Verify file sizes are not exceeding limits');
  }
  
  // Exit with error if critical failures
  if (criticalFailures.length > 0) {
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const url = args[0] || PRODUCTION_URL;

if (url === 'https://your-app.vercel.app') {
  console.error('❌ Please provide a production URL as argument or set PRODUCTION_URL environment variable');
  console.log('\nUsage:');
  console.log('  node check-production-models.js https://your-app.vercel.app');
  console.log('  PRODUCTION_URL=https://your-app.vercel.app node check-production-models.js');
  process.exit(1);
}

// Run the check
checkAllModels(url).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});