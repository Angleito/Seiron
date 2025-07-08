const puppeteer = require('puppeteer');
const path = require('path');

async function captureScreenshot() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the Seiron homepage
    console.log('Navigating to Seiron homepage...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'load',
      timeout: 10000
    });
    
    // Wait for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Look for Dragon Ball feature cards - try multiple possible selectors
    const dragonBallSelectors = [
      '[data-testid="dragon-ball"]',
      '.dragon-ball',
      '.feature-card',
      '.orb',
      '[class*="dragonball"]',
      '[class*="dragon-ball"]'
    ];
    
    let dragonBallElement = null;
    for (const selector of dragonBallSelectors) {
      try {
        dragonBallElement = await page.$(selector);
        if (dragonBallElement) {
          console.log(`Found Dragon Ball element with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Take a full page screenshot first
    console.log('Taking full page screenshot...');
    await page.screenshot({ 
      path: path.join(__dirname, 'seiron-homepage-full.png'),
      fullPage: true
    });
    
    // If we found Dragon Ball elements, take a focused screenshot
    if (dragonBallElement) {
      console.log('Taking focused Dragon Ball screenshot...');
      await dragonBallElement.screenshot({ 
        path: path.join(__dirname, 'dragon-balls-focused.png')
      });
    }
    
    // Try to find and capture the specific section with Dragon Balls
    const sectionSelectors = [
      'section:has(.dragon-ball)',
      'section:has([data-testid="dragon-ball"])',
      '.features-section',
      '.hero-section',
      'main section'
    ];
    
    for (const selector of sectionSelectors) {
      try {
        const section = await page.$(selector);
        if (section) {
          console.log(`Found section with selector: ${selector}`);
          await section.screenshot({ 
            path: path.join(__dirname, `section-${selector.replace(/[^a-zA-Z0-9]/g, '-')}.png`)
          });
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Get page content to analyze the structure
    const pageContent = await page.content();
    console.log('Page title:', await page.title());
    
    // Look for star-related elements
    const starElements = await page.$$eval('*', (elements) => {
      return elements
        .filter(el => el.textContent && el.textContent.includes('★'))
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent.trim(),
          style: window.getComputedStyle(el).cssText
        }));
    });
    
    console.log('Found star elements:', starElements.length);
    starElements.forEach((el, index) => {
      console.log(`Star ${index + 1}:`, el);
    });
    
    // Try to find elements that might contain Dragon Ball orbs
    const orbElements = await page.$$eval('*', (elements) => {
      return elements
        .filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          const className = el.className?.toLowerCase() || '';
          return text.includes('ball') || 
                 text.includes('orb') || 
                 className.includes('ball') || 
                 className.includes('orb') ||
                 className.includes('dragon');
        })
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          textContent: el.textContent?.substring(0, 100) + '...',
          boundingBox: el.getBoundingClientRect()
        }));
    });
    
    console.log('Found orb/ball elements:', orbElements.length);
    orbElements.forEach((el, index) => {
      console.log(`Orb ${index + 1}:`, el);
    });
    
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshot().catch(console.error);