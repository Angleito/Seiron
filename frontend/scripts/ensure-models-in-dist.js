#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Ensure models are copied to dist after build
async function ensureModelsInDist() {
  const publicModelsDir = path.join(__dirname, '../public/models');
  const distDir = path.join(__dirname, '../dist');
  const distModelsDir = path.join(distDir, 'models');

  console.log('📦 Ensuring models are in dist directory...');

  // Check if dist exists
  if (!fs.existsSync(distDir)) {
    console.error('❌ Dist directory does not exist. Run build first.');
    process.exit(1);
  }

  // Create models directory in dist if it doesn't exist
  if (!fs.existsSync(distModelsDir)) {
    fs.mkdirSync(distModelsDir, { recursive: true });
    console.log('✅ Created models directory in dist');
  }

  // Copy all GLB, GLTF, and BIN files
  function copyModels(sourceDir, targetDir) {
    const files = fs.readdirSync(sourceDir);
    
    files.forEach(file => {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      const stat = fs.statSync(sourcePath);
      
      if (stat.isDirectory()) {
        // Recursively copy subdirectories
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }
        copyModels(sourcePath, targetPath);
      } else if (file.match(/\.(glb|gltf|bin|png|jpg|jpeg)$/i)) {
        // Copy model and texture files
        try {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`✅ Copied ${file} (${(stat.size / 1024).toFixed(1)}KB)`);
        } catch (error) {
          console.error(`❌ Failed to copy ${file}:`, error.message);
        }
      }
    });
  }

  // Copy all models
  console.log('\n📋 Copying models to dist...');
  copyModels(publicModelsDir, distModelsDir);

  // Verify critical models
  const criticalModels = [
    'seiron_head.glb',
    'seiron.glb',
    'dragon_head.glb'
  ];

  console.log('\n🔍 Verifying critical models in dist...');
  let allPresent = true;
  
  criticalModels.forEach(model => {
    const modelPath = path.join(distModelsDir, model);
    if (fs.existsSync(modelPath)) {
      const stat = fs.statSync(modelPath);
      console.log(`✅ ${model} (${(stat.size / 1024).toFixed(1)}KB)`);
    } else {
      console.error(`❌ ${model} not found in dist`);
      allPresent = false;
    }
  });

  if (allPresent) {
    console.log('\n✅ All critical models are present in dist directory');
  } else {
    console.error('\n❌ Some critical models are missing from dist');
    process.exit(1);
  }
}

// Run the script
ensureModelsInDist().catch(error => {
  console.error('❌ Error ensuring models in dist:', error);
  process.exit(1);
});