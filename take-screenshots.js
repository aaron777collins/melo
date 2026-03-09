/**
 * Screenshot capture for clawd-4t0 evidence
 * Takes screenshots of the registration page at 3 viewports
 */

const { chromium } = require('playwright');
const path = require('path');

const EVIDENCE_DIR = '/home/ubuntu/clawd/scheduler/evidence/clawd-4t0/screenshots';

const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 }
];

async function captureScreenshots() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  console.log('Browser launched, starting captures...');
  
  for (const viewport of viewports) {
    console.log(`\nCapturing ${viewport.name} (${viewport.width}x${viewport.height})...`);
    
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      ignoreHTTPSErrors: true
    });
    
    const page = await context.newPage();
    
    try {
      // Navigate to sign-up page
      await page.goto('https://dev2.aaroncollins.info/sign-up', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Wait for form to be visible
      await page.waitForSelector('[data-testid="username-input"]', { timeout: 10000 });
      
      // Take screenshot of empty form
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `${viewport.name}-empty.png`),
        fullPage: true
      });
      console.log(`  ✓ Saved ${viewport.name}-empty.png`);
      
      // Fill in some form data to show validation
      await page.fill('[data-testid="username-input"]', 'testuser123');
      await page.fill('[data-testid="password-input"]', 'TestPassword123');
      await page.fill('input[id="confirmPassword"]', 'TestPassword123');
      
      // Wait for any validation indicators
      await page.waitForTimeout(1000);
      
      // Take screenshot of filled form
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `${viewport.name}-filled.png`),
        fullPage: true
      });
      console.log(`  ✓ Saved ${viewport.name}-filled.png`);
      
    } catch (error) {
      console.error(`  ✗ Error capturing ${viewport.name}:`, error.message);
    }
    
    await context.close();
  }
  
  await browser.close();
  console.log('\n✅ Screenshot capture complete!');
}

captureScreenshots().catch(console.error);
