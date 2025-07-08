const puppeteer = require('puppeteer');
const path = require('path');

async function captureScreenshot() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1400, height: 1000 }
  });
  
  const page = await browser.newPage();
  
  try {
    const filePath = `file://${path.join(__dirname, 'dragon-ball-test.html')}`;
    console.log('Loading test page:', filePath);
    
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(__dirname, 'dragon-ball-star-positioning-analysis.png'),
      fullPage: true
    });
    
    console.log('Screenshot saved: dragon-ball-star-positioning-analysis.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshot().catch(console.error);