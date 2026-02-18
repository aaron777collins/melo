const { chromium } = require('@playwright/test');

async function debugForm() {
  console.log('Starting debug...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000/sign-in');
    await page.waitForLoadState('networkidle');

    // Check for all elements
    const username = await page.locator('[data-testid="username-input"]').count();
    const password = await page.locator('[data-testid="password-input"]').count();
    const loginButton = await page.locator('[data-testid="login-button"]').count();

    console.log(`Found elements:`);
    console.log(`- Username input: ${username}`);
    console.log(`- Password input: ${password}`);
    console.log(`- Login button: ${loginButton}`);

    // Get page content
    const content = await page.content();
    console.log(`\nPage contains data-testid attributes:`);
    console.log(`- username-input: ${content.includes('data-testid="username-input"')}`);
    console.log(`- password-input: ${content.includes('data-testid="password-input"')}`);
    console.log(`- login-button: ${content.includes('data-testid="login-button"')}`);

    // Check if page loaded correctly
    const title = await page.textContent('h1');
    console.log(`\nPage title: ${title}`);

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
}

debugForm().catch(console.error);