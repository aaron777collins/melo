#!/usr/bin/env node

/**
 * Real-time Performance Monitor for Melo v2
 * Monitors application performance during runtime
 */

const puppeteer = require('puppeteer').default || require('puppeteer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class RealtimeMonitor {
  constructor() {
    this.resultsDir = path.join(__dirname, 'results');
    this.projectRoot = path.join(__dirname, '..');
    this.serverProcess = null;
    this.browser = null;
    this.page = null;
    this.metrics = [];
    this.startTime = Date.now();
    
    this.ensureResultsDir();
  }

  ensureResultsDir() {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }

  async startServer() {
    this.log('Starting Next.js development server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      this.serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Ready') || output.includes('localhost:3000')) {
          this.log('Server is ready');
          resolve();
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error(data.toString());
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          reject(new Error('Server startup timed out'));
        }
      }, 60000);
    });
  }

  async initializeBrowser() {
    this.log('Launching browser for performance monitoring...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Enable performance monitoring
    await this.page._client.send('Performance.enable');
    await this.page._client.send('Runtime.enable');
  }

  async navigateToApp() {
    this.log('Navigating to application...');
    
    const startNavigate = Date.now();
    await this.page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    const endNavigate = Date.now();

    const navigationTime = endNavigate - startNavigate;
    this.log(`Navigation completed in ${navigationTime}ms`);

    return { navigationTime };
  }

  async measurePageLoadMetrics() {
    this.log('Measuring page load metrics...');
    
    // Get performance metrics
    const performanceMetrics = await this.page._client.send('Performance.getMetrics');
    
    // Get paint metrics from Navigation Timing API
    const paintMetrics = await this.page.evaluate(() => {
      return {
        domContentLoaded: performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd || 0,
        loadComplete: performance.getEntriesByType('navigation')[0]?.loadEventEnd || 0,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        largestContentfulPaint: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0
      };
    });

    // Get memory usage
    const memoryInfo = await this.page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    const metrics = {
      timestamp: Date.now(),
      performanceMetrics: performanceMetrics.metrics,
      paintMetrics,
      memoryInfo
    };

    this.metrics.push(metrics);
    return metrics;
  }

  async simulateUserInteractions() {
    this.log('Simulating user interactions...');
    
    const interactions = [];
    
    try {
      // Wait for app to load
      await this.page.waitForSelector('body', { timeout: 10000 });
      
      // Measure initial state
      const initialMetrics = await this.measurePageLoadMetrics();
      interactions.push({
        action: 'page_load',
        timestamp: Date.now(),
        metrics: initialMetrics
      });

      // Try to find and interact with common UI elements
      const selectors = [
        'button', 'a[href]', 'input', '[role="button"]',
        '.button', '.btn', '[data-testid]'
      ];

      for (const selector of selectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            // Click the first interactive element
            const startInteraction = Date.now();
            await elements[0].click();
            await this.page.waitForTimeout(1000); // Wait for response
            const endInteraction = Date.now();
            
            const postInteractionMetrics = await this.measurePageLoadMetrics();
            interactions.push({
              action: `click_${selector}`,
              timestamp: Date.now(),
              duration: endInteraction - startInteraction,
              metrics: postInteractionMetrics
            });
            
            break; // Only test one interaction type
          }
        } catch (error) {
          // Continue to next selector if this one fails
        }
      }

      // Test scrolling performance
      const startScroll = Date.now();
      await this.page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      });
      await this.page.waitForTimeout(2000);
      const endScroll = Date.now();

      const postScrollMetrics = await this.measurePageLoadMetrics();
      interactions.push({
        action: 'scroll_to_bottom',
        timestamp: Date.now(),
        duration: endScroll - startScroll,
        metrics: postScrollMetrics
      });

    } catch (error) {
      this.log(`Error during user interaction simulation: ${error.message}`, 'warn');
    }

    return interactions;
  }

  async measureNetworkPerformance() {
    this.log('Measuring network performance...');
    
    const networkMetrics = {
      requests: [],
      totalRequests: 0,
      failedRequests: 0,
      totalTransferSize: 0,
      totalDuration: 0
    };

    // Set up request interception
    await this.page.setRequestInterception(true);

    this.page.on('request', (request) => {
      networkMetrics.totalRequests++;
      request.continue();
    });

    this.page.on('requestfailed', (request) => {
      networkMetrics.failedRequests++;
    });

    this.page.on('response', (response) => {
      const request = response.request();
      networkMetrics.requests.push({
        url: request.url(),
        method: request.method(),
        status: response.status(),
        headers: Object.keys(response.headers()).length,
        timing: response.timing() || null
      });
    });

    // Reload page to capture all network requests
    await this.page.reload({ waitUntil: 'networkidle2' });

    // Calculate aggregated metrics
    networkMetrics.totalTransferSize = networkMetrics.requests.reduce((sum, req) => {
      return sum + (req.timing?.receiveHeadersEnd || 0);
    }, 0);

    networkMetrics.averageResponseTime = networkMetrics.requests.length > 0 ?
      networkMetrics.requests.reduce((sum, req) => sum + (req.timing?.receiveHeadersEnd || 0), 0) / networkMetrics.requests.length : 0;

    return networkMetrics;
  }

  async runMonitoring(duration = 30000) {
    this.log(`Starting ${duration}ms monitoring session...`);
    
    try {
      // Start server
      await this.startServer();
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for server to be fully ready

      // Initialize browser
      await this.initializeBrowser();

      // Navigate to app
      const navigationMetrics = await this.navigateToApp();

      // Measure initial load metrics
      const loadMetrics = await this.measurePageLoadMetrics();

      // Run user interaction simulation
      const interactionMetrics = await this.simulateUserInteractions();

      // Measure network performance
      const networkMetrics = await this.measureNetworkPerformance();

      // Continuous monitoring for specified duration
      const monitoringStartTime = Date.now();
      const continuousMetrics = [];

      while (Date.now() - monitoringStartTime < duration) {
        const currentMetrics = await this.measurePageLoadMetrics();
        continuousMetrics.push(currentMetrics);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Sample every 5 seconds
      }

      const results = {
        sessionInfo: {
          startTime: this.startTime,
          endTime: Date.now(),
          duration: Date.now() - this.startTime,
          monitoringDuration: duration
        },
        navigationMetrics,
        loadMetrics,
        interactionMetrics,
        networkMetrics,
        continuousMetrics,
        summary: this.generateSummary(continuousMetrics, interactionMetrics, networkMetrics)
      };

      return results;

    } finally {
      await this.cleanup();
    }
  }

  generateSummary(continuousMetrics, interactionMetrics, networkMetrics) {
    const summary = {
      performance: {
        avgMemoryUsage: 0,
        memoryTrend: 'stable',
        avgResponseTime: 0,
        totalInteractions: interactionMetrics.length
      },
      network: {
        totalRequests: networkMetrics.totalRequests,
        failedRequests: networkMetrics.failedRequests,
        successRate: ((networkMetrics.totalRequests - networkMetrics.failedRequests) / networkMetrics.totalRequests) * 100,
        avgResponseTime: networkMetrics.averageResponseTime
      },
      issues: []
    };

    // Calculate memory usage trend
    if (continuousMetrics.length > 1) {
      const memoryUsages = continuousMetrics
        .filter(m => m.memoryInfo)
        .map(m => m.memoryInfo.usedJSHeapSize);

      if (memoryUsages.length > 0) {
        summary.performance.avgMemoryUsage = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
        
        // Check for memory leaks
        const firstMemory = memoryUsages[0];
        const lastMemory = memoryUsages[memoryUsages.length - 1];
        const growthPercent = ((lastMemory - firstMemory) / firstMemory) * 100;

        if (growthPercent > 20) {
          summary.performance.memoryTrend = 'increasing';
          summary.issues.push({
            type: 'memory',
            severity: 'warning',
            description: `Memory usage increased by ${growthPercent.toFixed(1)}% during monitoring`
          });
        }
      }
    }

    // Check for performance issues
    if (networkMetrics.failedRequests > 0) {
      summary.issues.push({
        type: 'network',
        severity: 'error',
        description: `${networkMetrics.failedRequests} network requests failed`
      });
    }

    if (networkMetrics.averageResponseTime > 1000) {
      summary.issues.push({
        type: 'performance',
        severity: 'warning',
        description: `Average response time is ${networkMetrics.averageResponseTime.toFixed(1)}ms (>1s)`
      });
    }

    return summary;
  }

  async cleanup() {
    this.log('Cleaning up resources...');
    
    if (this.page) {
      await this.page.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }
    
    if (this.serverProcess && !this.serverProcess.killed) {
      this.serverProcess.kill();
      this.log('Development server stopped');
    }
  }

  async saveResults(results) {
    const filename = `realtime-monitoring-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(this.resultsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    this.log(`Monitoring results saved to: ${filepath}`);
    
    return filepath;
  }

  async generateMarkdownReport(results) {
    const report = `# Melo v2 Real-time Performance Monitoring Report

**Generated:** ${new Date(results.sessionInfo.endTime).toISOString()}  
**Session Duration:** ${Math.round(results.sessionInfo.duration / 1000)}s  
**Monitoring Duration:** ${Math.round(results.sessionInfo.monitoringDuration / 1000)}s

## Summary

### Performance Metrics
- **Average Memory Usage:** ${Math.round(results.summary.performance.avgMemoryUsage / 1024 / 1024 * 100) / 100}MB
- **Memory Trend:** ${results.summary.performance.memoryTrend}
- **Total User Interactions:** ${results.summary.performance.totalInteractions}

### Network Performance
- **Total Requests:** ${results.summary.network.totalRequests}
- **Failed Requests:** ${results.summary.network.failedRequests}
- **Success Rate:** ${results.summary.network.successRate.toFixed(1)}%
- **Average Response Time:** ${results.summary.network.avgResponseTime.toFixed(1)}ms

## Issues Detected

${results.summary.issues.length > 0 ? 
  results.summary.issues.map(issue => `
### ${issue.type} (${issue.severity})
${issue.description}
`).join('\n') : 
  'No significant issues detected ✅'
}

## Navigation Metrics
- **Navigation Time:** ${results.navigationMetrics.navigationTime}ms

## Load Metrics
${results.loadMetrics.paintMetrics ? `
- **DOM Content Loaded:** ${results.loadMetrics.paintMetrics.domContentLoaded.toFixed(1)}ms
- **Load Complete:** ${results.loadMetrics.paintMetrics.loadComplete.toFixed(1)}ms
- **First Paint:** ${results.loadMetrics.paintMetrics.firstPaint.toFixed(1)}ms
- **First Contentful Paint:** ${results.loadMetrics.paintMetrics.firstContentfulPaint.toFixed(1)}ms
- **Largest Contentful Paint:** ${results.loadMetrics.paintMetrics.largestContentfulPaint.toFixed(1)}ms
` : 'Paint metrics not available'}

## User Interactions

${results.interactionMetrics.map((interaction, index) => `
### ${index + 1}. ${interaction.action}
- **Duration:** ${interaction.duration || 'N/A'}ms
- **Timestamp:** ${new Date(interaction.timestamp).toISOString()}
`).join('\n')}

---
*Generated by Melo v2 Real-time Performance Monitor*
`;

    const filename = `realtime-monitoring-${new Date().toISOString().slice(0, 10)}.md`;
    const filepath = path.join(this.resultsDir, filename);
    
    fs.writeFileSync(filepath, report);
    this.log(`Markdown report saved to: ${filepath}`);
    
    return filepath;
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new RealtimeMonitor();
  
  const duration = process.argv[2] ? parseInt(process.argv[2]) * 1000 : 60000; // Default 60 seconds
  
  monitor.runMonitoring(duration)
    .then(async (results) => {
      await monitor.saveResults(results);
      await monitor.generateMarkdownReport(results);
      console.log('✅ Real-time monitoring complete!');
      
      // Print quick summary
      console.log('\n📊 Quick Summary:');
      console.log(`- Navigation Time: ${results.navigationMetrics.navigationTime}ms`);
      console.log(`- Total Requests: ${results.summary.network.totalRequests}`);
      console.log(`- Success Rate: ${results.summary.network.successRate.toFixed(1)}%`);
      console.log(`- Issues Found: ${results.summary.issues.length}`);
      
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Monitoring failed:', error);
      process.exit(1);
    });
}

module.exports = RealtimeMonitor;