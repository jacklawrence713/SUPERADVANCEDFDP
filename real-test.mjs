import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const allMessages = [];
  page.on('console', msg => allMessages.push(`[${msg.type()}] ${msg.text()}`));
  
  try {
    console.log('Loading https://fantasydraftpros.com/#trade\n');
    await page.goto('https://fantasydraftpros.com/#trade', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    
    const pageState = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      body: document.body.innerText.substring(0, 500),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t),
      errors: document.querySelectorAll('[role="alert"], .error, [class*="error"]').length,
      hasContent: document.body.innerText.length
    }));
    
    console.log('PAGE STATE:');
    console.log('  Title:', pageState.title);
    console.log('  URL:', pageState.url);
    console.log('  Has content:', pageState.hasContent, 'chars');
    console.log('  Error elements:', pageState.errors);
    console.log('\nBUTTONS FOUND:');
    pageState.buttons.slice(0, 10).forEach(b => console.log('  -', b));
    
    console.log('\nCONSOLE MESSAGES:');
    allMessages.forEach(m => console.log('  ' + m));
    
    console.log('\nPAGE TEXT (first 500 chars):');
    console.log(pageState.body);
    
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await browser.close();
  }
}

await test();
