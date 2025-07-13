const puppeteer = require('puppeteer');

async function captureSite(page, url, screenshotName) {
  console.log(`\n📍 Analyzing ${url}...`);
  await page.goto(url, { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await page.screenshot({ 
    path: screenshotName,
    fullPage: true 
  });
  
  const siteData = await page.evaluate(() => {
    const getTextContent = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim() : null;
    };
    
    const getAllTextContent = (selector) => {
      return Array.from(document.querySelectorAll(selector)).map(el => el.textContent.trim());
    };
    
    return {
      title: document.title,
      mainHeading: getTextContent('h1'),
      allHeadings: getAllTextContent('h1, h2, h3'),
      bodyText: document.body.innerText,
      buttons: getAllTextContent('button'),
      links: getAllTextContent('a'),
      // Get specific elements
      powerLevel: {
        value: getTextContent('.text-5xl, .text-6xl, [class*="text-"][class*="xl"]'),
        badge: getTextContent('[class*="bg-green"], [class*="Elite"]')
      },
      // Count all elements that might be stars
      possibleStars: {
        spans: document.querySelectorAll('span').length,
        withStarChar: Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent === '★' || el.textContent === '⭐'
        ).length,
        withStarClass: document.querySelectorAll('[class*="star"]').length
      }
    };
  });
  
  return siteData;
}

(async () => {
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1200 });
    
    // Capture production site
    console.log('🌐 COMPARING PRODUCTION vs LOCALHOST\n');
    console.log('=' .repeat(50));
    
    const productionData = await captureSite(page, 'https://seiron.xyz', 'production-site.png');
    const localhostData = await captureSite(page, 'http://localhost:3000', 'localhost-site.png');
    
    // Compare key elements
    console.log('\n📊 COMPARISON RESULTS:\n');
    
    console.log('🏷️ PAGE TITLES:');
    console.log(`  Production: ${productionData.title}`);
    console.log(`  Localhost:  ${localhostData.title}`);
    console.log(`  Match: ${productionData.title === localhostData.title ? '✅' : '❌'}`);
    
    console.log('\n📝 MAIN HEADING:');
    console.log(`  Production: ${productionData.mainHeading}`);
    console.log(`  Localhost:  ${localhostData.mainHeading}`);
    console.log(`  Match: ${productionData.mainHeading === localhostData.mainHeading ? '✅' : '❌'}`);
    
    console.log('\n⚡ POWER LEVEL:');
    console.log(`  Production Value: ${productionData.powerLevel.value}`);
    console.log(`  Localhost Value:  ${localhostData.powerLevel.value}`);
    console.log(`  Production Badge: ${productionData.powerLevel.badge}`);
    console.log(`  Localhost Badge:  ${localhostData.powerLevel.badge}`);
    
    console.log('\n🔘 BUTTONS:');
    console.log('  Production:', productionData.buttons.length, 'buttons');
    console.log('  Localhost:', localhostData.buttons.length, 'buttons');
    
    console.log('\n📑 ALL HEADINGS:');
    console.log('  Production:', productionData.allHeadings);
    console.log('  Localhost:', localhostData.allHeadings);
    
    console.log('\n⭐ STAR ELEMENTS:');
    console.log('  Production - Total spans:', productionData.possibleStars.spans);
    console.log('  Production - Star chars:', productionData.possibleStars.withStarChar);
    console.log('  Localhost - Total spans:', localhostData.possibleStars.spans);
    console.log('  Localhost - Star chars:', localhostData.possibleStars.withStarChar);
    
    // Extract key differences
    console.log('\n🔍 KEY DIFFERENCES:');
    
    const prodButtons = productionData.buttons;
    const localButtons = localhostData.buttons;
    
    const missingButtons = prodButtons.filter(btn => !localButtons.includes(btn));
    const extraButtons = localButtons.filter(btn => !prodButtons.includes(btn));
    
    if (missingButtons.length > 0) {
      console.log(`  ❌ Missing buttons: ${missingButtons.join(', ')}`);
    }
    if (extraButtons.length > 0) {
      console.log(`  ➕ Extra buttons: ${extraButtons.join(', ')}`);
    }
    
    // Check for specific production content
    const prodContent = productionData.bodyText.toLowerCase();
    const localContent = localhostData.bodyText.toLowerCase();
    
    const keyPhrases = [
      'seiron power level',
      'legendary portfolio warrior',
      'dragon balls',
      'elite warrior',
      'super saiyan',
      'fusion master',
      'legendary saiyan'
    ];
    
    console.log('\n✅ KEY CONTENT CHECK:');
    keyPhrases.forEach(phrase => {
      const inProd = prodContent.includes(phrase);
      const inLocal = localContent.includes(phrase);
      console.log(`  "${phrase}": Production ${inProd ? '✅' : '❌'} | Localhost ${inLocal ? '✅' : '❌'}`);
    });
    
    console.log('\n📸 Screenshots saved:');
    console.log('  - production-site.png');
    console.log('  - localhost-site.png');
    
    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();