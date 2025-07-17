#!/usr/bin/env node

/**
 * Script to diagnose and potentially fix corrupted GLTF files
 * Specifically addresses the "Invalid typed array length" error
 */

const fs = require('fs');
const path = require('path');

const modelPath = path.join(__dirname, '../public/models/seiron_animated.gltf');
const binPath = path.join(__dirname, '../public/models/seiron_animated.bin');

console.log('🔍 Diagnosing GLTF file corruption...\n');

// Read and parse GLTF file
let gltfData;
try {
  const gltfContent = fs.readFileSync(modelPath, 'utf8');
  gltfData = JSON.parse(gltfContent);
  console.log('✅ GLTF file parsed successfully');
} catch (error) {
  console.error('❌ Failed to parse GLTF file:', error.message);
  process.exit(1);
}

// Check buffer definition
const buffer = gltfData.buffers?.[0];
if (!buffer) {
  console.error('❌ No buffer definition found in GLTF file');
  process.exit(1);
}

console.log(`\n📊 Buffer Information:`);
console.log(`  Expected size: ${buffer.byteLength.toLocaleString()} bytes`);
console.log(`  URI: ${buffer.uri}`);

// Check actual binary file
let actualSize = 0;
try {
  const stats = fs.statSync(binPath);
  actualSize = stats.size;
  console.log(`  Actual size: ${actualSize.toLocaleString()} bytes`);
} catch (error) {
  console.error('❌ Binary file not found:', binPath);
  process.exit(1);
}

// Compare sizes
const sizeDiff = buffer.byteLength - actualSize;
console.log(`  Size difference: ${sizeDiff.toLocaleString()} bytes`);

if (sizeDiff > 0) {
  console.error(`\n❌ CORRUPTED: Binary file is ${sizeDiff.toLocaleString()} bytes smaller than expected!`);
  console.log('\n🔧 This typically happens when:');
  console.log('  1. The binary file was truncated during upload/download');
  console.log('  2. The binary file was corrupted during git operations');
  console.log('  3. The GLTF was exported incorrectly');
  
  console.log('\n💡 Recommended fixes:');
  console.log('  1. Re-download/re-export the original model files');
  console.log('  2. Use a different model format (GLB is self-contained)');
  console.log('  3. Use one of the working models: seiron.glb, seiron_optimized.glb');
  
  // Analyze buffer views to find the problematic one
  console.log('\n🔍 Analyzing buffer views for the error "Invalid typed array length: 773"...');
  
  let foundProblematicView = false;
  gltfData.bufferViews?.forEach((view, index) => {
    const viewEnd = (view.byteOffset || 0) + view.byteLength;
    if (viewEnd > actualSize) {
      console.log(`\n⚠️  BufferView ${index} exceeds actual file size:`);
      console.log(`    Offset: ${view.byteOffset || 0}`);
      console.log(`    Length: ${view.byteLength}`);
      console.log(`    End position: ${viewEnd}`);
      console.log(`    Exceeds by: ${viewEnd - actualSize} bytes`);
      
      // Check if any accessor uses this buffer view with count 773
      gltfData.accessors?.forEach((accessor, accIndex) => {
        if (accessor.bufferView === index && accessor.count === 773) {
          console.log(`    ⚠️  Accessor ${accIndex} uses this view with count 773!`);
          foundProblematicView = true;
        }
      });
    }
  });
  
  if (foundProblematicView) {
    console.log('\n✅ Found the source of "Invalid typed array length: 773" error!');
  }
  
} else if (sizeDiff < 0) {
  console.log('\n⚠️  Binary file is larger than expected (unusual but not necessarily corrupted)');
} else {
  console.log('\n✅ File sizes match!');
}

// Additional validation
console.log('\n🔍 Additional validation:');

// Check textures
const images = gltfData.images || [];
console.log(`  Images: ${images.length}`);
images.forEach((img, i) => {
  if (img.uri && !img.uri.startsWith('data:')) {
    const imgPath = path.join(path.dirname(modelPath), img.uri);
    try {
      fs.accessSync(imgPath);
      console.log(`    ✅ Image ${i}: ${img.uri}`);
    } catch {
      console.log(`    ❌ Image ${i}: ${img.uri} (missing)`);
    }
  }
});

// Summary
console.log('\n📝 Summary:');
if (sizeDiff > 0) {
  console.log('  The GLTF file is corrupted due to incomplete binary data.');
  console.log('  The application has been updated to use working GLB models instead.');
  console.log('  To fix this model, you need to obtain the complete binary file.');
} else {
  console.log('  The GLTF file structure appears valid.');
}