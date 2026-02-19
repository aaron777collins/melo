const { chromium } = require('playwright');

async function takeInteractiveScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Navigate to main app (likely shows login redirect or main interface)
    await page.goto('http://localhost:3100/');
    await page.waitForTimeout(3000); // Wait for page to load

    // Check if we can find any interactive elements for screenshots
    // Try to find Add Server button or similar elements
    try {
      const addServerButton = await page.locator('[data-testid*="add"], [aria-label*="Add"], button:has-text("Add")').first();
      if (await addServerButton.isVisible()) {
        await addServerButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: './docs/visual-audit/phase-4-screenshots/melo-server-creation.png' });
        console.log('Server creation screenshot captured');
      }
    } catch (e) {
      console.log('Could not capture server creation:', e.message);
    }

    // Try to find settings button
    try {
      const settingsButton = await page.locator('[data-testid*="settings"], [aria-label*="Settings"], button:has-text("Settings")').first();
      if (await settingsButton.isVisible()) {
        await settingsButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: './docs/visual-audit/phase-4-screenshots/melo-user-settings.png' });
        console.log('User settings screenshot captured');
      }
    } catch (e) {
      console.log('Could not capture user settings:', e.message);
    }

    // Try to capture member list (likely a sidebar)
    try {
      const memberList = await page.locator('[data-testid*="member"], [aria-label*="Member"], aside, .sidebar').first();
      if (await memberList.isVisible()) {
        await page.screenshot({ path: './docs/visual-audit/phase-4-screenshots/melo-member-list.png' });
        console.log('Member list screenshot captured');
      }
    } catch (e) {
      console.log('Could not capture member list:', e.message);
    }

    // Try to find invite button
    try {
      const inviteButton = await page.locator('[data-testid*="invite"], [aria-label*="Invite"], button:has-text("Invite")').first();
      if (await inviteButton.isVisible()) {
        await inviteButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: './docs/visual-audit/phase-4-screenshots/melo-invite-modal.png' });
        console.log('Invite modal screenshot captured');
      }
    } catch (e) {
      console.log('Could not capture invite modal:', e.message);
    }

    // Try to find server settings (might need to be on a server first)
    try {
      const serverSettingsButton = await page.locator('[data-testid*="server-settings"], [aria-label*="Server Settings"]').first();
      if (await serverSettingsButton.isVisible()) {
        await serverSettingsButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: './docs/visual-audit/phase-4-screenshots/melo-server-settings.png' });
        console.log('Server settings screenshot captured');
      }
    } catch (e) {
      console.log('Could not capture server settings:', e.message);
    }

  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

takeInteractiveScreenshots();