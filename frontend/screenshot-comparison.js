const puppeteer = require('puppeteer');

async function captureScreenshot(browser, url, filename) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1200 });
  
  console.log(`📸 Capturing ${url}...`);
  
  try {
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    // Wait for content to load
    await new Promise(r => setTimeout(r, 3000));
    
    await page.screenshot({ 
      path: filename,
      fullPage: true 
    });
    
    console.log(`✅ Screenshot saved: ${filename}`);
    
    // Get key content
    const content = await page.evaluate(() => {
      return {
        title: document.title,
        h1: document.querySelector('h1')?.textContent || 'NOT FOUND',
        powerLevel: document.querySelector('.text-5xl, .text-6xl')?.textContent || 'NOT FOUND',
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
        hasSaiyan: document.body.textContent.includes('Super Saiyan'),
        hasElite: document.body.textContent.includes('Elite'),
        hasDragonBalls: document.body.textContent.includes('Dragon Balls'),
        bodyTextSnippet: document.body.innerText.substring(0, 200)
      };
    });
    
    await page.close();
    return content;
    
  } catch (error) {
    console.error(`❌ Error capturing ${url}:`, error.message);
    await page.close();
    return null;
  }
}

(async () => {
  console.log('🔍 SCREENSHOT COMPARISON\n');
  console.log('=' .repeat(50));
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Capture localhost
    const localhostContent = await captureScreenshot(
      browser, 
      'http://localhost:3000', 
      'screenshot-localhost.png'
    );
    
    // Capture production
    const productionContent = await captureScreenshot(
      browser, 
      'https://seiron.xyz', 
      'screenshot-production.png'
    );
    
    console.log('\n📊 CONTENT COMPARISON:\n');
    
    if (localhostContent) {
      console.log('LOCALHOST (http://localhost:3000):');
      console.log(`  Title: ${localhostContent.title}`);
      console.log(`  H1: ${localhostContent.h1}`);
      console.log(`  Power Level: ${localhostContent.powerLevel}`);
      console.log(`  Has Saiyan Theme: ${localhostContent.hasSaiyan ? '✅' : '❌'}`);
      console.log(`  Has Elite Badge: ${localhostContent.hasElite ? '✅' : '❌'}`);
      console.log(`  Has Dragon Balls: ${localhostContent.hasDragonBalls ? '✅' : '❌'}`);
      console.log(`  Button Count: ${localhostContent.buttons.length}`);
    }
    
    if (productionContent) {
      console.log('\nPRODUCTION (https://seiron.xyz):');
      console.log(`  Title: ${productionContent.title}`);
      console.log(`  H1: ${productionContent.h1}`);
      console.log(`  Power Level: ${productionContent.powerLevel}`);
      console.log(`  Has Saiyan Theme: ${productionContent.hasSaiyan ? '✅' : '❌'}`);
      console.log(`  Has Elite Badge: ${productionContent.hasElite ? '✅' : '❌'}`);
      console.log(`  Has Dragon Balls: ${productionContent.hasDragonBalls ? '✅' : '❌'}`);
      console.log(`  Button Count: ${productionContent.buttons.length}`);
    }
    
    if (localhostContent && productionContent) {
      console.log('\n🎯 MATCH RESULTS:');
      console.log(`  Same H1: ${localhostContent.h1 === productionContent.h1 ? '✅' : '❌'}`);
      console.log(`  Both have Saiyan theme: ${localhostContent.hasSaiyan && productionContent.hasSaiyan ? '✅' : '❌'}`);
      console.log(`  Both have Elite badge: ${localhostContent.hasElite && productionContent.hasElite ? '✅' : '❌'}`);
      console.log(`  Both have Dragon Balls: ${localhostContent.hasDragonBalls && productionContent.hasDragonBalls ? '✅' : '❌'}`);
    }
    
    console.log('\n✅ Screenshots saved:');
    console.log('  - screenshot-localhost.png');
    console.log('  - screenshot-production.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();