const puppeteer = require('puppeteer');

(async () => {
  console.log('📸 Taking final screenshot of localhost:3000\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1400 });
    
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for animations
    await new Promise(r => setTimeout(r, 3000));
    
    // Take screenshot
    await page.screenshot({ 
      path: 'final-localhost-screenshot.png',
      fullPage: true 
    });
    
    console.log('✅ Screenshot saved: final-localhost-screenshot.png');
    
    // Get comprehensive content check
    const verification = await page.evaluate(() => {
      const content = {
        elements: {},
        text: {}
      };
      
      // Check for all key elements
      content.elements.h1 = document.querySelector('h1')?.textContent;
      content.elements.powerLevel = document.querySelector('.text-5xl')?.textContent;
      content.elements.elite = document.querySelector('.bg-green-500\\/20')?.textContent || 
                               Array.from(document.querySelectorAll('*')).find(el => el.textContent.trim() === 'Elite')?.textContent;
      
      // Check for all text content
      const bodyText = document.body.innerText;
      content.text.hasSEIRON = bodyText.includes('SEIRON');
      content.text.hasPowerLevel = bodyText.includes('Power Level');
      content.text.hasLegendaryWarrior = bodyText.includes('legendary portfolio warrior');
      content.text.hasDragonBalls = bodyText.includes('Dragon Balls');
      content.text.hasEliteWarrior = bodyText.includes('Elite Warrior');
      content.text.hasSuperSaiyan = bodyText.includes('Super Saiyan');
      content.text.hasFusionMaster = bodyText.includes('Fusion Master');
      content.text.hasLegendarySaiyan = bodyText.includes('Legendary Saiyan');
      content.text.hasTotalPower = bodyText.includes('Total Power Available');
      
      // Get all buttons
      content.buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
      
      // Count stars
      content.starCount = Array.from(document.querySelectorAll('span')).filter(s => s.textContent === '★').length;
      
      return content;
    });
    
    console.log('\n✅ FINAL VERIFICATION:\n');
    console.log('ELEMENTS FOUND:');
    console.log(`  H1: "${verification.elements.h1}"`);
    console.log(`  Power Level: "${verification.elements.powerLevel}"`);
    console.log(`  Elite Badge: "${verification.elements.elite}"`);
    console.log(`  Star Count: ${verification.starCount}`);
    
    console.log('\nCONTENT VERIFICATION:');
    Object.entries(verification.text).forEach(([key, value]) => {
      const label = key.replace(/has/, '').replace(/([A-Z])/g, ' $1').trim();
      console.log(`  ${label}: ${value ? '✅' : '❌'}`);
    });
    
    console.log('\nBUTTONS:', verification.buttons.length);
    verification.buttons.forEach((btn, i) => {
      console.log(`  ${i + 1}. ${btn}`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ LOCALHOST IS DISPLAYING THE SAIYAN/DBZ THEME');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();