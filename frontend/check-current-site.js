const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Loading http://localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.screenshot({ 
      path: 'current-localhost.png',
      fullPage: true 
    });
    
    console.log('Screenshot saved to current-localhost.png');
    
    // Get page content
    const content = await page.evaluate(() => {
      const getTextContent = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };
      
      return {
        title: document.title,
        h1: getTextContent('h1'),
        h2: getTextContent('h2'),
        powerLevel: getTextContent('.text-5xl'),
        bodyText: document.body.innerText.substring(0, 500),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
        hasDebugBar: !!document.querySelector('[data-testid="debug-bar"]'),
        rootLayoutText: getTextContent('div:has(> div[data-testid="debug-bar"])')
      };
    });
    
    console.log('Page content:', JSON.stringify(content, null, 2));
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
  }
})();