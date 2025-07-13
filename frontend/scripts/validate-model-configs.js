#!/usr/bin/env node

/**
 * Script to validate that all model configurations in DragonModelManager
 * match the actual files in the public/models directory
 */

const fs = require('fs');
const path = require('path');

// Path to models directory
const modelsDir = path.join(__dirname, '../public/models');

// Model configurations from DragonModelManager (must match DEFAULT_MODELS)
const modelConfigs = {
  'seiron-animated': {
    path: '/models/seiron_animated.gltf',
    fallbackPath: '/models/seiron_animated_optimized.gltf'
  },
  'seiron-animated-optimized': {
    path: '/models/seiron_animated_optimized.gltf',
    fallbackPath: '/models/seiron_animated_lod_high.gltf'
  },
  'seiron-lod-high': {
    path: '/models/seiron_animated_lod_high.gltf',
    fallbackPath: '/models/seiron_optimized.glb'
  },
  'seiron-primary': {
    path: '/models/seiron.glb',
    fallbackPath: '/models/seiron_optimized.glb'
  },
  'seiron-optimized': {
    path: '/models/seiron_optimized.glb',
    fallbackPath: '/models/dragon_head_optimized.glb'
  },
  'dragon-head': {
    path: '/models/dragon_head.glb',
    fallbackPath: '/models/dragon_head_optimized.glb'
  },
  'dragon-head-optimized': {
    path: '/models/dragon_head_optimized.glb',
    fallbackPath: '/models/seiron_optimized.glb'
  }
};

console.log('🐉 Validating Dragon Model Configurations...\n');

// Get list of actual files in models directory
const actualFiles = fs.readdirSync(modelsDir)
  .filter(file => file.endsWith('.gltf') || file.endsWith('.glb') || file.endsWith('.bin'));

console.log('📁 Files found in /public/models:');
actualFiles.forEach(file => {
  const stats = fs.statSync(path.join(modelsDir, file));
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   - ${file} (${sizeMB} MB)`);
});
console.log('');

// Validate each model configuration
let hasErrors = false;
console.log('🔍 Validating model configurations:\n');

Object.entries(modelConfigs).forEach(([modelId, config]) => {
  console.log(`📦 ${modelId}:`);
  
  // Check primary path
  const primaryFile = config.path.replace('/models/', '');
  const primaryExists = fs.existsSync(path.join(modelsDir, primaryFile));
  
  if (primaryExists) {
    console.log(`   ✅ Primary: ${config.path}`);
  } else {
    console.log(`   ❌ Primary: ${config.path} (NOT FOUND)`);
    hasErrors = true;
  }
  
  // Check fallback path
  if (config.fallbackPath) {
    const fallbackFile = config.fallbackPath.replace('/models/', '');
    const fallbackExists = fs.existsSync(path.join(modelsDir, fallbackFile));
    
    if (fallbackExists) {
      console.log(`   ✅ Fallback: ${config.fallbackPath}`);
    } else {
      console.log(`   ❌ Fallback: ${config.fallbackPath} (NOT FOUND)`);
      hasErrors = true;
    }
  }
  
  console.log('');
});

// Check for GLTF files that reference .bin files
console.log('🔗 Checking GLTF binary dependencies:\n');
const gltfFiles = actualFiles.filter(file => file.endsWith('.gltf'));

gltfFiles.forEach(gltfFile => {
  const gltfPath = path.join(modelsDir, gltfFile);
  const gltfContent = fs.readFileSync(gltfPath, 'utf8');
  
  try {
    const gltfData = JSON.parse(gltfContent);
    if (gltfData.buffers) {
      console.log(`📄 ${gltfFile}:`);
      gltfData.buffers.forEach((buffer, index) => {
        if (buffer.uri) {
          const binPath = path.join(modelsDir, buffer.uri);
          const binExists = fs.existsSync(binPath);
          if (binExists) {
            const stats = fs.statSync(binPath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`   ✅ Binary: ${buffer.uri} (${sizeMB} MB)`);
          } else {
            console.log(`   ❌ Binary: ${buffer.uri} (NOT FOUND)`);
            hasErrors = true;
          }
        }
      });
      console.log('');
    }
  } catch (e) {
    console.log(`   ⚠️  Could not parse ${gltfFile}: ${e.message}\n`);
  }
});

// Summary
console.log('📊 Summary:');
if (hasErrors) {
  console.log('   ❌ Validation FAILED - Some model files are missing');
  process.exit(1);
} else {
  console.log('   ✅ All model configurations are valid!');
  
  // Additional recommendations
  console.log('\n💡 Recommendations:');
  console.log('   1. Consider implementing model preloading for better performance');
  console.log('   2. Monitor memory usage, especially for animated models');
  console.log('   3. Test fallback chains in production environment');
  console.log('   4. Enable model validation on app startup');
}
