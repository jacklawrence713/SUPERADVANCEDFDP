#!/usr/bin/env node
/**
 * Production Save Trade Test
 * Tests the complete Save Trade workflow on live site
 * with error capture and detailed diagnostics
 */

import { chromium } from 'playwright';

async function test() {
  console.log('\n🔍 PRODUCTION SAVE TRADE TEST\n');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const logs = [];
  let consoleErrors = [];

  // Capture all console messages
  page.on('console', msg => {
    const logEntry = `[${msg.type()}] ${msg.text()}`;
    logs.push(logEntry);
    console.log(`  ${logEntry}`);

    if (msg.type() === 'error') {
      errors.push(msg.text());
      consoleErrors.push(msg.text());
    }
  });

  // Capture page errors
  page.on('pageerror', err => {
    const errMsg = `Page Error: ${err.message}`;
    errors.push(errMsg);
    consoleErrors.push(errMsg);
    console.log(`  ❌ ${errMsg}`);
  });

  try {
    console.log('→ Loading production site...');
    await page.goto('https://fantasydraftpros.com/#trade', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('✓ Site loaded\n');

    // Check for app crash
    const crash = await page.evaluate(() => {
      const fb = document.getElementById('fb');
      return fb?.textContent || null;
    });
    if (crash?.includes('CRASH')) {
      throw new Error(`App crashed: ${crash}`);
    }
    console.log('✓ No React crash\n');

    // Test 1: Verify saveTrade function exists
    console.log('→ TEST 1: Check if saveTrade function is defined');
    const saveTradeDefined = await page.evaluate(() => {
      try {
        return typeof window.saveTrade === 'function' || 'NOT GLOBAL';
      } catch (e) {
        return `Error: ${e.message}`;
      }
    });
    console.log(`  saveTrade global: ${saveTradeDefined}\n`);

    // Test 2: Analyze a trade (trigger saveTrade call)
    console.log('→ TEST 2: Click Analyze Trade button');
    const analyzeBtn = await page.locator('button').filter({ hasText: /Analyze/ }).first();

    if (await analyzeBtn.count() === 0) {
      throw new Error('Analyze button not found');
    }

    const beforeClick = consoleErrors.length;
    await analyzeBtn.click({ force: true });
    console.log('✓ Button clicked\n');

    // Monitor for errors during analysis
    console.log('→ TEST 3: Monitor for saveTrade errors during analysis');
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500);

      const pageText = await page.textContent('body');
      if (pageText.includes('Failed to save trade') || pageText.includes('saved_trades')) {
        console.log(`  ⚠ Database error detected at iteration ${i}`);
        break;
      }

      if (pageText.includes('Trade analyzed successfully')) {
        console.log(`  ✓ Analysis successful!`);
        break;
      }
    }

    const afterClick = consoleErrors.length;
    const newErrors = afterClick - beforeClick;
    console.log(`  New errors after click: ${newErrors}\n`);

    // Test 4: Check for saveTrade in code
    console.log('→ TEST 4: Search for saveTrade in page source');
    const pageSource = await page.content();
    const hasSaveTrade = pageSource.includes('saveTrade');
    console.log(`  saveTrade in source: ${hasSaveTrade}\n`);

    // Final report
    console.log('═══ ERROR REPORT ═══');
    if (consoleErrors.length > 0) {
      console.log(`Found ${consoleErrors.length} JavaScript errors:\n`);
      consoleErrors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    } else {
      console.log('No JavaScript errors detected ✓');
    }

    console.log('\n═══ DIAGNOSIS ═══');
    if (consoleErrors.some(e => e.includes('saveTrade'))) {
      console.log('ISSUE FOUND: saveTrade is referenced but not defined');
      console.log('CAUSE: Function scope or export issue');
      console.log('ACTION: Check TradeAnalyzer component scope');
    } else if (consoleErrors.some(e => e.includes('saved_trades'))) {
      console.log('ISSUE FOUND: saved_trades table not found in database');
      console.log('CAUSE: Database migration not applied');
      console.log('ACTION: Apply migration to Supabase');
    } else if (consoleErrors.length > 0) {
      console.log('OTHER ERRORS FOUND:');
      consoleErrors.forEach(e => console.log(`  - ${e}`));
    } else {
      console.log('✅ NO ERRORS - Save Trade workflow appears functional');
    }

  } catch (err) {
    console.error(`\n❌ Test error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

test();
