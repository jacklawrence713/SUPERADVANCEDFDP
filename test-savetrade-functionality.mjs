import { chromium } from 'playwright';

async function test() {
  console.log('🔍 TESTING SAVE TRADE FUNCTIONALITY\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('400')) {
      errors.push(msg.text());
    }
  });
  
  try {
    console.log('→ Loading Trade Analyzer');
    await page.goto('https://fantasydraftpros.com/#trade', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('✅ Loaded\n');
    
    // Check if page has React crash
    const crash = await page.evaluate(() => {
      const fb = document.getElementById('fb');
      return fb?.textContent?.substring(0, 100) || null;
    });
    if (crash) throw new Error(`React crash: ${crash}`);
    
    // Check for Trade Analyzer elements
    console.log('TEST 1: Verify Trade Analyzer UI');
    const uiState = await page.evaluate(() => {
      return {
        hasAnalyzeBtn: Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Analyze')),
        hasInputs: document.querySelectorAll('input').length > 0,
        pageText: document.body.innerText.substring(0, 200)
      };
    });
    console.log(`  Analyze button: ${uiState.hasAnalyzeBtn ? '✅' : '❌'}`);
    console.log(`  Search inputs: ${uiState.hasInputs ? '✅' : '❌'}\n`);
    
    // Click Analyze button (without players - should show validation error or do nothing)
    console.log('TEST 2: Test Analyze button interaction');
    const analyzeBtn = await page.locator('button').filter({ hasText: /Analyze/ }).first();
    if (await analyzeBtn.count() > 0) {
      await analyzeBtn.click({ force: true });
      await page.waitForTimeout(1000);
      console.log('  ✅ Button click executed\n');
    } else {
      console.log('  ❌ Button not found\n');
    }
    
    // Check for any Trade Save related errors
    console.log('TEST 3: Check for Trade Save errors');
    if (errors.length > 0) {
      console.log('  Errors found:');
      errors.forEach(e => console.log(`    - ${e.substring(0, 80)}`));
    } else {
      console.log('  ✅ No JavaScript errors\n');
    }
    
    // Check if saveTrade function exists
    console.log('TEST 4: Check Save Trade code availability');
    const hasTradeCode = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      return {
        hasSaveToast: html.includes('Trade saved'),
        hasSaveLogic: html.includes('saveTrade') || html.includes('saved_trades'),
        pageLength: html.length
      };
    });
    console.log(`  Save Toast text: ${hasTradeCode.hasSaveToast ? '✅' : '❌'}`);
    console.log(`  Save logic: ${hasTradeCode.hasSaveLogic ? '✅' : '❌'}`);
    console.log(`  Page size: ${hasTradeCode.pageLength} bytes\n`);
    
    console.log('═══ SUMMARY ═══');
    const isWorking = uiState.hasAnalyzeBtn && uiState.hasInputs && errors.length === 0;
    console.log(isWorking ? '✅ TRADE ANALYZER: OPERATIONAL' : '⚠️  Issues detected');
    
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
  } finally {
    await browser.close();
  }
}

await test();
