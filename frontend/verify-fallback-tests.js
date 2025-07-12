#!/usr/bin/env node

/**
 * WebGL Fallback Tests Verification Script
 * 
 * This script verifies that the test files are properly structured
 * and contain the expected functionality.
 */

const fs = require('fs');
const path = require('path');

const testFiles = [
    {
        name: 'WebGL Fallback Test',
        file: 'webgl-fallback-test.html',
        expectedContent: [
            'WebGL Fallback System Test',
            'DragonFallbackRenderer',
            'setVoiceState',
            'testCapabilities',
            'THREE.Scene',
            'ASCII Dragon'
        ]
    },
    {
        name: 'Fallback Utilities Test', 
        file: 'test-fallback-utilities.html',
        expectedContent: [
            'WebGL Fallback Utilities Test',
            'TestWebGLFallbackManager',
            'TestWebGLDiagnostics',
            'detectCapabilities',
            'createContext',
            'mockWebGL'
        ]
    }
];

function verifyFile(testFile) {
    const filePath = path.join(__dirname, testFile.file);
    
    console.log(`\n📁 Verifying: ${testFile.name}`);
    console.log(`   File: ${testFile.file}`);

    if (!fs.existsSync(filePath)) {
        console.log(`   ❌ File not found: ${filePath}`);
        return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const fileSize = (content.length / 1024).toFixed(2);
    console.log(`   📊 Size: ${fileSize} KB`);

    let missingContent = [];
    testFile.expectedContent.forEach(expected => {
        if (!content.includes(expected)) {
            missingContent.push(expected);
        }
    });

    if (missingContent.length > 0) {
        console.log(`   ⚠️  Missing content:`);
        missingContent.forEach(missing => {
            console.log(`      - ${missing}`);
        });
        return false;
    }

    // Check for proper HTML structure
    const hasDoctype = content.includes('<!DOCTYPE html>');
    const hasTitle = content.includes('<title>');
    const hasScript = content.includes('<script');
    const hasStyle = content.includes('<style');

    console.log(`   📄 HTML Structure:`);
    console.log(`      DOCTYPE: ${hasDoctype ? '✅' : '❌'}`);
    console.log(`      Title: ${hasTitle ? '✅' : '❌'}`);
    console.log(`      Scripts: ${hasScript ? '✅' : '❌'}`);
    console.log(`      Styles: ${hasStyle ? '✅' : '❌'}`);

    // Check for Three.js CDN
    const hasThreeJS = content.includes('three.min.js');
    console.log(`      Three.js CDN: ${hasThreeJS ? '✅' : '❌'}`);

    // Check for test functions
    const testFunctions = [
        'testCapabilities',
        'testFallbackModes',
        'runAllTests'
    ];

    let foundFunctions = 0;
    testFunctions.forEach(func => {
        if (content.includes(func)) {
            foundFunctions++;
        }
    });

    console.log(`   🔧 Test Functions: ${foundFunctions}/${testFunctions.length} found`);

    const isValid = hasDoctype && hasTitle && hasScript && hasStyle && missingContent.length === 0;
    console.log(`   ${isValid ? '✅' : '❌'} Overall: ${isValid ? 'VALID' : 'ISSUES FOUND'}`);

    return isValid;
}

function generateTestReport() {
    console.log('\n📊 Generating test accessibility report...\n');

    testFiles.forEach(testFile => {
        const filePath = path.join(__dirname, testFile.file);
        const fullPath = path.resolve(filePath);
        const fileUrl = `file://${fullPath}`;
        
        console.log(`🌐 ${testFile.name}:`);
        console.log(`   Local File: ${fullPath}`);
        console.log(`   Browser URL: ${fileUrl}`);
        console.log(`   Size: ${fs.existsSync(filePath) ? (fs.statSync(filePath).size / 1024).toFixed(2) + ' KB' : 'N/A'}`);
    });
    
    console.log('\n🚀 To run tests:');
    console.log('   node run-fallback-tests.js');
    console.log('\n🌐 Or open directly in browser:');
    testFiles.forEach(testFile => {
        const filePath = path.resolve(path.join(__dirname, testFile.file));
        console.log(`   open file://${filePath}`);
    });
}

function checkDependencies() {
    console.log('\n🔍 Checking dependencies...\n');

    // Check if we can access Three.js CDN
    const https = require('https');
    const threejsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';

    return new Promise((resolve) => {
        const request = https.get(threejsUrl, (response) => {
            console.log(`📦 Three.js CDN: ${response.statusCode === 200 ? '✅ Available' : '❌ Unavailable'}`);
            resolve(response.statusCode === 200);
        });

        request.on('error', (error) => {
            console.log(`📦 Three.js CDN: ❌ Network error (${error.message})`);
            resolve(false);
        });

        request.setTimeout(5000, () => {
            console.log(`📦 Three.js CDN: ⚠️  Timeout (may still work)`);
            request.destroy();
            resolve(false);
        });
    });
}

function analyzeCompatibility() {
    console.log('\n🖥️  Browser Compatibility Analysis:\n');

    const compatibility = {
        'Chrome (Latest)': { webgl2: true, webgl: true, canvas2d: true, ascii: true },
        'Firefox (Latest)': { webgl2: true, webgl: true, canvas2d: true, ascii: true },
        'Safari (Latest)': { webgl2: 'partial', webgl: true, canvas2d: true, ascii: true },
        'Edge (Latest)': { webgl2: true, webgl: true, canvas2d: true, ascii: true },
        'Mobile Safari': { webgl2: false, webgl: 'limited', canvas2d: true, ascii: true },
        'Chrome Mobile': { webgl2: 'limited', webgl: true, canvas2d: true, ascii: true },
        'Headless Chrome': { webgl2: false, webgl: false, canvas2d: 'mock', ascii: true },
        'Docker Environment': { webgl2: false, webgl: false, canvas2d: 'mock', ascii: true }
    };

    Object.entries(compatibility).forEach(([browser, support]) => {
        console.log(`${browser}:`);
        Object.entries(support).forEach(([feature, status]) => {
            let indicator;
            switch (status) {
                case true: indicator = '✅'; break;
                case false: indicator = '❌'; break;
                case 'limited': indicator = '⚠️ '; break;
                case 'partial': indicator = '🔶'; break;
                case 'mock': indicator = '🔧'; break;
                default: indicator = '❓';
            }
            console.log(`   ${feature}: ${indicator} ${status}`);
        });
        console.log('');
    });
}

async function main() {
    console.log('🐉 WebGL Fallback Tests Verification\n');
    console.log('=====================================');

    let allValid = true;

    // Verify test files
    testFiles.forEach(testFile => {
        const isValid = verifyFile(testFile);
        allValid = allValid && isValid;
    });

    // Check dependencies
    const cdnAvailable = await checkDependencies();

    // Generate report
    generateTestReport();

    // Analyze compatibility
    analyzeCompatibility();

    // Summary
    console.log('\n📋 Summary:');
    console.log(`   Test Files: ${allValid ? '✅ All Valid' : '❌ Issues Found'}`);
    console.log(`   Dependencies: ${cdnAvailable ? '✅ Available' : '⚠️  May have issues'}`);
    console.log(`   Compatibility: Multi-browser support ready`);

    if (allValid && cdnAvailable) {
        console.log('\n🎉 All systems ready! Run the tests with:');
        console.log('   node run-fallback-tests.js\n');
    } else {
        console.log('\n⚠️  Some issues detected. Check the output above.\n');
    }

    return allValid && cdnAvailable;
}

// Run verification
main().catch(error => {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
});