/**
 * Load Time Tracker
 * 
 * Performance monitoring utility for tracking page load times and ensuring
 * MELO V2 meets the <3 second load time baseline requirement.
 */

interface PerformanceMetrics {
  loadTime: number
  domContentLoaded: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  timeToInteractive: number
  isWithinThreshold: boolean
  threshold: number
}

interface NavigationTiming {
  navigationStart: number
  domContentLoadedEventEnd: number
  loadEventEnd: number
  fetchStart: number
}

export class LoadTimeTracker {
  private static startTime: number = 0
  private static endTime: number = 0
  private static readonly LOAD_TIME_THRESHOLD = 3000 // 3 seconds in milliseconds

  /**
   * Start performance measurement
   */
  static startMeasurement(): void {
    this.startTime = this.getPerformanceNow()
    
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('load-measurement-start')
    }
  }

  /**
   * End performance measurement
   */
  static endMeasurement(): void {
    this.endTime = this.getPerformanceNow()
    
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      performance.mark('load-measurement-end')
      performance.measure('load-time-measurement', 'load-measurement-start', 'load-measurement-end')
    }
  }

  /**
   * Get the measured load time in milliseconds
   */
  static getLoadTime(): number {
    if (this.startTime && this.endTime) {
      return this.endTime - this.startTime
    }

    // Fallback to Navigation Timing API if available
    if (typeof performance !== 'undefined' && performance.timing) {
      const timing = performance.timing as NavigationTiming
      return timing.loadEventEnd - timing.navigationStart
    }

    return 0
  }

  /**
   * Check if load time is within the 3-second threshold
   */
  static isWithinThreshold(loadTime?: number): boolean {
    const timeToCheck = loadTime !== undefined ? loadTime : this.getLoadTime()
    return timeToCheck < this.LOAD_TIME_THRESHOLD && timeToCheck > 0
  }

  /**
   * Get comprehensive performance metrics
   */
  static getMetrics(): PerformanceMetrics {
    const loadTime = this.getLoadTime()
    let domContentLoaded = 0
    let firstContentfulPaint = 0
    let largestContentfulPaint = 0
    let timeToInteractive = 0

    if (typeof performance !== 'undefined') {
      // Get DOM Content Loaded timing
      if (performance.timing) {
        const timing = performance.timing as NavigationTiming
        domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart
      }

      // Get paint metrics
      if (performance.getEntriesByType) {
        const paintEntries = performance.getEntriesByType('paint')
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
        if (fcpEntry) {
          firstContentfulPaint = fcpEntry.startTime
        }

        // Get Largest Contentful Paint
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
        if (lcpEntries.length > 0) {
          const latestLCP = lcpEntries[lcpEntries.length - 1]
          largestContentfulPaint = latestLCP.startTime
        }
      }

      // Estimate Time to Interactive (simplified calculation)
      if (domContentLoaded > 0) {
        timeToInteractive = Math.max(domContentLoaded, firstContentfulPaint) + 100
      }
    }

    return {
      loadTime,
      domContentLoaded,
      firstContentfulPaint,
      largestContentfulPaint,
      timeToInteractive,
      isWithinThreshold: this.isWithinThreshold(loadTime),
      threshold: this.LOAD_TIME_THRESHOLD
    }
  }

  /**
   * Get current performance time (works in both browser and Node.js)
   */
  private static getPerformanceNow(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now()
    }
    
    // Fallback for Node.js environment
    if (typeof process !== 'undefined' && process.hrtime) {
      const hrTime = process.hrtime()
      return hrTime[0] * 1000 + hrTime[1] / 1e6
    }
    
    // Final fallback
    return Date.now()
  }

  /**
   * Reset measurement state
   */
  static reset(): void {
    this.startTime = 0
    this.endTime = 0
  }

  /**
   * Get performance observer for Core Web Vitals (if available)
   */
  static observeCoreWebVitals(callback: (metrics: any) => void): void {
    if (typeof PerformanceObserver === 'undefined') {
      console.warn('PerformanceObserver not available')
      return
    }

    // Observe paint metrics
    try {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          callback({
            name: entry.name,
            value: entry.startTime,
            type: 'paint'
          })
        })
      })
      paintObserver.observe({ entryTypes: ['paint'] })
    } catch (error) {
      console.warn('Could not observe paint metrics:', error)
    }

    // Observe LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          callback({
            name: 'largest-contentful-paint',
            value: lastEntry.startTime,
            type: 'lcp'
          })
        }
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (error) {
      console.warn('Could not observe LCP metrics:', error)
    }

    // Observe layout shifts for CLS
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        
        callback({
          name: 'cumulative-layout-shift',
          value: clsValue,
          type: 'cls'
        })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (error) {
      console.warn('Could not observe layout shift metrics:', error)
    }
  }

  /**
   * Auto-start measurement when module loads (browser only)
   */
  static autoStart(): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.endMeasurement()
        })
        this.startMeasurement()
      } else {
        // Page already loaded, measure current state
        this.startMeasurement()
        setTimeout(() => this.endMeasurement(), 0)
      }
    }
  }

  /**
   * Get bundle size analysis (for correlation with load times)
   */
  static async getBundleAnalysis(): Promise<{
    totalSize: number
    jsSize: number
    cssSize: number
    imageSize: number
    estimatedLoadTime: number
  }> {
    if (typeof performance === 'undefined' || !performance.getEntriesByType) {
      return {
        totalSize: 0,
        jsSize: 0,
        cssSize: 0,
        imageSize: 0,
        estimatedLoadTime: 0
      }
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    let totalSize = 0
    let jsSize = 0
    let cssSize = 0
    let imageSize = 0

    resources.forEach(resource => {
      const size = resource.transferSize || resource.encodedBodySize || 0
      totalSize += size

      const url = resource.name
      if (url.includes('.js') || url.includes('/_next/static/js/')) {
        jsSize += size
      } else if (url.includes('.css') || url.includes('/_next/static/css/')) {
        cssSize += size
      } else if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)/)) {
        imageSize += size
      }
    })

    // Rough estimation: 1MB takes ~1000ms to load on average connection
    const estimatedLoadTime = Math.min(totalSize / 1000, 5000)

    return {
      totalSize,
      jsSize,
      cssSize,
      imageSize,
      estimatedLoadTime
    }
  }
}

// Auto-start measurement in browser environment
if (typeof window !== 'undefined') {
  LoadTimeTracker.autoStart()
}

export default LoadTimeTracker