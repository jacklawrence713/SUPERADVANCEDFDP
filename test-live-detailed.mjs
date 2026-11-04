import { chromium } from 'playwright';

async function test() {
  console.log('🧪 DETAILED LIVE SITE TEST\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://fantasydraftpros.com/#trade', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Get all buttons
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map((b, i) => ({
        index: i,
        text: b.textContent.trim().substring(0, 40),
        enabled: !b.disabled,
        visible: b.offsetParent !== null
      }));
    });
    
    console.log('All buttons (first 30):');
    buttons.slice(0, 30).forEach(b => {
      console.log(`  ${b.index.toString().padStart(2)}: "${b.text}" ${b.enabled ? '✓' : '✗'}`);
    });
    
    // Look for specific buttons
    const unlockBtn = buttons.find(b => b.text.includes('Unlock'));
    const analyzeTradeBtn = buttons.find(b => b.text.includes('Analyze Trade'));
    const saveTradeBtn = buttons.find(b => b.text.includes('Save'));
    
    console.log('\n→ Critical buttons:');
    console.log(`  "Unlock/Analyze" main button: ${unlockBtn ? `✓ (index ${unlockBtn.index})` : '❌'}`);
    console.log(`  "Analyze Trade" text: ${analyzeTradeBtn ? '✓' : '❌'}`);
    console.log(`  "Save Trade" button: ${saveTradeBtn ? `✓ (index ${saveTradeBtn.index})` : '❌'}`);
    
    // Check for key content
    const content = await page.textContent('body');
    const checks = {
      'Team A': content.includes('Team A'),
      'Team B': content.includes('Team B'),
      'FAAB Money': content.includes('FAAB'),
      'Search': content.includes('Search'),
      'Analyze': content.includes('Analyze'),
      'Fair Trade': content.includes('Fair Trade'),
      'Overpay': content.includes('Overpay')
    };
    
    console.log('\n→ Content checks:');
    Object.entries(checks).forEach(([key, present]) => {
      console.log(`  "${key}": ${present ? '✓' : '❌'}`);
    });
    
    // Try clicking the analyze button if found
    if (unlockBtn || analyzeTradeBtn) {
      const btn = unlockBtn || analyzeTradeBtn;
      console.log(`\n→ Attempting to interact with button at index ${btn.index}...`);
      
      const btnElement = await page.locator(`button`).nth(btn.index);
      await btnElement.click({ force: true });
      await page.waitForTimeout(500);
      
      const afterClick = await page.textContent('body');
      console.log(`  After click:`);
      console.log(`    Contains "Analyzing": ${afterClick.includes('Analyzing') ? '✓' : '❌'}`);
      console.log(`    Contains "upgrade": ${afterClick.includes('upgrade') ? '⚠️ (quota message)' : '✓'}`);
    }
    
    console.log('\n═══════════════════════════════════════════════');
    const hasCore = checks['Team A'] && checks['Team B'] && (unlockBtn || analyzeTradeBtn);
    console.log(`Final Status: ${hasCore ? '✅ WORKING' : '❌ ISSUES'}`);
    console.log('═══════════════════════════════════════════════');
    
  } catch (err) {
    console.error(`Error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

await test();
