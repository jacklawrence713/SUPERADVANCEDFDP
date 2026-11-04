import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://fantasydraftpros.com/#trade', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    
    // Get the actual full page state
    const state = await page.evaluate(() => ({
      title: document.title,
      currentPage: window.location.hash,
      hasOnboarding: !!document.querySelector('[class*="onboard"], [class*="tutorial"], [class*="welcome"]'),
      tradeInputs: document.querySelectorAll('input[type="text"]').length,
      allInputs: document.querySelectorAll('input').length,
      teamAInputs: document.querySelectorAll('[class*="Team A"], [class*="team-a"]').length,
      teamBInputs: document.querySelectorAll('[class*="Team B"], [class*="team-b"]').length,
      analyzeButton: {
        text: Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analyze'))?.textContent,
        disabled: Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analyze'))?.disabled,
        onclick: Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analyze'))?.onclick?.toString()
      },
      fullPageHtml: document.documentElement.outerHTML.substring(0, 1000)
    }));
    
    console.log('DETAILED PAGE STATE:\n');
    console.log('Title:', state.title);
    console.log('Hash:', state.currentPage);
    console.log('Onboarding screen shown:', state.hasOnboarding);
    console.log('Trade inputs found:', state.tradeInputs);
    console.log('All inputs:', state.allInputs);
    console.log('Team A inputs:', state.teamAInputs);
    console.log('Team B inputs:', state.teamBInputs);
    console.log('\nAnalyze Button:');
    console.log('  Text:', state.analyzeButton.text);
    console.log('  Disabled:', state.analyzeButton.disabled);
    console.log('  Has onclick:', state.analyzeButton.onclick ? 'YES' : 'NO');
    
  } finally {
    await browser.close();
  }
}

await test();
