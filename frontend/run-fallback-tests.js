#!/usr/bin/env node

/**
 * WebGL Fallback System Test Runner
 * 
 * This script opens the standalone test pages in your default browser
 * to test the WebGL fallback system in isolation from React Router.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const testPages = [
    {
        name: 'WebGL Fallback System Test',
        file: 'webgl-fallback-test.html',
        description: 'Tests dragon renderers and fallback modes'
    },
    {
        name: 'Fallback Utilities Test',
        file: 'test-fallback-utilities.html',
        description: 'Tests underlying utilities and diagnostics'
    }
];

function openBrowser(url) {
    const platform = process.platform;
    let command;

    switch (platform) {
        case 'darwin':
            command = `open "${url}"`;
            break;
        case 'win32':
            command = `start "${url}"`;
            break;
        case 'linux':
            command = `xdg-open "${url}"`;
            break;
        default:
            console.log(`Please open this URL manually: ${url}`);
            return;
    }

    exec(command, (error) => {
        if (error) {
            console.error(`Error opening browser: ${error.message}`);
            console.log(`Please open this URL manually: ${url}`);
        }
    });
}

function checkFiles() {
    const missingFiles = [];
    
    testPages.forEach(page => {
        const filePath = path.join(__dirname, page.file);
        if (!fs.existsSync(filePath)) {
            missingFiles.push(page.file);
        }
    });

    if (missingFiles.length > 0) {
        console.error('❌ Missing test files:');
        missingFiles.forEach(file => console.error(`   - ${file}`));
        return false;
    }

    return true;
}

function displayMenu() {
    console.log('\n🐉 WebGL Fallback System Test Runner\n');
    console.log('Available test pages:');
    
    testPages.forEach((page, index) => {
        console.log(`${index + 1}. ${page.name}`);
        console.log(`   File: ${page.file}`);
        console.log(`   Description: ${page.description}\n`);
    });

    console.log('0. Open all test pages');
    console.log('q. Quit\n');
}

function getUserChoice() {
    return new Promise((resolve) => {
        process.stdin.once('data', (data) => {
            resolve(data.toString().trim());
        });
    });
}

async function main() {
    console.log('🔧 Checking test files...');
    
    if (!checkFiles()) {
        process.exit(1);
    }

    console.log('✅ All test files found');

    while (true) {
        displayMenu();
        process.stdout.write('Select an option: ');
        
        const choice = await getUserChoice();

        if (choice === 'q' || choice === 'quit') {
            console.log('Goodbye! 🐉');
            break;
        }

        const optionNumber = parseInt(choice);

        if (choice === '0') {
            console.log('🚀 Opening all test pages...');
            testPages.forEach(page => {
                const filePath = path.join(__dirname, page.file);
                const fileUrl = `file://${filePath}`;
                console.log(`Opening: ${page.name}`);
                openBrowser(fileUrl);
            });
        } else if (optionNumber >= 1 && optionNumber <= testPages.length) {
            const selectedPage = testPages[optionNumber - 1];
            const filePath = path.join(__dirname, selectedPage.file);
            const fileUrl = `file://${filePath}`;
            
            console.log(`🚀 Opening: ${selectedPage.name}`);
            console.log(`📁 File: ${selectedPage.file}`);
            console.log(`🌐 URL: ${fileUrl}`);
            
            openBrowser(fileUrl);
        } else {
            console.log('❌ Invalid option. Please try again.');
        }

        console.log('\nPress Enter to continue...');
        await getUserChoice();
    }

    process.exit(0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\nGoodbye! 🐉');
    process.exit(0);
});

// Make stdin readable
if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
}

main().catch(error => {
    console.error('❌ Error running test runner:', error.message);
    process.exit(1);
});