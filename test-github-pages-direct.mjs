import { chromium } from 'playwright';

async function test() {
  console.log('🔍 GITHUB PAGES DIRECT URL TEST\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  try {
    await page.goto('https://jacklawrencecmg.github.io/ADVANCEDFANTASYDRAFTPROS/', 
      { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const pageText = await page.evaluate(() => document.body.innerText);
    const htmlSource = await page.evaluate(() => document.documentElement.outerHTML);
    
    console.log('✓ Page loaded');
    console.log(`✓ Page size: ${pageText.length} chars`);
    console.log(`✓ Has Analyze button: ${pageText.includes('Analyze')}`);
    console.log(`✓ Has "Trade saved": ${pageText.includes('Trade saved')}`);
    console.log(`✓ Has saved_trades code: ${htmlSource.includes('saved_trades')}`);
    console.log(`✓ JavaScript errors: ${errors.length}`);
    
    if (htmlSource.includes('saved_trades')) {
      console.log('\n✅ NEW CODE CONFIRMED - saved_trades present in GitHub Pages');
    } else {
      console.log('\n❌ Old code - saved_trades NOT found');
    }
    
  } catch (err) {
    console.error(`❌ ${err.message}`);
  } finally {
    await browser.close();
  }
}

test();
