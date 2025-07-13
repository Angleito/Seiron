const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Capture localhost first
    console.log('📸 Capturing localhost:3000...');
    const page1 = await browser.newPage();
    await page1.setViewport({ width: 1280, height: 1200 });
    await page1.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    await page1.screenshot({ path: 'localhost-current.png', fullPage: true });
    
    const localhostContent = await page1.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent,
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
      hasElite: document.body.textContent.includes('Elite'),
      hasSaiyan: document.body.textContent.includes('Super Saiyan'),
      hasPowerLevel: document.body.textContent.includes('Power Level')
    }));
    
    await page1.close();
    
    console.log('\n📸 Capturing seiron.xyz...');
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 1280, height: 1200 });
    
    try {
      await page2.goto('https://seiron.xyz', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      await new Promise(r => setTimeout(r, 3000));
      await page2.screenshot({ path: 'production-current.png', fullPage: true });
      
      const productionContent = await page2.evaluate(() => ({
        title: document.title,
        h1: document.querySelector('h1')?.textContent,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
        hasElite: document.body.textContent.includes('Elite'),
        hasSaiyan: document.body.textContent.includes('Super Saiyan'),
        hasPowerLevel: document.body.textContent.includes('Power Level')
      }));
      
      console.log('\n📊 COMPARISON:\n');
      console.log('LOCALHOST:', localhostContent);
      console.log('\nPRODUCTION:', productionContent);
      
    } catch (error) {
      console.log('\n⚠️ Could not load production site, showing localhost data only:');
      console.log(localhostContent);
    }
    
    await browser.close();
    console.log('\n✅ Screenshots saved: localhost-current.png and production-current.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();