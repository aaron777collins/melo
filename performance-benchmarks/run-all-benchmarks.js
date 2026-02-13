#!/usr/bin/env node

/**
 * Master Performance Benchmark Runner for HAOS v2
 * Orchestrates all performance testing tools and generates comprehensive reports
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Import our benchmark modules
const HAOSBenchmark = require('./benchmark.js');
const BundleAnalyzer = require('./bundle-analyzer.js');

class MasterBenchmarkRunner {
  constructor() {
    this.startTime = Date.now();
    this.resultsDir = path.join(__dirname, 'results');
    this.projectRoot = path.join(__dirname, '..');
    this.results = {
      sessionInfo: {
        startTime: this.startTime,
        version: this.getPackageVersion(),
        environment: this.getEnvironmentInfo(),
        testSuites: []
      },
      results: {},
      summary: {},
      recommendations: []
    };
    
    this.ensureResultsDir();
  }

  getPackageVersion() {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
      return pkg.version;
    } catch (error) {
      return 'unknown';
    }
  }

  getEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: require('os').cpus().length,
      totalMemory: Math.round(require('os').totalmem() / 1024 / 1024 / 1024 * 100) / 100 + 'GB',
      freeMemory: Math.round(require('os').freemem() / 1024 / 1024 / 1024 * 100) / 100 + 'GB'
    };
  }

  ensureResultsDir() {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: '📋',
      warn: '⚠️ ',
      error: '❌',
      success: '✅'
    }[level] || '📋';
    
    console.log(`[${timestamp}] ${emoji} ${message}`);
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...', 'info');
    
    const checks = {
      nodeModules: fs.existsSync(path.join(this.projectRoot, 'node_modules')),
      packageJson: fs.existsSync(path.join(this.projectRoot, 'package.json')),
      nextConfig: fs.existsSync(path.join(this.projectRoot, 'next.config.js')),
      buildDir: fs.existsSync(path.join(this.projectRoot, '.next'))
    };

    // Install dependencies if needed
    if (!checks.nodeModules) {
      this.log('Installing dependencies...', 'info');
      try {
        await execAsync('npm install', { cwd: this.projectRoot });
        checks.nodeModules = true;
      } catch (error) {
        this.log(`Failed to install dependencies: ${error.message}`, 'error');
        throw error;
      }
    }

    // Build project if needed
    if (!checks.buildDir) {
      this.log('Building project for benchmarking...', 'info');
      try {
        await execAsync('npm run build', { cwd: this.projectRoot });
        checks.buildDir = true;
      } catch (error) {
        this.log(`Build failed: ${error.message}`, 'error');
        throw error;
      }
    }

    // Check for puppeteer (for realtime monitoring)
    try {
      await execAsync('npm list puppeteer', { cwd: this.projectRoot });
    } catch (error) {
      this.log('Installing puppeteer for browser automation...', 'warn');
      try {
        await execAsync('npm install puppeteer --save-dev', { cwd: this.projectRoot });
      } catch (installError) {
        this.log('Could not install puppeteer, real-time monitoring will be skipped', 'warn');
      }
    }

    this.log('Prerequisites check complete', 'success');
    return checks;
  }

  async runBundleAnalysis() {
    this.log('Running bundle analysis...', 'info');
    
    try {
      const analyzer = new BundleAnalyzer();
      const result = await analyzer.analyzeBundles();
      
      if (result.success) {
        this.results.results.bundleAnalysis = result;
        this.results.sessionInfo.testSuites.push('bundle-analysis');
        this.log('Bundle analysis completed successfully', 'success');
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      this.log(`Bundle analysis failed: ${error.message}`, 'error');
      this.results.results.bundleAnalysis = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runCoreBenchmarks() {
    this.log('Running core performance benchmarks...', 'info');
    
    try {
      const benchmark = new HAOSBenchmark();
      await benchmark.runAllBenchmarks();
      
      this.results.results.coreBenchmarks = benchmark.results;
      this.results.sessionInfo.testSuites.push('core-benchmarks');
      this.log('Core benchmarks completed successfully', 'success');
      
    } catch (error) {
      this.log(`Core benchmarks failed: ${error.message}`, 'error');
      this.results.results.coreBenchmarks = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runRealtimeMonitoring() {
    this.log('Running real-time performance monitoring...', 'info');
    
    try {
      // Check if puppeteer is available
      try {
        require('puppeteer');
      } catch (error) {
        this.log('Puppeteer not available, skipping real-time monitoring', 'warn');
        return;
      }

      const RealtimeMonitor = require('./realtime-monitor.js');
      const monitor = new RealtimeMonitor();
      
      // Run monitoring for 30 seconds
      const monitoringResults = await monitor.runMonitoring(30000);
      
      this.results.results.realtimeMonitoring = {
        success: true,
        results: monitoringResults,
        timestamp: new Date().toISOString()
      };
      
      this.results.sessionInfo.testSuites.push('realtime-monitoring');
      this.log('Real-time monitoring completed successfully', 'success');
      
    } catch (error) {
      this.log(`Real-time monitoring failed: ${error.message}`, 'error');
      this.results.results.realtimeMonitoring = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runLighthouseAudit() {
    this.log('Running Lighthouse performance audit...', 'info');
    
    try {
      // Check if lighthouse is installed globally or install it
      try {
        await execAsync('lighthouse --version');
      } catch (error) {
        this.log('Installing Lighthouse...', 'info');
        await execAsync('npm install -g lighthouse');
      }

      // Start the production server
      this.log('Starting production server for Lighthouse audit...', 'info');
      const serverProcess = spawn('npm', ['run', 'start'], {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PORT: '3001' } // Use different port to avoid conflicts
      });

      // Wait for server to be ready
      await this.waitForServer('http://localhost:3001', 60000);

      // Run Lighthouse
      const lighthouseOutput = path.join(this.resultsDir, `lighthouse-${Date.now()}.json`);
      const lighthouseCmd = [
        'lighthouse',
        'http://localhost:3001',
        '--output=json',
        `--output-path=${lighthouseOutput}`,
        '--chrome-flags="--headless --no-sandbox"',
        '--quiet'
      ].join(' ');

      await execAsync(lighthouseCmd, { maxBuffer: 1024 * 1024 * 5 }); // 5MB buffer

      // Parse results
      const lighthouseResults = JSON.parse(fs.readFileSync(lighthouseOutput, 'utf8'));
      
      this.results.results.lighthouseAudit = {
        success: true,
        scores: {
          performance: Math.round(lighthouseResults.lhr.categories.performance.score * 100),
          accessibility: Math.round(lighthouseResults.lhr.categories.accessibility.score * 100),
          bestPractices: Math.round(lighthouseResults.lhr.categories['best-practices'].score * 100),
          seo: Math.round(lighthouseResults.lhr.categories.seo.score * 100)
        },
        metrics: this.extractLighthouseMetrics(lighthouseResults),
        resultsFile: lighthouseOutput,
        timestamp: new Date().toISOString()
      };

      // Clean up server
      serverProcess.kill();
      
      this.results.sessionInfo.testSuites.push('lighthouse-audit');
      this.log('Lighthouse audit completed successfully', 'success');
      
    } catch (error) {
      this.log(`Lighthouse audit failed: ${error.message}`, 'error');
      this.results.results.lighthouseAudit = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  extractLighthouseMetrics(lighthouseResults) {
    const audits = lighthouseResults.lhr.audits;
    
    return {
      firstContentfulPaint: audits['first-contentful-paint']?.numericValue || 0,
      largestContentfulPaint: audits['largest-contentful-paint']?.numericValue || 0,
      speedIndex: audits['speed-index']?.numericValue || 0,
      timeToInteractive: audits['interactive']?.numericValue || 0,
      totalBlockingTime: audits['total-blocking-time']?.numericValue || 0,
      cumulativeLayoutShift: audits['cumulative-layout-shift']?.numericValue || 0
    };
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
    throw new Error(`Server at ${url} did not start within ${timeout}ms`);
  }

  generateSummary() {
    this.log('Generating performance summary...', 'info');
    
    const summary = {
      overallScore: 'unknown',
      criticalIssues: 0,
      warnings: 0,
      recommendations: [],
      keyMetrics: {},
      testSuitesRun: this.results.sessionInfo.testSuites.length,
      testSuitesSuccessful: 0
    };

    // Count successful test suites
    summary.testSuitesSuccessful = Object.values(this.results.results)
      .filter(result => result.success === true).length;

    // Extract key metrics from different test suites
    if (this.results.results.lighthouseAudit?.success) {
      summary.keyMetrics.lighthouse = this.results.results.lighthouseAudit.scores;
      
      // Performance recommendations based on Lighthouse scores
      const perfScore = this.results.results.lighthouseAudit.scores.performance;
      if (perfScore < 70) {
        summary.criticalIssues++;
        summary.recommendations.push({
          type: 'performance',
          severity: 'critical',
          title: `Low Lighthouse Performance Score (${perfScore})`,
          description: 'The application has significant performance issues that impact user experience',
          suggestions: [
            'Optimize bundle sizes and reduce JavaScript payload',
            'Implement code splitting and lazy loading',
            'Optimize images and other assets',
            'Reduce Time to Interactive and First Contentful Paint'
          ]
        });
      } else if (perfScore < 90) {
        summary.warnings++;
        summary.recommendations.push({
          type: 'performance',
          severity: 'warning',
          title: `Moderate Lighthouse Performance Score (${perfScore})`,
          description: 'There is room for performance improvements',
          suggestions: [
            'Review and optimize largest assets',
            'Consider implementing performance budgets',
            'Optimize critical rendering path'
          ]
        });
      }
    }

    // Bundle analysis insights
    if (this.results.results.bundleAnalysis?.success) {
      const bundleReport = this.results.results.bundleAnalysis.report;
      summary.keyMetrics.bundleSize = bundleReport.summary.totalSize;
      
      // Add bundle-specific recommendations
      if (bundleReport.recommendations) {
        bundleReport.recommendations.forEach(rec => {
          if (rec.severity === 'warning') summary.warnings++;
          summary.recommendations.push({
            type: 'bundle',
            severity: rec.severity,
            title: rec.title,
            description: rec.description,
            suggestions: [rec.suggestion]
          });
        });
      }
    }

    // Real-time monitoring insights
    if (this.results.results.realtimeMonitoring?.success) {
      const monitoring = this.results.results.realtimeMonitoring.results;
      summary.keyMetrics.runtime = {
        navigationTime: monitoring.navigationMetrics.navigationTime,
        memoryTrend: monitoring.summary.performance.memoryTrend,
        networkSuccessRate: monitoring.summary.network.successRate
      };

      // Add runtime-specific issues
      if (monitoring.summary.issues?.length > 0) {
        monitoring.summary.issues.forEach(issue => {
          if (issue.severity === 'error') summary.criticalIssues++;
          if (issue.severity === 'warning') summary.warnings++;
          
          summary.recommendations.push({
            type: 'runtime',
            severity: issue.severity,
            title: `Runtime ${issue.type} Issue`,
            description: issue.description,
            suggestions: ['Investigate and fix this runtime issue']
          });
        });
      }
    }

    // Generate overall score
    const totalIssues = summary.criticalIssues + summary.warnings;
    const successRate = summary.testSuitesSuccessful / Math.max(summary.testSuitesRun, 1);
    
    if (summary.criticalIssues > 0 || successRate < 0.8) {
      summary.overallScore = 'needs-improvement';
    } else if (summary.warnings > 0 || successRate < 1.0) {
      summary.overallScore = 'good';
    } else {
      summary.overallScore = 'excellent';
    }

    this.results.summary = summary;
    return summary;
  }

  async saveResults() {
    const endTime = Date.now();
    this.results.sessionInfo.endTime = endTime;
    this.results.sessionInfo.totalDuration = endTime - this.startTime;

    const filename = `master-benchmark-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(this.resultsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    this.log(`Complete benchmark results saved to: ${filepath}`, 'success');
    
    return filepath;
  }

  async generateMasterReport() {
    const report = `# 🏆 HAOS v2 Comprehensive Performance Benchmark Report

**Generated:** ${new Date().toISOString()}  
**Version:** ${this.results.sessionInfo.version}  
**Total Duration:** ${Math.round(this.results.sessionInfo.totalDuration / 1000)}s  
**Test Suites Run:** ${this.results.sessionInfo.testSuites.join(', ')}

## 📊 Executive Summary

### Overall Performance Score: ${this.getScoreEmoji()} ${this.results.summary.overallScore.toUpperCase()}

| Metric | Value |
|--------|-------|
| **Test Suites Executed** | ${this.results.summary.testSuitesSuccessful}/${this.results.summary.testSuitesRun} |
| **Critical Issues** | ${this.results.summary.criticalIssues} |
| **Warnings** | ${this.results.summary.warnings} |
| **Environment** | ${this.results.sessionInfo.environment.platform} (${this.results.sessionInfo.environment.arch}) |
| **Node.js Version** | ${this.results.sessionInfo.environment.nodeVersion} |
| **System Memory** | ${this.results.sessionInfo.environment.totalMemory} total, ${this.results.sessionInfo.environment.freeMemory} free |

## 🎯 Key Performance Metrics

${this.formatKeyMetrics()}

## 🚨 Issues & Recommendations

${this.formatRecommendations()}

## 📈 Detailed Test Results

${this.formatDetailedResults()}

## 🔧 Next Steps

Based on the analysis, here are the recommended next steps:

${this.generateNextSteps()}

---

## 📁 Raw Data Files

${this.listGeneratedFiles()}

---

*Generated by HAOS v2 Master Performance Benchmark Runner*  
*Report timestamp: ${new Date().toISOString()}*
`;

    const filename = `MASTER-PERFORMANCE-REPORT-${new Date().toISOString().slice(0, 10)}.md`;
    const filepath = path.join(this.resultsDir, filename);
    
    fs.writeFileSync(filepath, report);
    this.log(`Master performance report generated: ${filepath}`, 'success');
    
    return filepath;
  }

  getScoreEmoji() {
    const score = this.results.summary.overallScore;
    return {
      'excellent': '🟢',
      'good': '🟡',
      'needs-improvement': '🔴'
    }[score] || '⚪';
  }

  formatKeyMetrics() {
    const metrics = this.results.summary.keyMetrics;
    let output = '';

    if (metrics.lighthouse) {
      output += `### 🎨 Lighthouse Scores
| Category | Score |
|----------|-------|
| Performance | ${metrics.lighthouse.performance}/100 |
| Accessibility | ${metrics.lighthouse.accessibility}/100 |
| Best Practices | ${metrics.lighthouse.bestPractices}/100 |
| SEO | ${metrics.lighthouse.seo}/100 |

`;
    }

    if (metrics.bundleSize) {
      output += `### 📦 Bundle Information
- **Total Bundle Size:** ${metrics.bundleSize}

`;
    }

    if (metrics.runtime) {
      output += `### ⚡ Runtime Performance
- **Navigation Time:** ${metrics.runtime.navigationTime}ms
- **Memory Trend:** ${metrics.runtime.memoryTrend}
- **Network Success Rate:** ${metrics.runtime.networkSuccessRate.toFixed(1)}%

`;
    }

    return output || 'No key metrics available';
  }

  formatRecommendations() {
    if (!this.results.summary.recommendations.length) {
      return '🎉 **No critical issues found!** The application is performing well.';
    }

    let output = '';
    const critical = this.results.summary.recommendations.filter(r => r.severity === 'critical');
    const warnings = this.results.summary.recommendations.filter(r => r.severity === 'warning');

    if (critical.length > 0) {
      output += `### 🔴 Critical Issues (${critical.length})

${critical.map(rec => `
#### ${rec.title}
${rec.description}

**Suggested Actions:**
${rec.suggestions.map(s => `- ${s}`).join('\n')}
`).join('\n')}

`;
    }

    if (warnings.length > 0) {
      output += `### 🟡 Warnings (${warnings.length})

${warnings.map(rec => `
#### ${rec.title}
${rec.description}

**Suggested Actions:**
${rec.suggestions.map(s => `- ${s}`).join('\n')}
`).join('\n')}

`;
    }

    return output;
  }

  formatDetailedResults() {
    let output = '';
    
    Object.entries(this.results.results).forEach(([testName, result]) => {
      const status = result.success ? '✅' : '❌';
      const title = testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      output += `### ${status} ${title}

`;
      
      if (result.success) {
        output += `**Status:** Completed successfully  
**Timestamp:** ${result.timestamp || 'N/A'}  

`;
        
        // Add test-specific details
        if (testName === 'lighthouseAudit' && result.scores) {
          output += `**Key Metrics:**
- Performance: ${result.scores.performance}/100
- First Contentful Paint: ${result.metrics?.firstContentfulPaint || 'N/A'}ms
- Time to Interactive: ${result.metrics?.timeToInteractive || 'N/A'}ms

`;
        }
        
        if (testName === 'bundleAnalysis' && result.report) {
          output += `**Bundle Summary:**
- Total Assets: ${result.report.summary.totalAssets}
- Total Size: ${result.report.summary.totalSize}

`;
        }
        
      } else {
        output += `**Status:** Failed  
**Error:** ${result.error || 'Unknown error'}  
**Timestamp:** ${result.timestamp || 'N/A'}  

`;
      }
    });

    return output;
  }

  generateNextSteps() {
    const steps = [];
    
    if (this.results.summary.criticalIssues > 0) {
      steps.push('1. **Address Critical Issues** - Focus on fixing performance bottlenecks and critical problems identified in this report');
    }
    
    if (this.results.summary.warnings > 0) {
      steps.push('2. **Optimize Performance** - Work through the warning-level optimizations to improve user experience');
    }
    
    if (this.results.summary.testSuitesSuccessful < this.results.summary.testSuitesRun) {
      steps.push('3. **Fix Test Suite Issues** - Investigate why some benchmark tests failed and resolve underlying problems');
    }
    
    steps.push('4. **Set Performance Budget** - Establish performance benchmarks based on this baseline');
    steps.push('5. **Continuous Monitoring** - Integrate these benchmarks into CI/CD pipeline for ongoing monitoring');
    steps.push('6. **User Experience Testing** - Conduct real-user testing to validate these performance improvements');
    
    return steps.join('\n');
  }

  listGeneratedFiles() {
    const files = fs.readdirSync(this.resultsDir)
      .filter(file => file.endsWith('.json') || file.endsWith('.md'))
      .filter(file => file.includes(new Date().toISOString().slice(0, 10)))
      .map(file => `- \`${file}\``)
      .join('\n');
      
    return files || 'No additional files generated in this session.';
  }

  async runAllBenchmarks() {
    this.log('🚀 Starting HAOS v2 Master Performance Benchmark Suite...', 'info');
    
    try {
      // Prerequisites check
      await this.checkPrerequisites();
      
      // Run all benchmark suites
      await this.runBundleAnalysis();
      await this.runCoreBenchmarks();
      await this.runLighthouseAudit();
      await this.runRealtimeMonitoring();
      
      // Generate summary and reports
      this.generateSummary();
      await this.saveResults();
      const reportPath = await this.generateMasterReport();
      
      // Final summary
      this.log('🎉 Master benchmark suite completed successfully!', 'success');
      this.log(`📊 Overall Score: ${this.results.summary.overallScore}`, 'info');
      this.log(`📋 Report: ${reportPath}`, 'info');
      
      return this.results;
      
    } catch (error) {
      this.log(`💥 Master benchmark suite failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new MasterBenchmarkRunner();
  
  runner.runAllBenchmarks()
    .then(() => {
      console.log('\n✅ All benchmarks complete! Check the results directory for detailed reports.');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Benchmarking failed:', error.message);
      process.exit(1);
    });
}

module.exports = MasterBenchmarkRunner;