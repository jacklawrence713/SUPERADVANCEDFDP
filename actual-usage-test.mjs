import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('ACTUAL USAGE TEST - Try to use Trade Analyzer\n');
    
    await page.goto('https://fantasydraftpros.com/#trade', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    
    // Try to find and click the Analyze button
    const buttons = await page.locator('button').all();
    let analyzeBtn = null;
    
    for (let btn of buttons) {
      const text = await btn.textContent();
      if (text.includes('Analyze')) {
        analyzeBtn = btn;
        console.log('Found Analyze button: "' + text.trim() + '"\n');
        break;
      }
    }
    
    if (!analyzeBtn) {
      console.log('ERROR: Cannot find Analyze button');
      console.log('All buttons:', await Promise.all(buttons.map(b => b.textContent())));
      return;
    }
    
    // Check if button is enabled
    const isDisabled = await analyzeBtn.isDisabled();
    const isVisible = await analyzeBtn.isVisible();
    
    console.log('Button state:');
    console.log('  Disabled:', isDisabled);
    console.log('  Visible:', isVisible);
    console.log('  Can click:', !isDisabled && isVisible);
    
    if (!isDisabled && isVisible) {
      console.log('\nTrying to click Analyze button...');
      await analyzeBtn.click({ force: true });
      
      // Wait and check for any response
      await page.waitForTimeout(2000);
      
      const resultText = await page.textContent('body');
      console.log('After click - checking for analysis results...');
      console.log('  Has "Analyzing":', resultText.includes('Analyzing'));
      console.log('  Has "Fair Trade":', resultText.includes('Fair Trade'));
      console.log('  Has "Overpay":', resultText.includes('Overpay'));
      console.log('  Has error:', resultText.includes('error') || resultText.includes('Error'));
      
      // Get actual response
      console.log('\nPage text sample after click:');
      const sample = resultText.substring(0, 300);
      console.log(sample);
    }
    
  } catch (err) {
    console.error('TEST FAILED:', err.message);
  } finally {
    await browser.close();
  }
}

await test();
