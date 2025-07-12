#!/usr/bin/env node

/**
 * Simple HTTP Server for WebGL Fallback Tests
 * 
 * Starts a local HTTP server to serve the test pages and avoid
 * file:// protocol limitations in some browsers.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 8080;
const HOST = 'localhost';

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(req, res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`File not found: ${filePath}`);
            return;
        }

        const mimeType = getMimeType(filePath);
        res.writeHead(200, { 
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        });
        res.end(data);
    });
}

function generateIndexPage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebGL Fallback Tests - Server Index</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            background: #000;
            color: #00ff00;
            margin: 0;
            padding: 40px;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #00ff00;
            padding-bottom: 20px;
        }
        .test-links {
            display: grid;
            gap: 20px;
            margin: 30px 0;
        }
        .test-link {
            display: block;
            padding: 20px;
            border: 1px solid #00ff00;
            background: rgba(0, 255, 0, 0.05);
            text-decoration: none;
            color: #00ff00;
            border-radius: 5px;
            transition: background 0.3s ease;
        }
        .test-link:hover {
            background: rgba(0, 255, 0, 0.1);
        }
        .test-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .test-description {
            font-size: 14px;
            color: #88ff88;
        }
        .server-info {
            background: rgba(0, 102, 255, 0.1);
            border: 1px solid #0066ff;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .status {
            color: #00aaff;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐉 WebGL Fallback Tests</h1>
            <p>Local HTTP Server - Better than file:// protocol</p>
        </div>

        <div class="server-info">
            <h3 class="status">🚀 Server Status</h3>
            <p><strong>URL:</strong> http://${HOST}:${PORT}</p>
            <p><strong>Protocol:</strong> HTTP (avoids file:// limitations)</p>
            <p><strong>CORS:</strong> Enabled for external resources</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>

        <div class="test-links">
            <a href="/webgl-fallback-test.html" class="test-link">
                <div class="test-title">🎮 WebGL Fallback System Test</div>
                <div class="test-description">
                    Main dragon renderer testing with real-time voice integration,
                    performance monitoring, and visual fallback demonstration.
                </div>
            </a>

            <a href="/test-fallback-utilities.html" class="test-link">
                <div class="test-title">🔧 Fallback Utilities Test</div>
                <div class="test-description">
                    Direct testing of WebGL utilities, diagnostics system,
                    environment detection, and mock implementations.
                </div>
            </a>

            <a href="/WEBGL_FALLBACK_TESTS.md" class="test-link">
                <div class="test-title">📚 Documentation</div>
                <div class="test-description">
                    Complete guide to the fallback test system, troubleshooting,
                    and performance benchmarks.
                </div>
            </a>
        </div>

        <div class="server-info">
            <h3 class="status">💡 Tips</h3>
            <ul>
                <li>Use Chrome or Firefox for best WebGL support</li>
                <li>Open browser DevTools to see detailed logs</li>
                <li>Test in incognito mode to avoid extension interference</li>
                <li>Try both desktop and mobile browsers</li>
            </ul>
        </div>
    </div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
    let requestedPath = req.url === '/' ? '/index.html' : req.url;
    
    // Remove query parameters
    requestedPath = requestedPath.split('?')[0];
    
    // Security: prevent directory traversal
    if (requestedPath.includes('..')) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    // Generate index page dynamically
    if (requestedPath === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(generateIndexPage());
        return;
    }

    // Serve static files
    const filePath = path.join(__dirname, requestedPath);
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`File not found: ${requestedPath}`);
            return;
        }

        serveFile(req, res, filePath);
    });
});

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

server.listen(PORT, HOST, () => {
    const serverUrl = `http://${HOST}:${PORT}`;
    
    console.log('🐉 WebGL Fallback Test Server');
    console.log('============================');
    console.log(`🚀 Server running at: ${serverUrl}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log('');
    console.log('📄 Available test pages:');
    console.log(`   Main Test: ${serverUrl}/webgl-fallback-test.html`);
    console.log(`   Utilities: ${serverUrl}/test-fallback-utilities.html`);
    console.log(`   Index:     ${serverUrl}/`);
    console.log('');
    console.log('⌨️  Press Ctrl+C to stop the server');
    console.log('');
    
    // Auto-open browser
    setTimeout(() => {
        console.log('🌐 Opening browser...');
        openBrowser(serverUrl);
    }, 1000);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\\n\\n🛑 Shutting down test server...');
    server.close(() => {
        console.log('✅ Server stopped. Goodbye! 🐉');
        process.exit(0);
    });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Server error:', error.message);
    process.exit(1);
});

console.log('🔧 Starting WebGL Fallback Test Server...');
console.log(`   Port: ${PORT}`);
console.log(`   Host: ${HOST}`);
console.log(`   Directory: ${__dirname}`);