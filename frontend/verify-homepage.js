const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 1200 });
    
    console.log('🌐 Navigating to http://localhost:3000...\n');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for content to fully load
    await page.waitForSelector('h1', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'homepage-verification.png',
      fullPage: true 
    });
    
    console.log('📸 Screenshot saved to homepage-verification.png\n');
    
    // Comprehensive content verification
    const verification = await page.evaluate(() => {
      const results = {
        title: document.title,
        mainHeading: document.querySelector('h1')?.textContent || 'NOT FOUND',
        tagline: null,
        powerLevel: {
          label: null,
          value: null,
          badge: null
        },
        dragonBalls: {
          count: 0,
          text: null
        },
        navigation: [],
        mainButtons: [],
        featureCards: [],
        footer: {
          totalPower: null,
          ctaButton: null,
          subtext: [],
        }
      };
      
      // Get tagline
      const h1 = document.querySelector('h1');
      if (h1 && h1.nextElementSibling) {
        results.tagline = h1.nextElementSibling.textContent;
      }
      
      // Get power level info
      const powerLevelSection = document.querySelector('h2');
      if (powerLevelSection && powerLevelSection.textContent.includes('Power Level')) {
        results.powerLevel.label = powerLevelSection.textContent;
        const valueEl = document.querySelector('.text-5xl');
        if (valueEl) results.powerLevel.value = valueEl.textContent;
        const badgeEl = document.querySelector('.bg-green-500\\/20');
        if (badgeEl) results.powerLevel.badge = badgeEl.textContent.trim();
      }
      
      // Count dragon balls (stars)
      const stars = document.querySelectorAll('.text-2xl');
      results.dragonBalls.count = stars.length;
      const dragonBallText = Array.from(document.querySelectorAll('p')).find(p => 
        p.textContent.includes('Dragon Balls')
      );
      if (dragonBallText) results.dragonBalls.text = dragonBallText.textContent;
      
      // Get navigation buttons
      const navButtons = document.querySelectorAll('.flex.justify-center.gap-8 button');
      results.navigation = Array.from(navButtons).map(btn => btn.textContent);
      
      // Get main CTA buttons
      const ctaSection = document.querySelectorAll('.flex.justify-center.gap-4 button');
      results.mainButtons = Array.from(ctaSection).map(btn => btn.textContent);
      
      // Get feature cards
      const cards = document.querySelectorAll('.grid > div');
      results.featureCards = Array.from(cards).map(card => {
        const title = card.querySelector('h3')?.textContent;
        const powerLevel = card.querySelector('.text-yellow-400.font-bold')?.textContent;
        const subtitle = card.querySelector('h4')?.textContent;
        const description = card.querySelector('p')?.textContent;
        const button = card.querySelector('button')?.textContent;
        
        if (title && powerLevel) {
          return { title, powerLevel, subtitle, description, button };
        }
        return null;
      }).filter(Boolean);
      
      // Get footer info
      const footerText = Array.from(document.querySelectorAll('p')).find(p => 
        p.textContent.includes('Total Power Available')
      );
      if (footerText) results.footer.totalPower = footerText.textContent;
      
      const startButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('START YOUR JOURNEY')
      );
      if (startButton) results.footer.ctaButton = startButton.textContent;
      
      const footerSubtext = Array.from(document.querySelectorAll('.text-gray-500, .text-gray-600'))
        .map(el => el.textContent)
        .filter(text => text.includes('registration') || text.includes('Wallet'));
      results.footer.subtext = footerSubtext;
      
      return results;
    });
    
    // Display verification results
    console.log('✅ HOMEPAGE VERIFICATION RESULTS:\n');
    console.log('📄 Page Title:', verification.title);
    console.log('🎯 Main Heading:', verification.mainHeading);
    console.log('💬 Tagline:', verification.tagline);
    console.log('\n⚡ POWER LEVEL:');
    console.log('  - Label:', verification.powerLevel.label);
    console.log('  - Value:', verification.powerLevel.value);
    console.log('  - Badge:', verification.powerLevel.badge);
    console.log('\n🐉 DRAGON BALLS:');
    console.log('  - Star Count:', verification.dragonBalls.count);
    console.log('  - Text:', verification.dragonBalls.text);
    console.log('\n🧭 NAVIGATION:', verification.navigation);
    console.log('\n🔘 MAIN BUTTONS:', verification.mainButtons);
    console.log('\n📋 FEATURE CARDS:');
    verification.featureCards.forEach((card, i) => {
      console.log(`  ${i + 1}. ${card.title} (${card.powerLevel})`);
      console.log(`     - ${card.subtitle}`);
      console.log(`     - ${card.description}`);
      console.log(`     - Button: ${card.button}`);
    });
    console.log('\n📍 FOOTER:');
    console.log('  - Total Power:', verification.footer.totalPower);
    console.log('  - CTA Button:', verification.footer.ctaButton);
    console.log('  - Subtext:', verification.footer.subtext);
    
    // Check if it matches production
    const isProductionMatch = 
      verification.mainHeading === 'SEIRON' &&
      verification.tagline?.includes('legendary portfolio warrior') &&
      verification.powerLevel.value === '32.2K' &&
      verification.powerLevel.badge === 'Elite' &&
      verification.dragonBalls.count === 22 &&
      verification.featureCards.length === 4 &&
      verification.featureCards.some(card => card.title === 'Super Saiyan');
    
    console.log('\n' + '='.repeat(50));
    console.log(isProductionMatch ? 
      '✅ MATCHES PRODUCTION SITE!' : 
      '❌ DOES NOT MATCH PRODUCTION SITE!'
    );
    console.log('='.repeat(50));
    
    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();