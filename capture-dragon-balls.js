const puppeteer = require('puppeteer');
const path = require('path');

async function captureScreenshot() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to localhost:3000...');
    
    // Wait for the page to load
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('Page loaded successfully');
    
    // Wait for the page to fully load
    await page.waitForTimeout(5000);
    
    // Take full page screenshot
    await page.screenshot({ 
      path: path.join(__dirname, 'seiron-homepage.png'),
      fullPage: true
    });
    
    console.log('Full page screenshot saved');
    
    // Look for Dragon Ball elements specifically
    const dragonBallElements = await page.$$('div[class*="dragon"]');
    console.log(`Found ${dragonBallElements.length} potential dragon elements`);
    
    // Look for star elements
    const starElements = await page.$$eval('*', (elements) => {
      return elements
        .filter(el => el.textContent && el.textContent.includes('★'))
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent.trim().substring(0, 50),
          boundingBox: el.getBoundingClientRect()
        }));
    });
    
    console.log(`Found ${starElements.length} star elements:`, starElements);
    
    // Look for orb elements
    const orbElements = await page.$$eval('*', (elements) => {
      return elements
        .filter(el => {
          const className = el.className?.toLowerCase() || '';
          return className.includes('orb') || className.includes('ball');
        })
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          boundingBox: el.getBoundingClientRect()
        }));
    });
    
    console.log(`Found ${orbElements.length} orb elements:`, orbElements);
    
    // Get page content to analyze
    const pageContent = await page.content();
    const hasStars = pageContent.includes('★');
    const hasDragonBall = pageContent.includes('DragonBall') || pageContent.includes('dragon-ball');
    
    console.log('Page analysis:');
    console.log('- Has stars:', hasStars);
    console.log('- Has Dragon Ball references:', hasDragonBall);
    console.log('- Page title:', await page.title());
    
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

// Add a delay to ensure server is ready
setTimeout(() => {
  captureScreenshot().catch(console.error);
}, 2000);