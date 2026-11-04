import { chromium } from 'playwright';

async function test() {
  console.log('🧪 TESTING RESTORED APPLICATION\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  try {
    console.log('→ Loading https://fantasydraftpros.com/');
    await page.goto('https://fantasydraftpros.com/', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded\n');
    
    // Test 1: Check for crashes
    console.log('TEST 1: Check for React errors');
    const crash = await page.evaluate(() => {
      const fb = document.getElementById('fb');
      return fb?.textContent || null;
    });
    if (crash) {
      console.log(`❌ CRASH DETECTED: ${crash}`);
      return { success: false, error: 'React crash' };
    }
    console.log('✅ No React crashes\n');
    
    // Test 2: Check for Trade Analyzer tab
    console.log('TEST 2: Verify Trade Analyzer tab');
    const hasTrade = await page.evaluate(() => {
      return document.body.innerText.includes('Trade') || 
             Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Trade'));
    });
    if (!hasTrade) {
      console.log('❌ Trade Analyzer not found');
      return { success: false, error: 'No Trade Analyzer' };
    }
    console.log('✅ Trade Analyzer present\n');
    
    // Test 3: Check core functionality elements
    console.log('TEST 3: Verify core UI elements');
    const elements = await page.evaluate(() => {
      return {
        hasButtons: document.querySelectorAll('button').length > 0,
        hasInputs: document.querySelectorAll('input').length > 0,
        hasCharts: document.querySelectorAll('canvas, svg').length > 0,
        bodyLength: document.body.innerText.length
      };
    });
    console.log(`  Buttons: ${elements.hasButtons ? '✅' : '❌'}`);
    console.log(`  Inputs: ${elements.hasInputs ? '✅' : '❌'}`);
    console.log(`  Content size: ${elements.bodyLength} chars`);
    console.log();
    
    // Test 4: Check for JavaScript errors
    console.log('TEST 4: JavaScript console errors');
    console.log(`  Total errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('  Errors:');
      errors.slice(0, 3).forEach(e => console.log(`    - ${e.substring(0, 80)}`));
    } else {
      console.log('  ✅ No JavaScript errors');
    }
    console.log();
    
    // Test 5: Check if app can navigate to trade tab
    console.log('TEST 5: Navigate to Trade Analyzer tab');
    await page.goto('https://fantasydraftpros.com/#trade', { waitUntil: 'load', timeout: 10000 });
    await page.waitForTimeout(1500);
    const tradePageText = await page.textContent('body');
    const hasAnalyzeButton = tradePageText.includes('Analyze');
    console.log(`  Analyze button: ${hasAnalyzeButton ? '✅' : '❌'}`);
    console.log();
    
    console.log('═══ FINAL STATUS ═══');
    const isHealthy = !crash && hasTrade && elements.hasButtons && hasAnalyzeButton && errors.length < 3;
    console.log(isHealthy ? '✅ APP HEALTHY' : '⚠️  APP HAS ISSUES');
    
    return { 
      success: isHealthy,
      details: {
        crash: crash ? 'YES' : 'NO',
        tradeAnalyzer: hasTrade ? 'YES' : 'NO',
        buttons: elements.hasButtons ? 'YES' : 'NO',
        analyzeButton: hasAnalyzeButton ? 'YES' : 'NO',
        jsErrors: errors.length
      }
    };
    
  } catch (err) {
    console.error(`\n❌ TEST FAILED: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    await browser.close();
  }
}

const result = await test();
process.exit(result.success ? 0 : 1);
