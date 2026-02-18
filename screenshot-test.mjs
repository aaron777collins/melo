import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

console.log('Navigating...');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

console.log('Taking screenshot...');
await page.screenshot({ path: '/tmp/melo-fresh.png', fullPage: true });
console.log('Done');

await browser.close();
