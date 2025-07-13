const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Verifying localhost:3000 with Puppeteer...\n');
  
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Ignore WebSocket errors
    page.on('console', msg => {
      if (!msg.text().includes('WebSocket') && !msg.text().includes('vite')) {
        console.log('Browser console:', msg.text());
      }
    });
    
    await page.setViewport({ width: 1280, height: 1200 });
    
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    // Wait for main content
    await page.waitForSelector('h1', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('✅ Page loaded successfully\n');
    
    // Verify specific elements
    const verification = await page.evaluate(() => {
      const results = {};
      
      // Check main heading
      const h1 = document.querySelector('h1');
      results.mainHeading = h1 ? h1.textContent : 'NOT FOUND';
      
      // Check for Saiyan theme
      results.hasSaiyanTheme = document.body.textContent.includes('Super Saiyan');
      results.hasEliteWarrior = document.body.textContent.includes('Elite Warrior');
      results.hasFusionMaster = document.body.textContent.includes('Fusion Master');
      results.hasLegendarySaiyan = document.body.textContent.includes('Legendary Saiyan');
      
      // Check power level
      const powerLevelEl = document.querySelector('.text-5xl');
      results.powerLevel = powerLevelEl ? powerLevelEl.textContent : 'NOT FOUND';
      
      // Check for Elite badge
      results.hasEliteBadge = !!document.querySelector('.bg-green-500\\/20') || 
                              document.body.textContent.includes('Elite');
      
      // Check tagline
      results.tagline = document.body.textContent.includes('legendary portfolio warrior');
      
      // Check buttons
      results.buttons = Array.from(document.querySelectorAll('button'))
        .map(btn => btn.textContent.trim())
        .filter(text => text.length > 0);
      
      // Check for dragon balls
      results.dragonBalls = document.body.textContent.includes('Dragon Balls');
      
      // Count stars
      const stars = Array.from(document.querySelectorAll('span'))
        .filter(span => span.textContent === '★');
      results.starCount = stars.length;
      
      return results;
    });
    
    console.log('📊 VERIFICATION RESULTS:\n');
    console.log('✅ Main Heading:', verification.mainHeading);
    console.log('✅ Power Level:', verification.powerLevel);
    console.log('✅ Has Elite Badge:', verification.hasEliteBadge ? 'YES' : 'NO');
    console.log('✅ Has Tagline "legendary portfolio warrior":', verification.tagline ? 'YES' : 'NO');
    console.log('✅ Has Dragon Balls text:', verification.dragonBalls ? 'YES' : 'NO');
    console.log('✅ Star Count:', verification.starCount);
    
    console.log('\n🎮 SAIYAN THEME CHECK:');
    console.log('✅ Has "Super Saiyan":', verification.hasSaiyanTheme ? 'YES' : 'NO');
    console.log('✅ Has "Elite Warrior":', verification.hasEliteWarrior ? 'YES' : 'NO');
    console.log('✅ Has "Fusion Master":', verification.hasFusionMaster ? 'YES' : 'NO');
    console.log('✅ Has "Legendary Saiyan":', verification.hasLegendarySaiyan ? 'YES' : 'NO');
    
    console.log('\n🔘 BUTTONS FOUND:');
    verification.buttons.forEach((btn, i) => {
      console.log(`  ${i + 1}. ${btn}`);
    });
    
    // Final verdict
    const isSaiyanTheme = 
      verification.mainHeading === 'SEIRON' &&
      verification.hasSaiyanTheme &&
      verification.hasEliteWarrior &&
      verification.hasFusionMaster &&
      verification.hasLegendarySaiyan &&
      verification.tagline;
    
    console.log('\n' + '='.repeat(50));
    console.log(isSaiyanTheme ? 
      '✅ CONFIRMED: Saiyan/DBZ theme is active!' : 
      '❌ ERROR: Saiyan/DBZ theme NOT found!'
    );
    console.log('='.repeat(50));
    
    // Take screenshot for proof
    await page.screenshot({ 
      path: 'puppeteer-verification.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved: puppeteer-verification.png');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();