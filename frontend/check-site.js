const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Take a screenshot
  await page.screenshot({ path: 'localhost-homepage.png', fullPage: true });
  console.log('Screenshot saved to localhost-homepage.png');
  
  // Get page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Check for key elements
  const powerLevel = await page.textContent('text=/\\d+\\.\\d+K/');
  console.log('Power level found:', powerLevel);
  
  const seiron = await page.textContent('h1');
  console.log('Main heading:', seiron);
  
  const eliteBadge = await page.textContent('text=Elite');
  console.log('Elite badge found:', eliteBadge ? 'Yes' : 'No');
  
  // Check for feature cards
  const cards = await page.$$('.grid > div');
  console.log('Feature cards found:', cards.length);
  
  await browser.close();
})();