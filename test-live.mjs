import { chromium } from 'playwright';

async function test() {
  console.log('🧪 TESTING LIVE SITE: fantasydraftpros.com');
  console.log('═══════════════════════════════════════════════\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  try {
    // Navigate to live site
    console.log('→ Loading https://fantasydraftpros.com/#trade');
    await page.goto('https://fantasydraftpros.com/#trade', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('✓ Site loaded\n');
    
    // Check for app crash
    const appState = await page.evaluate(() => {
      const fb = document.getElementById('fb');
      return {
        crashed: fb?.textContent?.substring(0, 100) || null,
        bodyLength: document.body.innerText.length
      };
    });
    
    if (appState.crashed) {
      console.log(`❌ APP CRASHED: ${appState.crashed}`);
      return { success: false };
    }
    console.log(`✓ App healthy (${appState.bodyLength} chars loaded)`);
    
    // Check for key elements
    const inputs = await page.locator('input[placeholder*="Search"]').all();
    console.log(`✓ Found ${inputs.length} search inputs`);
    
    const buttons = await page.locator('button').all();
    console.log(`✓ Found ${buttons.length} total buttons`);
    
    let analyzeBtn = null;
    let analyzeBtnText = '';
    for (let btn of buttons) {
      const text = await btn.textContent();
      if (text.includes('Unlock') || (text.includes('Analyze') && text.length < 30)) {
        analyzeBtn = btn;
        analyzeBtnText = text.trim().substring(0, 50);
        break;
      }
    }
    
    if (analyzeBtn) {
      console.log(`✓ Main button found: "${analyzeBtnText}"`);
    } else {
      console.log('❌ Main analyze button not found');
    }
    
    // Check page content
    const pageText = await page.textContent('body');
    const hasTeamA = pageText.includes('Team A');
    const hasTeamB = pageText.includes('Team B');
    const hasSearchPlayers = pageText.includes('Search players');
    
    console.log('\n→ Critical elements:');
    console.log(`  Team A section: ${hasTeamA ? '✓' : '❌'}`);
    console.log(`  Team B section: ${hasTeamB ? '✓' : '❌'}`);
    console.log(`  Search input placeholder: ${hasSearchPlayers ? '✓' : '❌'}`);
    
    console.log(`\n→ Console errors: ${errors.length}`);
    const relevantErrors = errors.filter(e => !e.includes('400') && !e.includes('Failed to load resource'));
    if (relevantErrors.length > 0) {
      relevantErrors.slice(0, 3).forEach(e => {
        console.log(`  ⚠ ${e.substring(0, 80)}`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════');
    const success = hasTeamA && hasTeamB && hasSearchPlayers && analyzeBtn && relevantErrors.length === 0;
    console.log(`Status: ${success ? '✅ PASS - Trade Analyzer WORKING' : '⚠️ ISSUES DETECTED'}`);
    console.log('═══════════════════════════════════════════════');
    
    return { success };
    
  } catch (err) {
    console.error(`\n❌ Test error: ${err.message}`);
    return { success: false };
  } finally {
    await browser.close();
  }
}

await test();
