# Seiron Chat Diagnostics Tool

This Puppeteer-based diagnostic script comprehensively tests the AI chat functionality in the Seiron project.

## 🚀 Usage

```bash
# Run diagnostics on default localhost:3000
node scripts/diagnose-chat.js

# Run diagnostics on a different URL
BASE_URL=https://your-deployment.com node scripts/diagnose-chat.js
```

## 🔍 What It Tests

### 1. **Page Navigation**
- Successfully loads the chat page
- Captures initial load screenshot

### 2. **Interface Toggle Buttons**
- Verifies all three chat modes are available:
  - 🐉 AI Voice
  - Minimal Anime
  - Minimal

### 3. **Interface Mode Testing**
- Tests each interface mode individually
- Verifies UI elements load correctly
- Captures screenshots of each mode

### 4. **Message Sending**
- Types a test message
- Sends to the AI
- Monitors API calls
- Verifies response received

### 5. **Error Detection**
- JavaScript console errors
- Network request failures
- CORS issues

### 6. **API Analysis**
- Tracks all API endpoints called
- Records response status codes
- Identifies failed requests

### 7. **Rate Limiting**
- Detects 429 status codes
- Reports rate limit incidents

### 8. **CORS Configuration**
- Checks for cross-origin errors
- Validates proper CORS headers

## 📊 Output

The script generates:

1. **Console Output**: Real-time test progress and results
2. **Screenshots**: Saved to `diagnostic-screenshots/` directory
3. **JSON Report**: Detailed report saved as `chat-diagnostic-report-{timestamp}.json`

### Report Structure

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "url": "http://localhost:3000/chat",
  "tests": [...],
  "errors": [...],
  "warnings": [...],
  "networkRequests": [...],
  "consoleMessages": [...],
  "screenshots": [...],
  "summary": {
    "totalTests": 8,
    "passed": 6,
    "failed": 2,
    "warnings": 0
  }
}
```

## 🎯 Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed

## 🐛 Common Issues Detected

### Voice Interface Disabled
The script detects when the voice interface shows the "temporarily disabled" message and reports it appropriately.

### API Failures
- 401: Authentication issues
- 429: Rate limiting
- 500: Server errors
- CORS: Cross-origin request blocked

### Missing UI Elements
- Chat input field not found
- Send button missing
- Interface toggle buttons absent

## 💡 Recommendations

Based on test results, the script provides actionable recommendations:

1. Fix failing tests before deployment
2. Resolve JavaScript console errors
3. Re-enable voice interface if disabled
4. Check backend logs for server errors
5. Adjust rate limits if needed

## 🔧 Requirements

- Node.js 14+
- Puppeteer (already installed in package.json)
- Running Seiron application (or deployed URL)

## 📝 Example Output

```
🐉 Seiron Chat Diagnostics Starting...

Target URL: http://localhost:3000/chat
Timestamp: 2024-01-01T00:00:00.000Z

Launching Puppeteer...

📍 Test 1: Navigating to chat page...
[PASSED] Navigate to chat page
  Screenshot saved: screenshot-initial-load-1704067200000.png

🔘 Test 2: Checking interface toggle buttons...
[PASSED] Interface toggle buttons

🎮 Test 3.1: Testing Minimal interface...
[PASSED] Minimal interface load
  Screenshot saved: screenshot-minimal-interface-1704067201000.png

💬 Test 4: Testing message sending...
[PASSED] Send message

⚠️  Test 5: Checking for errors and warnings...
[PASSED] No JavaScript errors

🌐 Test 6: Analyzing network requests...
[PASSED] API requests

=== SUMMARY ===
Total Tests: 8
Passed: 8 (100%)
Failed: 0 (0%)
Warnings: 0
```

## 🚨 Troubleshooting

### Script fails to run
- Ensure Node.js is installed
- Run `npm install` to install dependencies
- Check if the application is running on the specified URL

### Screenshots not saving
- Ensure write permissions in the project directory
- The script creates `diagnostic-screenshots/` automatically

### Network timeouts
- Increase the TIMEOUT value in the script
- Check if the application is responding
- Verify no firewall/proxy issues