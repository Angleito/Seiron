#!/usr/bin/env node

/**
 * Script to fix model deployment issues
 * Ensures only working models are referenced in the codebase
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Models that have deployment issues
const PROBLEMATIC_MODELS = [
  'seiron_animated_optimized.gltf',
  'seiron_optimized.glb'
];

// Safe model replacements
const MODEL_REPLACEMENTS = {
  '/models/seiron_animated_optimized.gltf': '/models/seiron_animated.gltf',
  '/models/seiron_optimized.glb': '/models/seiron.glb',
  'seiron_animated_optimized.gltf': 'seiron_animated.gltf',
  'seiron_optimized.glb': 'seiron.glb'
};

async function findFilesWithExtension(dir, extensions) {
  const files = [];
  
  async function walk(currentDir) {
    const items = await readdir(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (!item.startsWith('.') && item !== 'node_modules' && item !== 'dist' && item !== 'build') {
          await walk(fullPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  await walk(dir);
  return files;
}

async function fixModelReferences(filePath) {
  let content = await readFile(filePath, 'utf8');
  let modified = false;
  
  // Replace problematic model references
  for (const [oldModel, newModel] of Object.entries(MODEL_REPLACEMENTS)) {
    if (content.includes(oldModel)) {
      content = content.replaceAll(oldModel, newModel);
      modified = true;
      console.log(`  ✏️  Replaced ${oldModel} → ${newModel}`);
    }
  }
  
  if (modified) {
    await writeFile(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

async function main() {
  console.log('🔧 Fixing model deployment issues...\n');
  
  const projectRoot = path.join(__dirname, '..');
  
  // Find all TypeScript and JavaScript files
  console.log('📂 Scanning for files to fix...');
  const files = await findFilesWithExtension(projectRoot, ['.ts', '.tsx', '.js', '.jsx']);
  
  console.log(`📋 Found ${files.length} files to check\n`);
  
  let fixedCount = 0;
  
  for (const file of files) {
    const relativePath = path.relative(projectRoot, file);
    
    // Skip this script itself
    if (file.includes('fix-model-deployment.js')) continue;
    
    const wasFixed = await fixModelReferences(file);
    
    if (wasFixed) {
      console.log(`✅ Fixed: ${relativePath}`);
      fixedCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Files checked: ${files.length}`);
  console.log(`   Files fixed: ${fixedCount}`);
  
  if (fixedCount > 0) {
    console.log('\n💡 Next steps:');
    console.log('   1. Run `npm run verify:models` to verify models');
    console.log('   2. Run `npm run build` to create production build');
    console.log('   3. Deploy to Vercel');
    console.log('   4. Run `npm run check:production-models -- https://your-app.vercel.app` to verify deployment');
  } else {
    console.log('\n✨ No problematic model references found!');
  }
  
  // Update vercel.json to ensure models are copied
  console.log('\n🔍 Checking vercel.json...');
  const vercelJsonPath = path.join(projectRoot, 'vercel.json');
  
  try {
    const vercelConfig = JSON.parse(await readFile(vercelJsonPath, 'utf8'));
    
    if (!vercelConfig.buildCommand.includes('cp -r public/models dist/')) {
      console.log('⚠️  vercel.json buildCommand needs to include model copying');
      console.log('   Current: ' + vercelConfig.buildCommand);
      console.log('   Should include: cp -r public/models dist/');
    } else {
      console.log('✅ vercel.json properly configured to copy models');
    }
  } catch (error) {
    console.warn('⚠️  Could not check vercel.json:', error.message);
  }
  
  console.log('\n✅ Model deployment fix complete!');
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});