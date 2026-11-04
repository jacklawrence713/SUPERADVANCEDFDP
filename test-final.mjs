import { chromium } from 'playwright';

async function test() {
  console.log('✅ LIVE SITE - TRADE ANALYZER VERIFICATION\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('Loading fantasydraftpros.com...');
    await page.goto('https://fantasydraftpros.com/#trade', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    
    const result = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Find the MAIN analyze button (Unlock Unlimited Trades OR Analyze Trade as primary button)
      // The main button is wider and has a specific style
      const mainAnalyzeBtn = buttons.find(b => {
        const text = b.textContent.trim();
        const style = window.getComputedStyle(b);
        const isMainButton = b.offsetWidth > 200 && b.offsetHeight > 40; // Main buttons are larger
        return isMainButton && (text.includes('Unlock') || text === 'Analyze Trade');
      });
      
      // Check for save button
      const saveBtn = buttons.find(b => b.textContent.includes('Save') && b.textContent.length < 30);
      
      return {
        appOk: !document.getElementById('fb'),
        teamA: document.body.innerText.includes('Team A'),
        teamB: document.body.innerText.includes('Team B'),
        mainBtn: mainAnalyzeBtn ? mainAnalyzeBtn.textContent.trim().substring(0, 40) : null,
        mainBtnFound: !!mainAnalyzeBtn,
        mainBtnEnabled: mainAnalyzeBtn ? !mainAnalyzeBtn.disabled : false,
        saveBtn: saveBtn ? saveBtn.textContent.trim() : null,
        searchInputs: document.querySelectorAll('input[placeholder*="Search"]').length,
        allButtons: buttons.map(b => b.textContent.trim().substring(0, 30))
      };
    });
    
    console.log('\n📊 RESULTS:\n');
    console.log(`✅ App Health: ${result.appOk ? 'GOOD' : 'CRASHED'}`);
    console.log(`✅ Team A visible: ${result.teamA}`);
    console.log(`✅ Team B visible: ${result.teamB}`);
    console.log(`✅ Search inputs: ${result.searchInputs}`);
    console.log(`✅ Main Analyze button: ${result.mainBtnFound ? `FOUND - "${result.mainBtn}"` : 'NOT FOUND'}`);
    console.log(`✅ Button enabled: ${result.mainBtnEnabled}`);
    console.log(`✅ Save Trade button: ${result.saveBtn || 'NOT YET (renders after analysis)'}`);
    
    console.log('\n🎯 All buttons on page:');
    result.allButtons.slice(0, 25).forEach((text, i) => {
      console.log(`   ${i.toString().padStart(2)}: ${text}`);
    });
    
    const isWorking = result.appOk && result.teamA && result.teamB && result.mainBtnFound && result.mainBtnEnabled && result.searchInputs >= 2;
    
    console.log('\n' + '═'.repeat(50));
    console.log(isWorking ? '✅ TRADE ANALYZER IS LIVE AND WORKING' : '⚠️  ISSUES DETECTED');
    console.log('═'.repeat(50));
    
  } catch (err) {
    console.error(`Error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

await test();
