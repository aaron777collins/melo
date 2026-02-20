/**
 * Bundle Size Analyzer
 * 
 * Analyzes bundle sizes and their impact on load times for MELO V2.
 * Integrates with existing performance-benchmarks infrastructure.
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

interface BundleAnalysis {
  timestamp: string
  totalSize: number
  chunks: Array<{
    name: string
    size: number
    type: 'js' | 'css' | 'image' | 'font' | 'other'
    path: string
  }>
  recommendations: string[]
  loadTimeImpact: {
    estimatedLoadTime: number
    isWithinThreshold: boolean
    comparison: string
  }
}

interface NextJsBundleInfo {
  pages: Record<string, number>
  chunks: Record<string, number>
  assets: Record<string, number>
}

export class BundleAnalyzer {
  private projectRoot: string
  private buildDir: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
    this.buildDir = join(projectRoot, '.next')
  }

  /**
   * Analyze the built Next.js bundle
   */
  async analyzeBuild(): Promise<BundleAnalysis> {
    if (!existsSync(this.buildDir)) {
      throw new Error('Build directory not found. Run `npm run build` first.')
    }

    const timestamp = new Date().toISOString()
    const chunks = await this.getChunkAnalysis()
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    
    const recommendations = this.generateRecommendations(chunks, totalSize)
    const loadTimeImpact = this.calculateLoadTimeImpact(totalSize)

    return {
      timestamp,
      totalSize,
      chunks,
      recommendations,
      loadTimeImpact
    }
  }

  /**
   * Get detailed chunk analysis from Next.js build
   */
  private async getChunkAnalysis(): Promise<BundleAnalysis['chunks']> {
    const chunks: BundleAnalysis['chunks'] = []

    try {
      // Try to read Next.js build manifest
      const buildManifestPath = join(this.buildDir, 'build-manifest.json')
      if (existsSync(buildManifestPath)) {
        const buildManifest = JSON.parse(readFileSync(buildManifestPath, 'utf8'))
        
        // Analyze static assets
        if (buildManifest.pages) {
          Object.entries(buildManifest.pages).forEach(([pagePath, files]: [string, any]) => {
            if (Array.isArray(files)) {
              files.forEach(file => {
                const filePath = join(this.buildDir, 'static', file)
                if (existsSync(filePath)) {
                  const stats = this.getFileStats(filePath)
                  chunks.push({
                    name: file,
                    size: stats.size,
                    type: this.getFileType(file),
                    path: filePath
                  })
                }
              })
            }
          })
        }
      }

      // Also analyze all files in static directory
      const staticDir = join(this.buildDir, 'static')
      if (existsSync(staticDir)) {
        this.walkDirectory(staticDir, chunks)
      }

      // Analyze public assets
      const publicDir = join(this.projectRoot, 'public')
      if (existsSync(publicDir)) {
        this.walkDirectory(publicDir, chunks, 'public/')
      }

    } catch (error) {
      console.warn('Could not read build manifest, analyzing files directly:', error)
      
      // Fallback: analyze .next directory directly
      this.walkDirectory(this.buildDir, chunks)
    }

    return chunks.sort((a, b) => b.size - a.size)
  }

  /**
   * Walk directory and collect file information
   */
  private walkDirectory(dir: string, chunks: BundleAnalysis['chunks'], prefix = ''): void {
    try {
      const { readdirSync, statSync } = require('fs')
      const files = readdirSync(dir)

      files.forEach(file => {
        const fullPath = join(dir, file)
        const stats = statSync(fullPath)

        if (stats.isDirectory()) {
          this.walkDirectory(fullPath, chunks, `${prefix}${file}/`)
        } else if (stats.isFile() && stats.size > 1024) { // Only files > 1KB
          chunks.push({
            name: `${prefix}${file}`,
            size: stats.size,
            type: this.getFileType(file),
            path: fullPath
          })
        }
      })
    } catch (error) {
      console.warn(`Could not analyze directory ${dir}:`, error)
    }
  }

  /**
   * Get file stats
   */
  private getFileStats(filePath: string): { size: number } {
    try {
      const { statSync } = require('fs')
      return statSync(filePath)
    } catch (error) {
      return { size: 0 }
    }
  }

  /**
   * Determine file type based on extension
   */
  private getFileType(filename: string): 'js' | 'css' | 'image' | 'font' | 'other' {
    const ext = filename.toLowerCase()
    
    if (ext.includes('.js') || ext.includes('.jsx') || ext.includes('.ts') || ext.includes('.tsx')) {
      return 'js'
    }
    if (ext.includes('.css') || ext.includes('.scss') || ext.includes('.less')) {
      return 'css'
    }
    if (ext.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|avif)/)) {
      return 'image'
    }
    if (ext.match(/\.(woff|woff2|ttf|eot|otf)/)) {
      return 'font'
    }
    
    return 'other'
  }

  /**
   * Generate size-based recommendations
   */
  private generateRecommendations(chunks: BundleAnalysis['chunks'], totalSize: number): string[] {
    const recommendations: string[] = []
    const totalSizeMB = totalSize / 1024 / 1024

    // Overall size recommendations
    if (totalSizeMB > 5) {
      recommendations.push('🚨 CRITICAL: Total bundle size exceeds 5MB - significant optimization needed')
    } else if (totalSizeMB > 3) {
      recommendations.push('⚠️ WARNING: Bundle size is large (>3MB) - consider optimization')
    } else if (totalSizeMB > 1.5) {
      recommendations.push('💡 INFO: Bundle size is moderate - optimization opportunities exist')
    } else {
      recommendations.push('✅ Bundle size is good')
    }

    // JavaScript-specific recommendations
    const jsChunks = chunks.filter(chunk => chunk.type === 'js')
    const totalJsSize = jsChunks.reduce((sum, chunk) => sum + chunk.size, 0)
    const jsSizeMB = totalJsSize / 1024 / 1024

    if (jsSizeMB > 2) {
      recommendations.push('⚠️ JavaScript bundle is large - consider code splitting or tree shaking')
    }

    // Find largest chunks
    const largestChunks = chunks.slice(0, 5)
    largestChunks.forEach(chunk => {
      const chunkSizeMB = chunk.size / 1024 / 1024
      if (chunkSizeMB > 1) {
        recommendations.push(`📦 Large chunk identified: ${chunk.name} (${chunkSizeMB.toFixed(2)}MB)`)
      }
    })

    // Image optimization recommendations
    const imageChunks = chunks.filter(chunk => chunk.type === 'image')
    const totalImageSize = imageChunks.reduce((sum, chunk) => sum + chunk.size, 0)
    if (totalImageSize > 500000) { // > 500KB
      recommendations.push('🖼️ Consider image optimization or WebP conversion')
    }

    // Font recommendations
    const fontChunks = chunks.filter(chunk => chunk.type === 'font')
    if (fontChunks.length > 5) {
      recommendations.push('🔤 Many font files detected - consider font subsetting')
    }

    return recommendations
  }

  /**
   * Calculate estimated load time impact
   */
  private calculateLoadTimeImpact(totalSize: number): BundleAnalysis['loadTimeImpact'] {
    // Rough estimation based on average connection speeds
    // 1MB ≈ 1000ms on 3G, 500ms on 4G, 200ms on WiFi
    // Using conservative 3G estimate
    const estimatedLoadTime = Math.min((totalSize / 1024 / 1024) * 1000, 8000)
    const isWithinThreshold = estimatedLoadTime < 3000

    let comparison = ''
    if (estimatedLoadTime < 2000) {
      comparison = 'Excellent - very fast loading'
    } else if (estimatedLoadTime < 3000) {
      comparison = 'Good - within 3 second threshold'
    } else if (estimatedLoadTime < 5000) {
      comparison = 'Needs improvement - exceeds 3 second target'
    } else {
      comparison = 'Poor - significant optimization required'
    }

    return {
      estimatedLoadTime,
      isWithinThreshold,
      comparison
    }
  }

  /**
   * Generate comprehensive bundle report
   */
  async generateReport(): Promise<string> {
    const analysis = await this.analyzeBuild()
    const { totalSize, chunks, recommendations, loadTimeImpact } = analysis

    const report = `# Bundle Size Analysis Report

## Summary
- **Total Bundle Size:** ${(totalSize / 1024 / 1024).toFixed(2)}MB
- **Estimated Load Time:** ${loadTimeImpact.estimatedLoadTime.toFixed(0)}ms
- **Performance Status:** ${loadTimeImpact.comparison}
- **Within 3s Threshold:** ${loadTimeImpact.isWithinThreshold ? '✅ YES' : '❌ NO'}

## Bundle Breakdown by Type
${this.generateTypeBreakdown(chunks)}

## Largest Assets (Top 10)
${chunks.slice(0, 10).map((chunk, index) => 
  `${index + 1}. **${chunk.name}** (${chunk.type}): ${(chunk.size / 1024).toFixed(1)}KB`
).join('\n')}

## Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}

## Load Time Impact Analysis
- **Current Bundle Size:** ${(totalSize / 1024 / 1024).toFixed(2)}MB
- **Estimated Load Time:** ${loadTimeImpact.estimatedLoadTime.toFixed(0)}ms
- **3 Second Threshold:** ${loadTimeImpact.isWithinThreshold ? '✅ PASS' : '❌ FAIL'}

### Bundle Size Targets
| Bundle Size | Expected Load Time | Status |
|-------------|-------------------|--------|
| < 1.5MB     | < 1.5s           | 🟢 Excellent |
| 1.5-3MB     | 1.5-3s           | 🟡 Good |
| 3-5MB       | 3-5s             | 🟠 Needs Improvement |
| > 5MB       | > 5s             | 🔴 Poor |

---
*Generated by MELO V2 Bundle Analyzer - ${analysis.timestamp}*
`

    return report
  }

  /**
   * Generate type breakdown section
   */
  private generateTypeBreakdown(chunks: BundleAnalysis['chunks']): string {
    const typeStats = chunks.reduce((stats, chunk) => {
      if (!stats[chunk.type]) {
        stats[chunk.type] = { size: 0, count: 0 }
      }
      stats[chunk.type].size += chunk.size
      stats[chunk.type].count += 1
      return stats
    }, {} as Record<string, { size: number; count: number }>)

    return Object.entries(typeStats)
      .sort(([, a], [, b]) => b.size - a.size)
      .map(([type, stats]) => 
        `- **${type.toUpperCase()}:** ${(stats.size / 1024 / 1024).toFixed(2)}MB (${stats.count} files)`
      )
      .join('\n')
  }

  /**
   * Integration with existing performance-benchmarks
   */
  async runWithExistingBenchmarks(): Promise<void> {
    const benchmarkScript = join(this.projectRoot, 'performance-benchmarks', 'bundle-analyzer.js')
    
    if (existsSync(benchmarkScript)) {
      console.log('Running existing bundle analyzer...')
      try {
        execSync(`node "${benchmarkScript}"`, { 
          stdio: 'inherit', 
          cwd: this.projectRoot 
        })
      } catch (error) {
        console.warn('Existing bundle analyzer failed, using built-in analysis')
      }
    }

    // Run our analysis
    const analysis = await this.analyzeBuild()
    const report = await this.generateReport()
    
    console.log('\n=== BUNDLE SIZE ANALYSIS ===')
    console.log(report)
    console.log('============================\n')

    return analysis
  }
}