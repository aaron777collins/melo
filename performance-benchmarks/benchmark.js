#!/usr/bin/env node

/**
 * Melo v2 Performance Benchmarking Suite
 * 
 * Comprehensive performance testing for the Matrix Discord-clone client
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class MeloBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      version: this.getPackageVersion(),
      tests: {}
    };
    this.resultDir = path.join(__dirname, 'results');
    this.ensureResultsDir();
  }

  getPackageVersion() {
    try {
      const pkg = JSON.parse(fs.readFileSync('../package.json', 'utf8'));
      return pkg.version;
    } catch (error) {
      return 'unknown';
    }
  }

  ensureResultsDir() {
    if (!fs.existsSync(this.resultDir)) {
      fs.mkdirSync(this.resultDir, { recursive: true });
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }

  async runBundleAnalysis() {
    this.log('Running bundle size analysis...');
    
    try {
      // Run bundle analyzer
      const { stdout } = await execAsync('cd .. && npm run build 2>&1');
      
      // Extract Next.js build information
      const buildInfo = this.parseBuildOutput(stdout);
      
      this.results.tests.bundleAnalysis = {
        success: true,
        buildOutput: stdout,
        parsedInfo: buildInfo,
        timestamp: new Date().toISOString()
      };

      this.log(`Bundle analysis complete. Total size: ${buildInfo.totalSize || 'unknown'}`);
      
    } catch (error) {
      this.results.tests.bundleAnalysis = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      this.log(`Bundle analysis failed: ${error.message}`, 'error');
    }
  }

  parseBuildOutput(output) {
    const info = {
      pages: [],
      static: [],
      totalSize: null
    };

    // Parse Next.js build output for file sizes
    const lines = output.split('\n');
    let inPageSection = false;
    let inStaticSection = false;

    for (const line of lines) {
      if (line.includes('Page') && line.includes('Size')) {
        inPageSection = true;
        continue;
      }
      
      if (line.includes('+ First Load JS shared by all')) {
        inPageSection = false;
        inStaticSection = true;
        continue;
      }

      if (inPageSection && line.trim()) {
        const match = line.match(/^(.+?)\s+(\d+(?:\.\d+)?\s*[A-Za-z]+)\s+(\d+(?:\.\d+)?\s*[A-Za-z]+)/);
        if (match) {
          info.pages.push({
            path: match[1].trim(),
            size: match[2].trim(),
            firstLoadJS: match[3].trim()
          });
        }
      }
    }

    return info;
  }

  async runLighthouseTests() {
    this.log('Running Lighthouse performance tests...');
    
    try {
      // Check if lighthouse is installed
      try {
        await execAsync('lighthouse --version');
      } catch (error) {
        this.log('Installing Lighthouse...', 'warn');
        await execAsync('npm install -g lighthouse');
      }

      // Start the Next.js dev server for testing
      const server = spawn('npm', ['run', 'dev'], { 
        cwd: path.join(__dirname, '..'),
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Wait for server to start
      await this.waitForServer('http://localhost:3000', 30000);

      // Run Lighthouse tests
      const lighthouseOptions = [
        '--output=json',
        '--output-path=' + path.join(this.resultDir, `lighthouse-${Date.now()}.json`),
        '--chrome-flags="--headless"',
        '--quiet',
        'http://localhost:3000'
      ];

      const { stdout } = await execAsync(`lighthouse ${lighthouseOptions.join(' ')}`);
      
      // Parse lighthouse results
      const resultsFile = lighthouseOptions.find(opt => opt.includes('--output-path')).split('=')[1];
      const lighthouseResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

      this.results.tests.lighthouse = {
        success: true,
        scores: {
          performance: lighthouseResults.lhr.categories.performance.score * 100,
          accessibility: lighthouseResults.lhr.categories.accessibility.score * 100,
          bestPractices: lighthouseResults.lhr.categories['best-practices'].score * 100,
          seo: lighthouseResults.lhr.categories.seo.score * 100
        },
        metrics: {
          firstContentfulPaint: lighthouseResults.lhr.audits['first-contentful-paint'].numericValue,
          largestContentfulPaint: lighthouseResults.lhr.audits['largest-contentful-paint'].numericValue,
          cumulativeLayoutShift: lighthouseResults.lhr.audits['cumulative-layout-shift'].numericValue,
          speedIndex: lighthouseResults.lhr.audits['speed-index'].numericValue
        },
        resultsFile: resultsFile,
        timestamp: new Date().toISOString()
      };

      // Clean up server
      server.kill();
      
      this.log(`Lighthouse tests complete. Performance score: ${this.results.tests.lighthouse.scores.performance}`);

    } catch (error) {
      this.results.tests.lighthouse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      this.log(`Lighthouse tests failed: ${error.message}`, 'error');
    }
  }

  async waitForServer(url, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        await execAsync(`curl -s ${url} > /dev/null`);
        return true;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error(`Server did not start within ${timeout}ms`);
  }

  async runMatrixSDKBenchmarks() {
    this.log('Running Matrix SDK performance tests...');
    
    try {
      // Create a simple Matrix SDK performance test
      const matrixTestScript = `
const sdk = require('matrix-js-sdk');

async function benchmarkMatrixSDK() {
  const start = Date.now();
  
  // Test client initialization
  const client = sdk.createClient({
    baseUrl: 'https://matrix.org',
    userId: '@test:matrix.org',
    accessToken: 'dummy_token'
  });
  
  const initTime = Date.now() - start;
  
  // Test event creation performance
  const eventStart = Date.now();
  for (let i = 0; i < 1000; i++) {
    const event = {
      type: 'm.room.message',
      content: {
        msgtype: 'm.text',
        body: 'Test message ' + i
      }
    };
  }
  const eventTime = Date.now() - eventStart;
  
  return {
    initTime: initTime,
    eventCreationTime: eventTime,
    eventsPerSecond: Math.round(1000 / (eventTime / 1000))
  };
}

benchmarkMatrixSDK().then(result => {
  console.log(JSON.stringify(result));
}).catch(error => {
  console.error(JSON.stringify({error: error.message}));
});
      `;

      fs.writeFileSync(path.join(__dirname, 'matrix-test.js'), matrixTestScript);
      
      const { stdout } = await execAsync(`cd ${__dirname} && node matrix-test.js`);
      const matrixResults = JSON.parse(stdout);

      this.results.tests.matrixSDK = {
        success: true,
        metrics: matrixResults,
        timestamp: new Date().toISOString()
      };

      this.log(`Matrix SDK tests complete. Init time: ${matrixResults.initTime}ms`);

    } catch (error) {
      this.results.tests.matrixSDK = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      this.log(`Matrix SDK tests failed: ${error.message}`, 'error');
    }
  }

  async runMemoryProfileTest() {
    this.log('Running memory profile test...');
    
    try {
      // Create a memory profiling script using Node.js built-in tools
      const memoryTestScript = `
const v8 = require('v8');
const process = require('process');

function getMemoryUsage() {
  const usage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    heapSizeLimit: heapStats.heap_size_limit,
    totalHeapSize: heapStats.total_heap_size,
    usedHeapSize: heapStats.used_heap_size
  };
}

// Simulate some Matrix operations
async function simulateMatrixOperations() {
  const measurements = [];
  
  // Initial measurement
  measurements.push({
    stage: 'initial',
    memory: getMemoryUsage()
  });
  
  // Simulate creating many Matrix events
  const events = [];
  for (let i = 0; i < 10000; i++) {
    events.push({
      type: 'm.room.message',
      content: { msgtype: 'm.text', body: 'Message ' + i },
      timestamp: Date.now(),
      eventId: '$event_' + i + ':matrix.org'
    });
  }
  
  measurements.push({
    stage: 'after_events',
    memory: getMemoryUsage()
  });
  
  // Simulate processing events
  const processed = events.map(event => ({
    ...event,
    processed: true,
    processedAt: Date.now()
  }));
  
  measurements.push({
    stage: 'after_processing',
    memory: getMemoryUsage()
  });
  
  // Clear events (simulate cleanup)
  events.length = 0;
  processed.length = 0;
  
  // Force garbage collection if possible
  if (global.gc) {
    global.gc();
  }
  
  measurements.push({
    stage: 'after_cleanup',
    memory: getMemoryUsage()
  });
  
  return measurements;
}

simulateMatrixOperations().then(result => {
  console.log(JSON.stringify(result));
}).catch(error => {
  console.error(JSON.stringify({error: error.message}));
});
      `;

      fs.writeFileSync(path.join(__dirname, 'memory-test.js'), memoryTestScript);
      
      const { stdout } = await execAsync(`cd ${__dirname} && node --expose-gc memory-test.js`);
      const memoryResults = JSON.parse(stdout);

      this.results.tests.memoryProfile = {
        success: true,
        measurements: memoryResults,
        analysis: this.analyzeMemoryUsage(memoryResults),
        timestamp: new Date().toISOString()
      };

      this.log('Memory profile test complete');

    } catch (error) {
      this.results.tests.memoryProfile = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      this.log(`Memory profile test failed: ${error.message}`, 'error');
    }
  }

  analyzeMemoryUsage(measurements) {
    if (!measurements || measurements.length < 2) {
      return { error: 'Insufficient measurements' };
    }

    const initial = measurements[0].memory;
    const peak = measurements.reduce((max, m) => 
      m.memory.heapUsed > max.memory.heapUsed ? m : max
    );
    const final = measurements[measurements.length - 1].memory;

    return {
      initialHeapUsed: initial.heapUsed,
      peakHeapUsed: peak.memory.heapUsed,
      finalHeapUsed: final.heapUsed,
      heapGrowth: final.heapUsed - initial.heapUsed,
      peakStage: peak.stage,
      memoryLeakIndicator: final.heapUsed > initial.heapUsed * 1.1 ? 'potential_leak' : 'normal'
    };
  }

  async runAllBenchmarks() {
    this.log('Starting Melo v2 Performance Benchmarking Suite...');
    
    const startTime = Date.now();
    
    try {
      await this.runBundleAnalysis();
      await this.runMatrixSDKBenchmarks();
      await this.runMemoryProfileTest();
      // Note: Lighthouse test disabled for automated runs as it requires a running server
      // await this.runLighthouseTests();
      
    } catch (error) {
      this.log(`Benchmark suite error: ${error.message}`, 'error');
    }

    const endTime = Date.now();
    this.results.totalDuration = endTime - startTime;

    // Save results
    this.saveResults();
    this.generateReport();
    
    this.log(`Benchmarking complete. Duration: ${this.results.totalDuration}ms`);
  }

  saveResults() {
    const filename = `benchmark-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(this.resultDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    this.log(`Results saved to ${filepath}`);
  }

  generateReport() {
    const report = this.createMarkdownReport();
    const filename = `benchmark-report-${new Date().toISOString().slice(0, 10)}.md`;
    const filepath = path.join(this.resultDir, filename);
    
    fs.writeFileSync(filepath, report);
    this.log(`Report generated: ${filepath}`);
  }

  createMarkdownReport() {
    const { results } = this;
    
    let report = `# Melo v2 Performance Benchmark Report

**Generated:** ${results.timestamp}  
**Version:** ${results.version}  
**Duration:** ${results.totalDuration}ms

## Summary

`;

    // Bundle Analysis
    if (results.tests.bundleAnalysis) {
      report += `### Bundle Analysis
- **Status:** ${results.tests.bundleAnalysis.success ? '✅ Success' : '❌ Failed'}
`;
      
      if (results.tests.bundleAnalysis.success && results.tests.bundleAnalysis.parsedInfo) {
        const info = results.tests.bundleAnalysis.parsedInfo;
        report += `- **Pages:** ${info.pages.length}
`;
        if (info.pages.length > 0) {
          report += `
| Page | Size | First Load JS |
|------|------|---------------|
`;
          info.pages.slice(0, 10).forEach(page => {
            report += `| ${page.path} | ${page.size} | ${page.firstLoadJS} |
`;
          });
        }
      }
    }

    // Matrix SDK
    if (results.tests.matrixSDK) {
      report += `
### Matrix SDK Performance
- **Status:** ${results.tests.matrixSDK.success ? '✅ Success' : '❌ Failed'}
`;
      
      if (results.tests.matrixSDK.success) {
        const metrics = results.tests.matrixSDK.metrics;
        report += `- **Init Time:** ${metrics.initTime}ms
- **Event Creation Time:** ${metrics.eventCreationTime}ms (1000 events)
- **Events Per Second:** ${metrics.eventsPerSecond}

`;
      }
    }

    // Memory Profile
    if (results.tests.memoryProfile) {
      report += `### Memory Profile
- **Status:** ${results.tests.memoryProfile.success ? '✅ Success' : '❌ Failed'}
`;
      
      if (results.tests.memoryProfile.success && results.tests.memoryProfile.analysis) {
        const analysis = results.tests.memoryProfile.analysis;
        report += `- **Initial Heap:** ${Math.round(analysis.initialHeapUsed / 1024 / 1024 * 100) / 100}MB
- **Peak Heap:** ${Math.round(analysis.peakHeapUsed / 1024 / 1024 * 100) / 100}MB
- **Final Heap:** ${Math.round(analysis.finalHeapUsed / 1024 / 1024 * 100) / 100}MB
- **Heap Growth:** ${Math.round(analysis.heapGrowth / 1024 / 1024 * 100) / 100}MB
- **Memory Leak Indicator:** ${analysis.memoryLeakIndicator}

`;
      }
    }

    report += `## Raw Results

\`\`\`json
${JSON.stringify(results, null, 2)}
\`\`\`

---
*Generated by Melo v2 Performance Benchmarking Suite*
`;

    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const benchmark = new MeloBenchmark();
  benchmark.runAllBenchmarks().catch(console.error);
}

module.exports = MeloBenchmark;