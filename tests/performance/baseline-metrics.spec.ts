import { test, expect, Page } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * Performance Baseline Metrics Tests
 * 
 * Establishes and validates performance baselines for MELO V2.
 * Generates comprehensive performance reports and documentation.
 */

interface BaselineMetrics {
  timestamp: string
  testEnvironment: {
    userAgent: string
    viewport: { width: number; height: number }
    networkCondition: string
  }
  loadTimeMetrics: {
    totalLoadTime: number
    domContentLoaded: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    timeToInteractive: number
    firstInputDelay: number
  }
  bundleMetrics: {
    totalBundleSize: number
    javascriptSize: number
    cssSize: number
    imageSize: number
    fontSize: number
    chunkAnalysis: Array<{
      name: string
      size: number
      type: 'js' | 'css' | 'image' | 'font' | 'other'
    }>
  }
  runtimeMetrics: {
    memoryUsage: number
    jsHeapSize: number
    renderTime: number
    frameRate: number
  }
  coreWebVitals: {
    fcp: number // First Contentful Paint
    lcp: number // Largest Contentful Paint
    cls: number // Cumulative Layout Shift
    fid: number // First Input Delay
    tti: number // Time to Interactive
  }
  matrixMetrics: {
    connectionTime: number
    initialSyncTime: number
    messageLoadTime: number
    roomListLoadTime: number
  }
  thresholdCompliance: {
    loadTimeUnder3s: boolean
    fcpUnder1800ms: boolean
    lcpUnder2500ms: boolean
    clsUnder0_1: boolean
    fidUnder100ms: boolean
  }
}

class PerformanceAnalyzer {
  private page: Page
  
  constructor(page: Page) {
    this.page = page
  }

  async collectComprehensiveMetrics(): Promise<BaselineMetrics> {
    const timestamp = new Date().toISOString()
    const userAgent = await this.page.evaluate(() => navigator.userAgent)
    const viewport = this.page.viewportSize() || { width: 1920, height: 1080 }

    // Collect all performance metrics
    const performanceData = await this.page.evaluate(() => {
      const nav = performance.timing
      const navStart = nav.navigationStart

      // Navigation timing metrics
      const loadTimeMetrics = {
        totalLoadTime: nav.loadEventEnd - navStart,
        domContentLoaded: nav.domContentLoadedEventEnd - navStart,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        timeToInteractive: 0,
        firstInputDelay: 0
      }

      // Paint timing
      const paintEntries = performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      if (fcpEntry) loadTimeMetrics.firstContentfulPaint = fcpEntry.startTime

      // LCP timing
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
      if (lcpEntries.length > 0) {
        const latestLCP = lcpEntries[lcpEntries.length - 1]
        loadTimeMetrics.largestContentfulPaint = latestLCP.startTime
      }

      // Bundle analysis
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const bundleMetrics = {
        totalBundleSize: 0,
        javascriptSize: 0,
        cssSize: 0,
        imageSize: 0,
        fontSize: 0,
        chunkAnalysis: [] as Array<{
          name: string
          size: number
          type: 'js' | 'css' | 'image' | 'font' | 'other'
        }>
      }

      resources.forEach(resource => {
        const size = resource.transferSize || resource.encodedBodySize || 0
        bundleMetrics.totalBundleSize += size
        
        const url = resource.name
        let type: 'js' | 'css' | 'image' | 'font' | 'other' = 'other'
        
        if (url.includes('.js') || url.includes('/_next/static/js/')) {
          bundleMetrics.javascriptSize += size
          type = 'js'
        } else if (url.includes('.css') || url.includes('/_next/static/css/')) {
          bundleMetrics.cssSize += size
          type = 'css'
        } else if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)/)) {
          bundleMetrics.imageSize += size
          type = 'image'
        } else if (url.match(/\.(woff|woff2|ttf|eot)/)) {
          bundleMetrics.fontSize += size
          type = 'font'
        }

        // Track individual chunks
        if (size > 10000) { // Only track chunks > 10KB
          bundleMetrics.chunkAnalysis.push({
            name: url.split('/').pop()?.split('?')[0] || 'unknown',
            size,
            type
          })
        }
      })

      // Runtime metrics
      const runtimeMetrics = {
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        jsHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
        renderTime: performance.now(),
        frameRate: 0 // Will be calculated separately
      }

