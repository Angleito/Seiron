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
    
    // Wait a bit for any animations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.screenshot({ 
      path: 'localhost-screenshot.png',
      fullPage: true 
    });
    
    console.log('Screenshot saved to localhost-screenshot.png');
    
    // Get some page content
    const content = await page.evaluate(() => {
      return {
        title: document.title,
        h1: document.querySelector('h1')?.textContent,
        powerLevel: document.querySelector('span.text-5xl')?.textContent,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent)
      };
    });
    
    console.log('Page content:', JSON.stringify(content, null, 2));
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
  }
})();