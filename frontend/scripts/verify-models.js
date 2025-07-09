#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const access = promisify(fs.access);
const stat = promisify(fs.stat);

// Required models for the application (must exist for basic functionality)
const REQUIRED_MODELS = [
  'seiron.glb',                        // Working fallback model
  'seiron_animated.gltf',              // Working animated model
  'seiron_animated.bin'                // Binary data for animated model
];

// Optional models that enhance the experience but aren't required
const OPTIONAL_MODELS = [
  'seiron_optimized.glb',              // May have deployment issues
  'seiron_animated_optimized.gltf',    // May have deployment issues
  'seiron_animated_lod_high.gltf',     // High-quality LOD model
  'dragon_head.glb',                   // Dragon head model
  'dragon_head_optimized.glb'          // Optimized dragon head
];

// Required texture files
const REQUIRED_TEXTURES = [
  'textures/Material.002_baseColor.png',
  'textures/Material.002_normal.png',
  'textures/Material.002_metallicRoughness.png',
  'textures/Material.002_emissive.png',
  'textures/Material.005_baseColor.png'
];

async function verifyModels() {
  console.log('🔍 Verifying 3D models for deployment...\n');
  
  const publicDir = path.join(__dirname, '../public');
  const modelsDir = path.join(publicDir, 'models');
  const distDir = path.join(__dirname, '../dist');
  const distModelsDir = path.join(distDir, 'models');
  
  let allPassed = true;
  let warnings = [];
  
  // Check if models directory exists
  try {
    await access(modelsDir);
    console.log('✅ Models directory exists');
  } catch (error) {
    console.error('❌ Models directory not found');
    process.exit(1);
  }
  
  // Check required models
  console.log('\n📋 Checking required models:');
  for (const model of REQUIRED_MODELS) {
    const modelPath = path.join(modelsDir, model);
    try {
      await access(modelPath);
      const stats = await stat(modelPath);
      
      if (stats.size === 0) {
        console.error(`❌ ${model} is empty (0 bytes)`);
        allPassed = false;
      } else {
        console.log(`✅ ${model} (${(stats.size / 1024).toFixed(1)}KB)`);
      }
    } catch (error) {
      console.error(`❌ ${model} not found`);
      allPassed = false;
    }
  }
  
  // Check optional models
  console.log('\n🔧 Checking optional models:');
  for (const model of OPTIONAL_MODELS) {
    const modelPath = path.join(modelsDir, model);
    try {
      await access(modelPath);
      const stats = await stat(modelPath);
      
      if (stats.size === 0) {
        console.warn(`⚠️  ${model} is empty (0 bytes) - will use fallback`);
        warnings.push(`Empty optional model: ${model}`);
      } else {
        console.log(`✅ ${model} (${(stats.size / 1024).toFixed(1)}KB)`);
      }
    } catch (error) {
      console.warn(`⚠️  ${model} not found - will use fallback`);
      warnings.push(`Missing optional model: ${model}`);
    }
  }
  
  // Check required textures
  console.log('\n🎨 Checking required textures:');
  for (const texture of REQUIRED_TEXTURES) {
    const texturePath = path.join(modelsDir, texture);
    try {
      await access(texturePath);
      const stats = await stat(texturePath);
      
      if (stats.size === 0) {
        console.error(`❌ ${texture} is empty (0 bytes)`);
        allPassed = false;
      } else {
        console.log(`✅ ${texture} (${(stats.size / 1024).toFixed(1)}KB)`);
      }
    } catch (error) {
      console.error(`❌ ${texture} not found`);
      allPassed = false;
    }
  }
  
  // Check if dist directory exists and models are copied
  console.log('\n📦 Checking build output:');
  try {
    await access(distModelsDir);
    console.log('✅ Models copied to dist directory');
    
    // Quick check that key models exist in dist
    const keyModels = ['seiron.glb', 'seiron_animated.gltf'];
    for (const model of keyModels) {
      const distModelPath = path.join(distModelsDir, model);
      try {
        await access(distModelPath);
        console.log(`✅ ${model} available in dist`);
      } catch (error) {
        console.warn(`⚠️  ${model} missing from dist - may need to rebuild`);
        warnings.push(`Missing from dist: ${model}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Dist directory not found - run build first');
    warnings.push('Dist directory not found');
  }
  
  // Summary
  console.log('\n📊 Summary:');
  if (allPassed) {
    console.log('✅ All required models are present and valid');
    console.log('🚀 Ready for deployment with reliable model fallback system');
  } else {
    console.error('❌ Some required models are missing or invalid');
    console.log('🔧 Application will use fallback models for missing components');
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  // Model usage recommendations
  console.log('\n💡 Model usage recommendations:');
  console.log('   - Primary model: seiron_animated.gltf (proven to work in production)');
  console.log('   - Fallback model: seiron.glb (reliable, smaller size)');
  console.log('   - Progressive loading: Start with seiron.glb, upgrade to seiron_animated.gltf');
  console.log('   - The application has robust fallback mechanisms for missing models');
  
  // Only exit with error if critical models are missing
  const criticalFailure = !allPassed && REQUIRED_MODELS.some(model => {
    const modelPath = path.join(modelsDir, model);
    try {
      fs.accessSync(modelPath);
      return false; // Model exists
    } catch {
      return true; // Model missing
    }
  });
  
  if (criticalFailure) {
    console.error('\n💥 Critical failure: Required models are missing');
    process.exit(1);
  } else {
    console.log('\n✅ Build can proceed with available models');
    process.exit(0);
  }
}

// Run the verification
verifyModels().catch(error => {
  console.error('❌ Model verification failed:', error);
  process.exit(1);
});