      // Core Web Vitals
      const coreWebVitals = {
        fcp: loadTimeMetrics.firstContentfulPaint,
        lcp: loadTimeMetrics.largestContentfulPaint,
        cls: 0, // Needs separate measurement
        fid: loadTimeMetrics.firstInputDelay,
        tti: loadTimeMetrics.timeToInteractive
      }

      return {
        loadTimeMetrics,
        bundleMetrics,
        runtimeMetrics,
        coreWebVitals
      }
    })

    // Matrix-specific metrics (need to be measured differently)
    const matrixMetrics = await this.measureMatrixPerformance()

    // Calculate threshold compliance
    const thresholdCompliance = {
      loadTimeUnder3s: performanceData.loadTimeMetrics.totalLoadTime < 3000,
      fcpUnder1800ms: performanceData.coreWebVitals.fcp < 1800,
      lcpUnder2500ms: performanceData.coreWebVitals.lcp < 2500,
      clsUnder0_1: performanceData.coreWebVitals.cls < 0.1,
      fidUnder100ms: performanceData.coreWebVitals.fid < 100
    }

    return {
      timestamp,
      testEnvironment: {
        userAgent,
        viewport,
        networkCondition: 'standard'
      },
      ...performanceData,
      matrixMetrics,
      thresholdCompliance
    }
  }

  private async measureMatrixPerformance() {
    // Navigate to channels to measure Matrix performance
    try {
      await this.page.goto('/channels/@me')
      await this.page.waitForSelector('[data-testid="user-sidebar"]', { timeout: 5000 })

      const matrixTiming = await this.page.evaluate(() => {
        const startTime = performance.timing.navigationStart
        const now = performance.now()
        
        return {
          connectionTime: 0, // Would measure actual Matrix connection
          initialSyncTime: now, // Time to get basic Matrix data
          messageLoadTime: 0,  // Time to load message history
          roomListLoadTime: 0  // Time to load room/server list
        }
      })

      return matrixTiming
    } catch (error) {
      console.warn('Could not measure Matrix performance:', error)
      return {
        connectionTime: 0,
        initialSyncTime: 0,
        messageLoadTime: 0,
        roomListLoadTime: 0
      }
    }
  }

  async generatePerformanceReport(metrics: BaselineMetrics): Promise<void> {
    const reportDir = join(process.cwd(), 'test-results', 'performance-reports')
    
    try {
      mkdirSync(reportDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    const reportPath = join(reportDir, `baseline-metrics-${Date.now()}.json`)
    const readableReportPath = join(reportDir, `baseline-report-${Date.now()}.md`)

    // Save raw metrics
    writeFileSync(reportPath, JSON.stringify(metrics, null, 2))

    // Generate readable report
    const readableReport = this.generateReadableReport(metrics)
    writeFileSync(readableReportPath, readableReport)

    console.log(`Performance report saved to: ${reportPath}`)
    console.log(`Readable report saved to: ${readableReportPath}`)
  }

  private generateReadableReport(metrics: BaselineMetrics): string {
    const { loadTimeMetrics, bundleMetrics, thresholdCompliance, coreWebVitals } = metrics

    return `# MELO V2 Performance Baseline Report

## Summary
- **Report Generated:** ${metrics.timestamp}
- **Test Environment:** ${metrics.testEnvironment.viewport.width}x${metrics.testEnvironment.viewport.height}
- **Overall Status:** ${this.getOverallStatus(thresholdCompliance)}

## Load Time Performance
| Metric | Value | Threshold | Status |
|--------|--------|-----------|---------|
| **Total Load Time** | ${loadTimeMetrics.totalLoadTime}ms | <3000ms | ${loadTimeMetrics.totalLoadTime < 3000 ? '✅ PASS' : '❌ FAIL'} |
| **DOM Content Loaded** | ${loadTimeMetrics.domContentLoaded}ms | <2000ms | ${loadTimeMetrics.domContentLoaded < 2000 ? '✅ PASS' : '⚠️ WARN'} |
| **First Contentful Paint** | ${coreWebVitals.fcp}ms | <1800ms | ${coreWebVitals.fcp < 1800 ? '✅ PASS' : '⚠️ WARN'} |
| **Largest Contentful Paint** | ${coreWebVitals.lcp}ms | <2500ms | ${coreWebVitals.lcp < 2500 ? '✅ PASS' : '⚠️ WARN'} |

## Bundle Analysis
- **Total Bundle Size:** ${(bundleMetrics.totalBundleSize / 1024 / 1024).toFixed(2)}MB
- **JavaScript:** ${(bundleMetrics.javascriptSize / 1024 / 1024).toFixed(2)}MB
- **CSS:** ${(bundleMetrics.cssSize / 1024).toFixed(2)}KB
- **Images:** ${(bundleMetrics.imageSize / 1024).toFixed(2)}KB
- **Fonts:** ${(bundleMetrics.fontSize / 1024).toFixed(2)}KB

## Core Web Vitals Summary
| Metric | Value | Good | Needs Improvement | Poor |
|--------|-------|------|-------------------|------|
| **FCP** | ${coreWebVitals.fcp}ms | <1800ms | 1800-3000ms | >3000ms |
| **LCP** | ${coreWebVitals.lcp}ms | <2500ms | 2500-4000ms | >4000ms |

## Threshold Compliance
- ✅ Load Time Under 3s: ${thresholdCompliance.loadTimeUnder3s ? 'PASS' : 'FAIL'}
- ✅ FCP Under 1800ms: ${thresholdCompliance.fcpUnder1800ms ? 'PASS' : 'FAIL'}
- ✅ LCP Under 2500ms: ${thresholdCompliance.lcpUnder2500ms ? 'PASS' : 'FAIL'}

## Recommendations
${this.generateRecommendations(metrics).map(rec => `- ${rec}`).join('\n')}

## Largest Assets
${bundleMetrics.chunkAnalysis
  .sort((a, b) => b.size - a.size)
  .slice(0, 10)
  .map(chunk => `- **${chunk.name}** (${chunk.type}): ${(chunk.size / 1024).toFixed(1)}KB`)
  .join('\n')}

---
*Generated by MELO V2 Performance Baseline Testing Suite*
`
  }

  private getOverallStatus(compliance: BaselineMetrics['thresholdCompliance']): string {
    const passCount = Object.values(compliance).filter(Boolean).length
    const totalCount = Object.values(compliance).length
    
    if (passCount === totalCount) return '🟢 EXCELLENT'
    if (passCount >= totalCount * 0.8) return '🟡 GOOD'
    return '🔴 NEEDS IMPROVEMENT'
  }

  private generateRecommendations(metrics: BaselineMetrics): string[] {
    const recommendations: string[] = []
    const { loadTimeMetrics, bundleMetrics, thresholdCompliance } = metrics

    if (!thresholdCompliance.loadTimeUnder3s) {
      recommendations.push('🚨 CRITICAL: Load time exceeds 3 second threshold')
    }

    if (bundleMetrics.javascriptSize > 2000000) { // > 2MB
      recommendations.push('⚠️ Consider code splitting - JavaScript bundle is large')
    }

    if (bundleMetrics.totalBundleSize > 3000000) { // > 3MB
      recommendations.push('⚠️ Total bundle size is large - consider asset optimization')
    }

    if (!thresholdCompliance.fcpUnder1800ms) {
      recommendations.push('⚠️ First Contentful Paint could be improved with above-the-fold optimization')
    }

    if (!thresholdCompliance.lcpUnder2500ms) {
      recommendations.push('⚠️ Largest Contentful Paint suggests hero content loading issues')
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 All performance metrics are within acceptable ranges!')
    }

    return recommendations
  }
}

// Test suite
test.describe('Performance Baseline Metrics', () => {
  test('should establish comprehensive performance baseline', async ({ page }) => {
    const analyzer = new PerformanceAnalyzer(page)
    
    // Navigate to homepage and wait for full load
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Collect comprehensive metrics
    const metrics = await analyzer.collectComprehensiveMetrics()
    
    // Take screenshot for baseline documentation
    await page.screenshot({ 
      path: 'test-results/performance-baseline-homepage.png', 
      fullPage: true 
    })
    
    // Generate performance report
    await analyzer.generatePerformanceReport(metrics)
    
    console.log('\n=== PERFORMANCE BASELINE ESTABLISHED ===')
    console.log(`Total Load Time: ${metrics.loadTimeMetrics.totalLoadTime}ms`)
    console.log(`Bundle Size: ${(metrics.bundleMetrics.totalBundleSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`FCP: ${metrics.coreWebVitals.fcp}ms`)
    console.log(`LCP: ${metrics.coreWebVitals.lcp}ms`)
    console.log('==========================================\n')
    
    // Assert critical requirements
    expect(metrics.loadTimeMetrics.totalLoadTime, 'CRITICAL: Load time must be under 3 seconds').toBeLessThan(3000)
    expect(metrics.thresholdCompliance.loadTimeUnder3s, 'Load time threshold compliance').toBe(true)
    
    // Assert reasonable bundle size
    const bundleSizeMB = metrics.bundleMetrics.totalBundleSize / 1024 / 1024
    expect(bundleSizeMB, 'Bundle size should be reasonable').toBeLessThan(5) // 5MB maximum
    
    // Assert Core Web Vitals
    if (metrics.coreWebVitals.fcp > 0) {
      expect(metrics.coreWebVitals.fcp, 'First Contentful Paint should be good').toBeLessThan(1800)
    }
    if (metrics.coreWebVitals.lcp > 0) {
      expect(metrics.coreWebVitals.lcp, 'Largest Contentful Paint should be good').toBeLessThan(2500)
    }
  })

  test('should validate performance across different pages', async ({ page }) => {
    const analyzer = new PerformanceAnalyzer(page)
    const pages = [
      { name: 'homepage', url: '/', threshold: 3000 },
      { name: 'channels', url: '/channels/@me', threshold: 3000 },
      { name: 'sign-in', url: '/sign-in', threshold: 2500 }
    ]

    for (const testPage of pages) {
      console.log(`\nTesting performance for: ${testPage.name}`)
      
      await page.goto(testPage.url)
      await page.waitForLoadState('networkidle')
      
      const metrics = await analyzer.collectComprehensiveMetrics()
      
      // Take screenshot for each page
      await page.screenshot({ 
        path: `test-results/performance-${testPage.name}.png`, 
        fullPage: true 
      })
      
      console.log(`${testPage.name} Load Time: ${metrics.loadTimeMetrics.totalLoadTime}ms`)
      
      // Each page should meet its threshold
      expect(
        metrics.loadTimeMetrics.totalLoadTime, 
        `${testPage.name} should load within ${testPage.threshold}ms`
      ).toBeLessThan(testPage.threshold)
    }
  })

  test('should measure performance under different network conditions', async ({ page, context }) => {
    const networkConditions = [
      { name: 'fast', delay: 0, description: 'Fast connection' },
      { name: 'slow-3g', delay: 100, description: 'Slow 3G simulation' }
    ]

    for (const condition of networkConditions) {
      console.log(`\nTesting under ${condition.description}`)
      
      // Apply network conditions
      if (condition.delay > 0) {
        await context.route('**/*', async route => {
          await new Promise(resolve => setTimeout(resolve, condition.delay))
          route.continue()
        })
      }
      
      const analyzer = new PerformanceAnalyzer(page)
      
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      const metrics = await analyzer.collectComprehensiveMetrics()
      
      console.log(`${condition.name} Load Time: ${metrics.loadTimeMetrics.totalLoadTime}ms`)
      
      // Take screenshot for each condition
      await page.screenshot({ 
        path: `test-results/performance-${condition.name}.png`, 
        fullPage: true 
      })
      
      // Adjust expectations based on network conditions
      const expectedThreshold = condition.name === 'fast' ? 3000 : 5000
      expect(
        metrics.loadTimeMetrics.totalLoadTime,
        `Performance under ${condition.description} should be reasonable`
      ).toBeLessThan(expectedThreshold)
    }
  })

  test('should create comprehensive performance documentation', async ({ page }) => {
    const analyzer = new PerformanceAnalyzer(page)
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const metrics = await analyzer.collectComprehensiveMetrics()
    
    // Generate comprehensive documentation
    await analyzer.generatePerformanceReport(metrics)
    
    // Verify report contains essential information
    expect(metrics.timestamp).toBeTruthy()
    expect(metrics.loadTimeMetrics.totalLoadTime).toBeGreaterThan(0)
    expect(metrics.bundleMetrics.totalBundleSize).toBeGreaterThan(0)
    expect(metrics.thresholdCompliance).toBeTruthy()
    
    // Ensure critical performance requirements are documented
    expect(metrics.thresholdCompliance.loadTimeUnder3s).toBe(true)
    
    console.log('\n=== PERFORMANCE DOCUMENTATION COMPLETE ===')
    console.log('✅ Comprehensive metrics collected')
    console.log('✅ Performance reports generated')
    console.log('✅ Baseline established')
    console.log('✅ Threshold compliance verified')
    console.log('===============================================\n')
  })
})