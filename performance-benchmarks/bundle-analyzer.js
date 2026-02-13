#!/usr/bin/env node

/**
 * Enhanced Bundle Analysis for HAOS v2
 * Uses @next/bundle-analyzer to provide detailed bundle information
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class BundleAnalyzer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.resultsDir = path.join(__dirname, 'results');
    this.ensureResultsDir();
  }

  ensureResultsDir() {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async analyzeBundles() {
    console.log('🔍 Starting detailed bundle analysis...');
    
    try {
      // First, ensure bundle analyzer is configured in next.config.js
      await this.ensureBundleAnalyzerConfig();
      
      // Run build with bundle analyzer
      console.log('📦 Building with bundle analyzer...');
      
      process.env.ANALYZE = 'true';
      const buildResult = await execAsync('npm run build', { 
        cwd: this.projectRoot,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      // Analyze the .next directory for bundle information
      const bundleInfo = await this.extractBundleInfo();
      
      // Generate detailed report
      const report = await this.generateBundleReport(bundleInfo);
      
      return {
        success: true,
        buildOutput: buildResult.stdout,
        bundleInfo,
        report
      };
      
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async ensureBundleAnalyzerConfig() {
    const configPath = path.join(this.projectRoot, 'next.config.js');
    
    if (!fs.existsSync(configPath)) {
      throw new Error('next.config.js not found');
    }
    
    const config = fs.readFileSync(configPath, 'utf8');
    
    if (!config.includes('@next/bundle-analyzer')) {
      console.log('⚙️  Bundle analyzer not configured, adding...');
      
      // Simple check to see if it's already configured
      const hasAnalyzer = config.includes('withBundleAnalyzer') || config.includes('@next/bundle-analyzer');
      
      if (!hasAnalyzer) {
        console.log('⚠️  Bundle analyzer configuration not detected');
        console.log('💡 You may need to configure @next/bundle-analyzer manually');
      }
    }
  }

  async extractBundleInfo() {
    const nextDir = path.join(this.projectRoot, '.next');
    const buildManifest = path.join(nextDir, 'build-manifest.json');
    const appBuildManifest = path.join(nextDir, 'app-build-manifest.json');
    
    const info = {
      pages: [],
      chunks: [],
      assets: [],
      totalSize: 0,
      analysisTimestamp: new Date().toISOString()
    };

    try {
      // Read build manifest
      if (fs.existsSync(buildManifest)) {
        const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
        info.buildManifest = manifest;
      }
      
      // Read app build manifest (for app router)
      if (fs.existsSync(appBuildManifest)) {
        const appManifest = JSON.parse(fs.readFileSync(appBuildManifest, 'utf8'));
        info.appBuildManifest = appManifest;
      }
      
      // Analyze static directory
      const staticDir = path.join(nextDir, 'static');
      if (fs.existsSync(staticDir)) {
        info.staticAssets = await this.analyzeStaticDirectory(staticDir);
        info.totalSize = info.staticAssets.reduce((sum, asset) => sum + asset.size, 0);
      }
      
    } catch (error) {
      console.warn('⚠️  Could not extract full bundle info:', error.message);
    }

    return info;
  }

  async analyzeStaticDirectory(dir, basePath = '') {
    const assets = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          const subAssets = await this.analyzeStaticDirectory(fullPath, relativePath);
          assets.push(...subAssets);
        } else {
          const stats = fs.statSync(fullPath);
          assets.push({
            path: relativePath,
            size: stats.size,
            type: this.getAssetType(entry.name),
            sizeHuman: this.formatBytes(stats.size)
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not analyze directory ${dir}:`, error.message);
    }
    
    return assets;
  }

  getAssetType(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    const types = {
      '.js': 'JavaScript',
      '.css': 'CSS',
      '.png': 'Image',
      '.jpg': 'Image',
      '.jpeg': 'Image',
      '.gif': 'Image',
      '.svg': 'Image',
      '.webp': 'Image',
      '.woff': 'Font',
      '.woff2': 'Font',
      '.ttf': 'Font',
      '.eot': 'Font',
      '.json': 'JSON',
      '.map': 'Source Map'
    };
    
    return types[ext] || 'Other';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async generateBundleReport(bundleInfo) {
    const report = {
      summary: {
        totalAssets: bundleInfo.staticAssets?.length || 0,
        totalSize: this.formatBytes(bundleInfo.totalSize || 0),
        totalSizeBytes: bundleInfo.totalSize || 0,
        timestamp: bundleInfo.analysisTimestamp
      },
      byType: {},
      largestAssets: [],
      recommendations: []
    };

    // Group assets by type
    if (bundleInfo.staticAssets) {
      for (const asset of bundleInfo.staticAssets) {
        if (!report.byType[asset.type]) {
          report.byType[asset.type] = {
            count: 0,
            totalSize: 0,
            assets: []
          };
        }
        
        report.byType[asset.type].count++;
        report.byType[asset.type].totalSize += asset.size;
        report.byType[asset.type].assets.push(asset);
      }

      // Find largest assets
      report.largestAssets = bundleInfo.staticAssets
        .sort((a, b) => b.size - a.size)
        .slice(0, 20);

      // Generate recommendations
      report.recommendations = this.generateRecommendations(bundleInfo);
    }

    return report;
  }

  generateRecommendations(bundleInfo) {
    const recommendations = [];

    if (!bundleInfo.staticAssets) {
      return recommendations;
    }

    // Large JS files
    const largeJsFiles = bundleInfo.staticAssets
      .filter(asset => asset.type === 'JavaScript' && asset.size > 100 * 1024) // > 100KB
      .sort((a, b) => b.size - a.size);

    if (largeJsFiles.length > 0) {
      recommendations.push({
        type: 'bundle-size',
        severity: 'warning',
        title: 'Large JavaScript bundles detected',
        description: `Found ${largeJsFiles.length} JavaScript files larger than 100KB`,
        files: largeJsFiles.slice(0, 5).map(f => ({ path: f.path, size: f.sizeHuman })),
        suggestion: 'Consider code splitting, tree shaking, or dynamic imports'
      });
    }

    // Large CSS files
    const largeCssFiles = bundleInfo.staticAssets
      .filter(asset => asset.type === 'CSS' && asset.size > 50 * 1024) // > 50KB
      .sort((a, b) => b.size - a.size);

    if (largeCssFiles.length > 0) {
      recommendations.push({
        type: 'css-size',
        severity: 'info',
        title: 'Large CSS files detected',
        description: `Found ${largeCssFiles.length} CSS files larger than 50KB`,
        files: largeCssFiles.slice(0, 3).map(f => ({ path: f.path, size: f.sizeHuman })),
        suggestion: 'Consider CSS purging, compression, or critical CSS extraction'
      });
    }

    // Total bundle size
    const totalSize = bundleInfo.totalSize || 0;
    if (totalSize > 2 * 1024 * 1024) { // > 2MB
      recommendations.push({
        type: 'total-size',
        severity: 'warning',
        title: 'Large total bundle size',
        description: `Total bundle size is ${this.formatBytes(totalSize)}`,
        suggestion: 'Consider implementing bundle optimization strategies'
      });
    }

    // Many small files (potential over-splitting)
    const smallJsFiles = bundleInfo.staticAssets
      .filter(asset => asset.type === 'JavaScript' && asset.size < 1024); // < 1KB

    if (smallJsFiles.length > 10) {
      recommendations.push({
        type: 'over-splitting',
        severity: 'info',
        title: 'Many small JavaScript files detected',
        description: `Found ${smallJsFiles.length} JavaScript files smaller than 1KB`,
        suggestion: 'Consider consolidating very small chunks to reduce HTTP requests'
      });
    }

    return recommendations;
  }

  async saveReport(report) {
    const filename = `bundle-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(this.resultsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`📊 Bundle analysis report saved to: ${filepath}`);
    
    return filepath;
  }

  async generateMarkdownReport(report) {
    const md = `# HAOS v2 Bundle Analysis Report

**Generated:** ${report.summary.timestamp}  
**Total Assets:** ${report.summary.totalAssets}  
**Total Size:** ${report.summary.totalSize}

## Summary by Asset Type

| Type | Count | Total Size |
|------|-------|------------|
${Object.entries(report.byType).map(([type, data]) => 
  `| ${type} | ${data.count} | ${this.formatBytes(data.totalSize)} |`
).join('\n')}

## Largest Assets (Top 10)

| File | Type | Size |
|------|------|------|
${report.largestAssets.slice(0, 10).map(asset => 
  `| ${asset.path} | ${asset.type} | ${asset.sizeHuman} |`
).join('\n')}

## Recommendations

${report.recommendations.map(rec => `
### ${rec.title} (${rec.severity})

${rec.description}

**Suggestion:** ${rec.suggestion}

${rec.files ? rec.files.map(f => `- ${f.path} (${f.size})`).join('\n') : ''}
`).join('\n')}

## Full Asset List

${report.byType.JavaScript ? `
### JavaScript Files
${report.byType.JavaScript.assets.map(asset => `- ${asset.path} (${asset.sizeHuman})`).join('\n')}
` : ''}

${report.byType.CSS ? `
### CSS Files
${report.byType.CSS.assets.map(asset => `- ${asset.path} (${asset.sizeHuman})`).join('\n')}
` : ''}

---
*Generated by HAOS v2 Bundle Analyzer*
`;

    const filename = `bundle-analysis-${new Date().toISOString().slice(0, 10)}.md`;
    const filepath = path.join(this.resultsDir, filename);
    
    fs.writeFileSync(filepath, md);
    console.log(`📝 Markdown report saved to: ${filepath}`);
    
    return filepath;
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  
  analyzer.analyzeBundles()
    .then(async (result) => {
      if (result.success) {
        await analyzer.saveReport(result);
        await analyzer.generateMarkdownReport(result.report);
        console.log('✅ Bundle analysis complete!');
      } else {
        console.error('❌ Bundle analysis failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = BundleAnalyzer;