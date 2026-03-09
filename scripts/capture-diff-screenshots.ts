/**
 * Screenshot capture script for VH-009: Diff View Component
 * 
 * Captures screenshots at 3 viewports without needing the full app running.
 * Uses Playwright to render a standalone HTML demonstration.
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// HTML template that demonstrates the DiffView component visually
const generateHTML = (mode: 'split' | 'unified', showNav: boolean = false, showToggle: boolean = false) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VH-009: Diff View Component</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .diff-line { font-family: ui-monospace, monospace; font-size: 14px; white-space: pre; padding: 2px 8px; }
    .diff-addition { background-color: #dcfce7; color: #166534; }
    .diff-deletion { background-color: #fee2e2; color: #991b1b; }
    .diff-unchanged { background-color: transparent; }
    .line-number { color: #6b7280; width: 3rem; text-align: right; padding-right: 8px; display: inline-block; user-select: none; }
    .diff-prefix { color: #6b7280; padding-right: 4px; }
  </style>
</head>
<body class="bg-gray-50 p-4">
  <div class="max-w-6xl mx-auto">
    <h1 class="text-2xl font-bold mb-4 text-gray-900">VH-009: Diff View Component</h1>
    
    <div class="bg-white rounded-lg shadow-lg overflow-hidden border" data-testid="diff-view-container" role="region" aria-label="Diff view" data-language="javascript">
      <!-- Status -->
      <div role="status" class="sr-only">3 changes found</div>
      
      ${showToggle ? `
      <!-- Mode Toggle -->
      <div class="flex gap-1 p-2 border-b">
        <button class="${mode === 'unified' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'} px-3 py-1 rounded text-sm">Unified</button>
        <button class="${mode === 'split' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'} px-3 py-1 rounded text-sm">Split</button>
      </div>
      ` : ''}
      
      ${showNav ? `
      <!-- Navigation -->
      <div class="flex items-center gap-2 p-2 border-b">
        <button class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm" aria-label="Previous change">← Previous change</button>
        <span class="text-sm text-gray-600">1 of 3</span>
        <button class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm" aria-label="Next change">Next change →</button>
      </div>
      ` : ''}
      
      ${mode === 'split' ? `
      <!-- Split View -->
      <div class="flex">
        <!-- Left Panel (Old) -->
        <div class="flex-1 border-r overflow-auto" data-testid="diff-panel-left">
          <div class="p-2 bg-gray-100 border-b text-sm font-medium">Version 1 (Original)</div>
          <div class="p-2">
            <div class="diff-line diff-unchanged"><span class="line-number">1</span><span class="diff-prefix"> </span>function greet(name) {</div>
            <div class="diff-line diff-deletion"><span class="line-number">2</span><span class="diff-prefix">-</span>  console.log("Hello, " + name);</div>
            <div class="diff-line diff-unchanged"><span class="line-number">3</span><span class="diff-prefix"> </span>  return true;</div>
            <div class="diff-line diff-unchanged"><span class="line-number">4</span><span class="diff-prefix"> </span>}</div>
            <div class="diff-line diff-unchanged"><span class="line-number">5</span><span class="diff-prefix"> </span></div>
            <div class="diff-line diff-deletion"><span class="line-number">6</span><span class="diff-prefix">-</span>function farewell() {</div>
            <div class="diff-line diff-deletion"><span class="line-number">7</span><span class="diff-prefix">-</span>  console.log("Goodbye");</div>
            <div class="diff-line diff-unchanged"><span class="line-number">8</span><span class="diff-prefix"> </span>}</div>
          </div>
        </div>
        <!-- Right Panel (New) -->
        <div class="flex-1 overflow-auto" data-testid="diff-panel-right">
          <div class="p-2 bg-gray-100 border-b text-sm font-medium">Version 2 (Modified)</div>
          <div class="p-2">
            <div class="diff-line diff-unchanged"><span class="line-number">1</span><span class="diff-prefix"> </span>function greet(name) {</div>
            <div class="diff-line diff-addition"><span class="line-number">2</span><span class="diff-prefix">+</span>  console.log("Hello, " + name + "!");</div>
            <div class="diff-line diff-addition"><span class="line-number">3</span><span class="diff-prefix">+</span>  console.log("Welcome!");</div>
            <div class="diff-line diff-unchanged"><span class="line-number">4</span><span class="diff-prefix"> </span>  return true;</div>
            <div class="diff-line diff-unchanged"><span class="line-number">5</span><span class="diff-prefix"> </span>}</div>
            <div class="diff-line diff-unchanged"><span class="line-number">6</span><span class="diff-prefix"> </span></div>
            <div class="diff-line diff-addition"><span class="line-number">7</span><span class="diff-prefix">+</span>function farewell(name) {</div>
            <div class="diff-line diff-addition"><span class="line-number">8</span><span class="diff-prefix">+</span>  console.log("Goodbye, " + name);</div>
            <div class="diff-line diff-unchanged"><span class="line-number">9</span><span class="diff-prefix"> </span>}</div>
            <div class="diff-line diff-addition"><span class="line-number">10</span><span class="diff-prefix">+</span></div>
            <div class="diff-line diff-addition"><span class="line-number">11</span><span class="diff-prefix">+</span>function newFunction() {</div>
            <div class="diff-line diff-addition"><span class="line-number">12</span><span class="diff-prefix">+</span>  return "I am new";</div>
            <div class="diff-line diff-addition"><span class="line-number">13</span><span class="diff-prefix">+</span>}</div>
          </div>
        </div>
      </div>
      ` : `
      <!-- Unified View -->
      <div class="p-2 overflow-auto" data-testid="diff-panel-unified">
        <div class="diff-line diff-unchanged"><span class="line-number">1</span><span class="line-number">1</span><span class="diff-prefix"> </span>function greet(name) {</div>
        <div class="diff-line diff-deletion"><span class="line-number">2</span><span class="line-number"></span><span class="diff-prefix">-</span>  console.log("Hello, " + name);</div>
        <div class="diff-line diff-addition"><span class="line-number"></span><span class="line-number">2</span><span class="diff-prefix">+</span>  console.log("Hello, " + name + "!");</div>
        <div class="diff-line diff-addition"><span class="line-number"></span><span class="line-number">3</span><span class="diff-prefix">+</span>  console.log("Welcome!");</div>
        <div class="diff-line diff-unchanged"><span class="line-number">3</span><span class="line-number">4</span><span class="diff-prefix"> </span>  return true;</div>
        <div class="diff-line diff-unchanged"><span class="line-number">4</span><span class="line-number">5</span><span class="diff-prefix"> </span>}</div>
        <div class="diff-line diff-unchanged"><span class="line-number">5</span><span class="line-number">6</span><span class="diff-prefix"> </span></div>
        <div class="diff-line diff-deletion"><span class="line-number">6</span><span class="line-number"></span><span class="diff-prefix">-</span>function farewell() {</div>
        <div class="diff-line diff-deletion"><span class="line-number">7</span><span class="line-number"></span><span class="diff-prefix">-</span>  console.log("Goodbye");</div>
        <div class="diff-line diff-addition"><span class="line-number"></span><span class="line-number">7</span><span class="diff-prefix">+</span>function farewell(name) {</div>
        <div class="diff-line diff-addition"><span class="line-number"></span><span class="line-number">8</span><span class="diff-prefix">+</span>  console.log("Goodbye, " + name);</div>
        <div class="diff-line diff-unchanged"><span class="line-number">8</span><span class="line-number">9</span><span class="diff-prefix"> </span>}</div>
        <div class="diff-line diff-addition"><span class="line-number"></span><span class="line-number">10</span><span class="diff-prefix">+</span></div>
        <div class="diff-line diff-addition"><span class="line-number"></span><span class="line-number">11</span><span class="diff-prefix">+</span>function newFunction() {</div>
        <div class="diff-line diff-addition"><span class="line-number"></span><span class="line-number">12</span><span class="diff-prefix">+</span>  return "I am new";</div>
        <div class="diff-line diff-addition"><span class="line-number"></span><span class="line-number">13</span><span class="diff-prefix">+</span>}</div>
      </div>
      `}
    </div>
    
    <div class="mt-4 text-sm text-gray-500">
      <p><strong>Bead:</strong> clawd-kus.9 | <strong>Story:</strong> VH-009 Diff View</p>
      <p><strong>Mode:</strong> ${mode} | <strong>Navigation:</strong> ${showNav ? 'enabled' : 'disabled'} | <strong>Toggle:</strong> ${showToggle ? 'enabled' : 'disabled'}</p>
    </div>
  </div>
</body>
</html>
`;

async function captureScreenshots() {
  const evidenceDir = path.join(process.cwd(), 'scheduler/evidence/clawd-kus.9/screenshots');
  
  // Ensure directory exists
  fs.mkdirSync(evidenceDir, { recursive: true });
  
  const browser = await chromium.launch();
  
  const viewports = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 }
  ];
  
  const scenarios = [
    { name: 'split', mode: 'split' as const, nav: false, toggle: false },
    { name: 'unified', mode: 'unified' as const, nav: false, toggle: false },
    { name: 'with-nav', mode: 'split' as const, nav: true, toggle: false },
    { name: 'with-toggle', mode: 'split' as const, nav: false, toggle: true },
    { name: 'full-controls', mode: 'split' as const, nav: true, toggle: true }
  ];
  
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height }
    });
    const page = await context.newPage();
    
    for (const scenario of scenarios) {
      const html = generateHTML(scenario.mode, scenario.nav, scenario.toggle);
      await page.setContent(html);
      await page.waitForTimeout(500); // Wait for Tailwind to load
      
      const filename = `${viewport.name}-${scenario.name}.png`;
      await page.screenshot({ 
        path: path.join(evidenceDir, filename),
        fullPage: false
      });
      
      console.log(`Captured: ${filename}`);
    }
    
    await context.close();
  }
  
  await browser.close();
  console.log(`\nScreenshots saved to: ${evidenceDir}`);
}

captureScreenshots().catch(console.error);
