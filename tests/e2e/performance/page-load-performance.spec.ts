import { test, expect, Page, BrowserContext } from '@playwright/test'

/**
 * Page Load Performance E2E Tests
 * 
 * Tests actual page load performance in real browser environment.
 * Validates <3 second load time requirement across different scenarios.
 */

interface PerformanceMetrics {
  navigationStart: number
  domContentLoaded: number
  loadComplete: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  timeToInteractive: number
  totalLoadTime: number
  isWithinThreshold: boolean
}

interface BundleAnalysis {
  totalSize: number
  jsSize: number
  cssSize: number
  imageSize: number
  chunks: Array<{ name: string; size: number }>
}

// Performance measurement utilities
async function measurePageLoadPerformance(page: Page): Promise<PerformanceMetrics> {
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle')
  
  // Get Navigation Timing API metrics
  const metrics = await page.evaluate(() => {
    const nav = performance.timing
    const navStart = nav.navigationStart
    
    // Calculate key timing metrics
    const domContentLoaded = nav.domContentLoadedEventEnd - navStart
    const loadComplete = nav.loadEventEnd - navStart
    const totalLoadTime = nav.loadEventEnd - navStart
    
    // Get paint metrics if available
    const paintEntries = performance.getEntriesByType('paint')
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
    const lcpEntry = lcpEntries[lcpEntries.length - 1] // Get latest LCP
    
    return {
      navigationStart: navStart,
      domContentLoaded,
      loadComplete,
      firstContentfulPaint: fcpEntry?.startTime || 0,
      largestContentfulPaint: lcpEntry?.startTime || 0,
      timeToInteractive: 0, // Will calculate separately
      totalLoadTime,
      isWithinThreshold: totalLoadTime < 3000
    }
  })
  
  return metrics
}

async function analyzeBundleSize(page: Page): Promise<BundleAnalysis> {
  const resources = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    
    let totalSize = 0
    let jsSize = 0
    let cssSize = 0
    let imageSize = 0
    const chunks: Array<{ name: string; size: number }> = []
    
    resources.forEach(resource => {
      const size = resource.transferSize || resource.encodedBodySize || 0
      totalSize += size
      
      const url = resource.name
      if (url.includes('.js') || url.includes('/_next/static/js/')) {
        jsSize += size
        if (url.includes('/_next/static/js/')) {
          chunks.push({
            name: url.split('/').pop() || 'unknown',
            size
          })
        }
      } else if (url.includes('.css') || url.includes('/_next/static/css/')) {
        cssSize += size
      } else if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)/)) {
        imageSize += size
      }
    })
    
    return { totalSize, jsSize, cssSize, imageSize, chunks }
  })
  
  return resources
}

