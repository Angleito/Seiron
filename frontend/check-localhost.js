const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1200 });
  
  console.log('Checking localhost:3000...\n');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'localhost-final.png', fullPage: true });
  
  const content = await page.evaluate(() => {
    const data = {
      title: document.title,
      mainText: [],
      theme: 'unknown'
    };
    
    // Get all visible text
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (node.parentElement.offsetParent !== null) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      if (text.length > 0 && text.length < 100) {
        data.mainText.push(text);
      }
    }
    
    // Determine theme
    if (document.body.textContent.includes('Super Saiyan') && 
        document.body.textContent.includes('Power Level') &&
        document.body.textContent.includes('Elite')) {
      data.theme = 'Dragon Ball Z / Saiyan';
    } else if (document.body.textContent.includes('dragon') || 
               document.body.textContent.includes('Dragon')) {
      data.theme = 'Dragon';
    }
    
    return data;
  });
  
  console.log('Page Title:', content.title);
  console.log('Theme Detected:', content.theme);
  console.log('\nKey Content Found:');
  
  const keywords = ['SEIRON', 'Power Level', 'Elite', 'Super Saiyan', 'Fusion Master', 'dragon', 'Dragon'];
  keywords.forEach(keyword => {
    const found = content.mainText.some(text => text.includes(keyword));
    console.log(`  ${keyword}: ${found ? '✅' : '❌'}`);
  });
  
  console.log('\nScreenshot saved: localhost-final.png');
  
  await browser.close();
})();