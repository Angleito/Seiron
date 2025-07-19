#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying THREE.js bundling...\n');

// Check if node_modules has THREE.js installed
const threePackagePath = path.join(__dirname, '../node_modules/three/package.json');
if (!fs.existsSync(threePackagePath)) {
  console.error('❌ THREE.js is not installed in node_modules');
  process.exit(1);
}

const threePackage = JSON.parse(fs.readFileSync(threePackagePath, 'utf8'));
console.log(`✅ THREE.js version ${threePackage.version} is installed`);

// Check if THREE.js exports are properly configured
const threeMainPath = path.join(__dirname, '../node_modules/three/build/three.module.js');
if (!fs.existsSync(threeMainPath)) {
  console.error('❌ THREE.js ES module not found');
  process.exit(1);
}

console.log('✅ THREE.js ES module found');

// Check React Three Fiber
const r3fPackagePath = path.join(__dirname, '../node_modules/@react-three/fiber/package.json');
if (!fs.existsSync(r3fPackagePath)) {
  console.error('❌ @react-three/fiber is not installed');
  process.exit(1);
}

const r3fPackage = JSON.parse(fs.readFileSync(r3fPackagePath, 'utf8'));
console.log(`✅ @react-three/fiber version ${r3fPackage.version} is installed`);

// Check three-stdlib
const threeStdlibPath = path.join(__dirname, '../node_modules/three-stdlib/package.json');
if (!fs.existsSync(threeStdlibPath)) {
  console.error('❌ three-stdlib is not installed');
  process.exit(1);
}

const threeStdlibPackage = JSON.parse(fs.readFileSync(threeStdlibPath, 'utf8'));
console.log(`✅ three-stdlib version ${threeStdlibPackage.version} is installed`);

// Check for potential version conflicts
const expectedThreeVersion = '0.170.0';
if (!threePackage.version.startsWith(expectedThreeVersion.split('.')[0])) {
  console.warn(`⚠️  THREE.js version mismatch. Expected: ${expectedThreeVersion}, Found: ${threePackage.version}`);
}

console.log('\n✅ All THREE.js dependencies are properly installed');
console.log('\n💡 To test bundling, run: npm run build');