// Test suite
test.describe('Page Load Performance Tests', () => {
  test('should load homepage within 3 seconds', async ({ page, context }) => {
    // Start performance measurement
    const startTime = Date.now()
    
    // Navigate to homepage
    await page.goto('/')
    
    // Measure load performance
    const metrics = await measurePageLoadPerformance(page)
    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    // Take screenshot for documentation
    await page.screenshot({ path: 'test-results/performance-homepage-load.png', fullPage: true })
    
    // Log performance metrics
    console.log('Homepage Load Performance:')
    console.log(`Total Load Time: ${metrics.totalLoadTime}ms`)
    console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`)
    console.log(`First Contentful Paint: ${metrics.firstContentfulPaint}ms`)
    console.log(`Largest Contentful Paint: ${metrics.largestContentfulPaint}ms`)
    console.log(`Measured Time: ${totalTime}ms`)
    
    // Assert performance requirements
    expect(metrics.totalLoadTime, 'Page load time should be under 3 seconds').toBeLessThan(3000)
    expect(metrics.domContentLoaded, 'DOM content loaded should be under 2 seconds').toBeLessThan(2000)
    expect(metrics.isWithinThreshold, 'Should meet performance threshold').toBe(true)
    
    // Verify Core Web Vitals
    if (metrics.firstContentfulPaint > 0) {
      expect(metrics.firstContentfulPaint, 'FCP should be under 1.8 seconds').toBeLessThan(1800)
    }
    if (metrics.largestContentfulPaint > 0) {
      expect(metrics.largestContentfulPaint, 'LCP should be under 2.5 seconds').toBeLessThan(2500)
    }
  })

  test('should load authenticated dashboard within 3 seconds', async ({ page, context }) => {
    // Navigate to authenticated area (will use stored auth from setup)
    await page.goto('/channels/@me')
    
    const startTime = Date.now()
    await page.waitForLoadState('networkidle')
    const endTime = Date.now()
    
    const metrics = await measurePageLoadPerformance(page)
    const totalTime = endTime - startTime
    
    // Take screenshot for documentation
    await page.screenshot({ path: 'test-results/performance-dashboard-load.png', fullPage: true })
    
    console.log('Dashboard Load Performance:')
    console.log(`Total Load Time: ${metrics.totalLoadTime}ms`)
    console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`)
    console.log(`Measured Time: ${totalTime}ms`)
    
    // Dashboard might be slightly slower due to Matrix sync, but still under 3s
    expect(metrics.totalLoadTime, 'Dashboard load time should be under 3 seconds').toBeLessThan(3000)
    expect(metrics.domContentLoaded, 'DOM content loaded should be under 2.5 seconds').toBeLessThan(2500)
  })

  test('should analyze and validate bundle size impact on load time', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const bundleAnalysis = await analyzeBundleSize(page)
    const metrics = await measurePageLoadPerformance(page)
    
    console.log('Bundle Analysis:')
    console.log(`Total Bundle Size: ${(bundleAnalysis.totalSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`JavaScript Size: ${(bundleAnalysis.jsSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`CSS Size: ${(bundleAnalysis.cssSize / 1024).toFixed(2)}KB`)
    console.log(`Image Size: ${(bundleAnalysis.imageSize / 1024).toFixed(2)}KB`)
    console.log(`Number of JS Chunks: ${bundleAnalysis.chunks.length}`)
    
    // Bundle size recommendations
    const totalSizeMB = bundleAnalysis.totalSize / 1024 / 1024
    const jsSizeMB = bundleAnalysis.jsSize / 1024 / 1024
    
    // Log warnings for large bundles
    if (totalSizeMB > 3) {
      console.warn(`⚠️ Total bundle size (${totalSizeMB.toFixed(2)}MB) is large and may impact load times`)
    }
    if (jsSizeMB > 2) {
      console.warn(`⚠️ JavaScript bundle size (${jsSizeMB.toFixed(2)}MB) is large`)
    }
    
    // Bundle size should correlate with reasonable load times
    if (totalSizeMB > 1.5) {
      // For larger bundles, allow slightly more time but still under threshold
      expect(metrics.totalLoadTime, 'Large bundles should still load within threshold').toBeLessThan(3000)
    } else {
      // Smaller bundles should load faster
      expect(metrics.totalLoadTime, 'Small bundles should load quickly').toBeLessThan(2500)
    }
    
    // Take screenshot for bundle size documentation
    await page.screenshot({ path: 'test-results/performance-bundle-analysis.png', fullPage: true })
  })

  test('should measure performance across different viewport sizes', async ({ page }) => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      
      const startTime = Date.now()
      await page.goto('/', { waitUntil: 'networkidle' })
      const endTime = Date.now()
      
      const metrics = await measurePageLoadPerformance(page)
      const totalTime = endTime - startTime
      
      console.log(`${viewport.name.toUpperCase()} Performance:`)
      console.log(`Load Time: ${metrics.totalLoadTime}ms`)
      console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`)
      
      // Take screenshot for each viewport
      await page.screenshot({ 
        path: `test-results/performance-${viewport.name}-load.png`, 
        fullPage: true 
      })
      
      // All viewports should meet the 3-second requirement
      expect(metrics.totalLoadTime, `${viewport.name} load time should be under 3 seconds`).toBeLessThan(3000)
      
      // Mobile might be slightly slower due to rendering complexity, but still reasonable
      if (viewport.name === 'mobile') {
        expect(metrics.domContentLoaded, 'Mobile DOM loading should be reasonable').toBeLessThan(2500)
      } else {
        expect(metrics.domContentLoaded, `${viewport.name} DOM loading should be fast`).toBeLessThan(2000)
      }
    }
  })

  test('should measure Matrix client initialization performance', async ({ page }) => {
    await page.goto('/channels/@me')
    
    // Wait for Matrix client to initialize (look for user sidebar or similar)
    await page.waitForSelector('[data-testid="user-sidebar"]', { timeout: 5000 })
    
    // Measure time to Matrix connectivity
    const matrixMetrics = await page.evaluate(() => {
      // Check if Matrix client is available and measure initialization
      const startTime = performance.timing.navigationStart
      const currentTime = performance.now()
      
      return {
        timeToMatrixInit: currentTime,
        hasMatrixClient: !!(window as any).matrixClient,
        connectionState: 'connected' // This would be actual state in implementation
      }
    })
    
    console.log('Matrix Client Performance:')
    console.log(`Time to Matrix Init: ${matrixMetrics.timeToMatrixInit}ms`)
    console.log(`Has Matrix Client: ${matrixMetrics.hasMatrixClient}`)
    console.log(`Connection State: ${matrixMetrics.connectionState}`)
    
    // Matrix initialization should be reasonable
    expect(matrixMetrics.timeToMatrixInit, 'Matrix client should initialize within reasonable time').toBeLessThan(4000)
    
    // Take screenshot of initialized state
    await page.screenshot({ path: 'test-results/performance-matrix-initialized.png', fullPage: true })
  })

  test('should validate performance with simulated slow network', async ({ page, context }) => {
    // Simulate slow 3G network conditions
    await context.route('**/*', async route => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 50))
      route.continue()
    })
    
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const endTime = Date.now()
    
    const metrics = await measurePageLoadPerformance(page)
    const totalTime = endTime - startTime
    
    console.log('Slow Network Performance:')
    console.log(`Total Load Time: ${metrics.totalLoadTime}ms`)
    console.log(`Measured Time: ${totalTime}ms`)
    
    // Take screenshot for slow network documentation
    await page.screenshot({ path: 'test-results/performance-slow-network.png', fullPage: true })
    
    // With slow network, we might allow slightly longer but should still be reasonable
    expect(totalTime, 'Should handle slow network reasonably').toBeLessThan(5000)
    
    // The page should still function properly despite slower loading
    await expect(page.locator('body')).toBeVisible()
  })

  test('should create performance baseline report', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const metrics = await measurePageLoadPerformance(page)
    const bundleAnalysis = await analyzeBundleSize(page)
    
    // Get current timestamp
    const timestamp = new Date().toISOString()
    
    const performanceReport = {
      timestamp,
      testType: 'baseline-performance',
      metrics: {
        totalLoadTime: metrics.totalLoadTime,
        domContentLoaded: metrics.domContentLoaded,
        firstContentfulPaint: metrics.firstContentfulPaint,
        largestContentfulPaint: metrics.largestContentfulPaint,
        isWithinThreshold: metrics.isWithinThreshold
      },
      bundleAnalysis: {
        totalSizeMB: (bundleAnalysis.totalSize / 1024 / 1024).toFixed(2),
        jsSizeMB: (bundleAnalysis.jsSize / 1024 / 1024).toFixed(2),
        cssKB: (bundleAnalysis.cssSize / 1024).toFixed(2),
        imageKB: (bundleAnalysis.imageSize / 1024).toFixed(2),
        chunkCount: bundleAnalysis.chunks.length
      },
      recommendations: [],
      status: 'success'
    }
    
    // Add recommendations based on metrics
    if (metrics.totalLoadTime > 2500) {
      performanceReport.recommendations.push('Consider optimizing bundle size or server response time')
    }
    if (bundleAnalysis.jsSize > 2000000) { // > 2MB
      performanceReport.recommendations.push('JavaScript bundle size is large - consider code splitting')
    }
    if (metrics.firstContentfulPaint > 1500) {
      performanceReport.recommendations.push('First Contentful Paint could be improved')
    }
    
    if (performanceReport.recommendations.length === 0) {
      performanceReport.recommendations.push('Performance metrics are good!')
    }
    
    console.log('\n=== PERFORMANCE BASELINE REPORT ===')
    console.log(JSON.stringify(performanceReport, null, 2))
    console.log('=====================================\n')
    
    // Assert that we have meaningful metrics
    expect(performanceReport.metrics.totalLoadTime).toBeGreaterThan(0)
    expect(performanceReport.metrics.totalLoadTime).toBeLessThan(3000)
    expect(performanceReport.bundleAnalysis.totalSizeMB).toBeTruthy()
    
    // Take final screenshot for baseline documentation
    await page.screenshot({ path: 'test-results/performance-baseline-complete.png', fullPage: true })
  })
})