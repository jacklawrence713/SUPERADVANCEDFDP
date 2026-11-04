import { chromium } from 'playwright';

async function testURL(url, name) {
  console.log(`\n📍 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1500);
    
    const results = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasAnalyzeButton: bodyText.includes('Analyze') || document.querySelectorAll('button').length > 0,
        hasSavedTrades: document.querySelectorAll('[class*="Trade"], [class*="trade"], [class*="History"]').length > 0,
        pageLength: document.body.innerText.length,
        hasError: document.body.innerText.includes('error') || document.body.innerText.includes('Error'),
      };
    });
    
    console.log(`   ✓ Loaded`);
    console.log(`   Page size: ${results.pageLength} chars`);
    console.log(`   Has Analyze button: ${results.hasAnalyzeButton}`);
    console.log(`   Has Trade components: ${results.hasSavedTrades}`);
    console.log(`   Errors: ${results.hasError ? 'YES' : 'NO'}`);
    
    return results;
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return null;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('=== FUNCTIONAL COMPARISON ===');
  
  const ghPages = await testURL(
    'https://jacklawrencecmg.github.io/ADVANCEDFANTASYDRAFTPROS/',
    'GitHub Pages (Direct)'
  );
  
  const customDomain = await testURL(
    'https://fantasydraftpros.com/',
    'Custom Domain'
  );
  
  console.log('\n=== SUMMARY ===');
  console.log(`GitHub Pages page size: ${ghPages?.pageLength || 'N/A'} chars`);
  console.log(`Custom domain page size: ${customDomain?.pageLength || 'N/A'} chars`);
  if (ghPages?.pageLength !== customDomain?.pageLength) {
    console.log(`⚠️  DIFFERENT PAGE SIZES - Different deployments confirmed`);
  }
}

main();
