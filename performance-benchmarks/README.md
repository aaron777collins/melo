# 🏆 Melo v2 Performance Benchmarking Suite

Comprehensive performance testing tools for the Melo v2 Matrix Discord-clone client.

## 📋 Overview

This benchmarking suite provides multiple levels of performance analysis:

- **Bundle Analysis** - Analyzes build output, bundle sizes, and asset optimization
- **Core Benchmarks** - Tests Matrix SDK performance, memory usage, and basic metrics  
- **Real-time Monitoring** - Browser automation for runtime performance measurement
- **Lighthouse Audit** - Google Lighthouse performance, accessibility, and best practices scores
- **Master Runner** - Orchestrates all tests and generates comprehensive reports

## 🚀 Quick Start

### Run All Benchmarks (Recommended)

```bash
# Run the complete benchmark suite
./run-all-benchmarks.js
```

This will:
1. Check prerequisites and build the project if needed
2. Run all benchmark tests
3. Generate comprehensive reports 
4. Provide actionable recommendations

### Run Individual Tests

```bash
# Bundle analysis only
./bundle-analyzer.js

# Core performance benchmarks
./benchmark.js

# Real-time browser monitoring (requires puppeteer)
./realtime-monitor.js
```

## 📊 What Gets Measured

### Bundle Analysis
- **Asset sizes** - JavaScript, CSS, images, fonts
- **Bundle optimization** - Tree shaking effectiveness, unused code
- **Load performance** - First-party vs third-party assets
- **Recommendations** - Size thresholds, optimization opportunities

### Core Benchmarks  
- **Matrix SDK performance** - Client initialization time, event processing
- **Memory usage** - Heap size, memory leaks, garbage collection
- **Synthetic workloads** - Event creation, processing throughput

### Real-time Monitoring
- **Page load metrics** - FCP, LCP, CLS from Navigation Timing API
- **User interaction performance** - Click responsiveness, scroll performance
- **Network performance** - Request/response times, success rates
- **Memory trends** - Runtime memory usage patterns

### Lighthouse Audit
- **Performance score** - Core Web Vitals, loading performance
- **Accessibility** - ARIA compliance, keyboard navigation
- **Best practices** - Security, modern web standards
- **SEO** - Meta tags, structured data

## 📁 Output Files

All results are saved to `./results/` directory:

| File Pattern | Description |
|--------------|-------------|
| `MASTER-PERFORMANCE-REPORT-YYYY-MM-DD.md` | **Primary report** with executive summary |
| `master-benchmark-results-*.json` | Complete raw data from all tests |
| `bundle-analysis-*.json` | Bundle analysis data |
| `bundle-analysis-*.md` | Bundle analysis report |
| `benchmark-results-*.json` | Core benchmark data |
| `benchmark-report-*.md` | Core benchmark report |
| `realtime-monitoring-*.json` | Browser automation data |
| `realtime-monitoring-*.md` | Runtime performance report |
| `lighthouse-*.json` | Lighthouse audit data |

## 🔧 Prerequisites

### Required
- Node.js 18+ (for Matrix SDK and Next.js)
- npm/yarn package manager  
- Built Next.js application (`npm run build`)

### Optional (Auto-installed)
- **Puppeteer** - For real-time browser monitoring
- **Lighthouse** - For Google Lighthouse audits
- **Bundle Analyzer** - Enhanced bundle analysis

The master runner will automatically install missing dependencies.

## ⚙️ Configuration

### Environment Variables
```bash
# Port for test server (default: 3000 for dev, 3001 for production)
PORT=3000

# Lighthouse analysis settings
ANALYZE=true

# Browser automation settings (for realtime monitoring)  
HEADLESS=true
```

### Customizing Tests

Edit the individual benchmark files to adjust:

- **Test duration** - How long to run monitoring tests
- **Sample intervals** - How often to collect metrics
- **Thresholds** - Warning/error levels for different metrics
- **Test scenarios** - User interaction patterns to simulate

## 📈 Understanding Results

### Overall Score
- **🟢 Excellent** - No critical issues, minimal warnings
- **🟡 Good** - Some minor optimizations needed  
- **🔴 Needs Improvement** - Critical performance issues require attention

### Key Performance Indicators

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| **Lighthouse Performance** | 90+ | 70-89 | <70 |
| **Bundle Size** | <2MB | 2-5MB | >5MB |
| **FCP (First Contentful Paint)** | <1.8s | 1.8-3s | >3s |
| **LCP (Largest Contentful Paint)** | <2.5s | 2.5-4s | >4s |
| **Memory Growth** | <10% | 10-20% | >20% |

### Interpreting Recommendations

The reports categorize issues by severity:

- **🔴 Critical** - Immediate action required, impacts user experience
- **🟡 Warning** - Optimization opportunities, future improvements
- **ℹ️ Info** - Best practices, nice-to-have improvements

## 🔄 Integration

### CI/CD Pipeline
```yaml
# Example GitHub Actions integration
- name: Performance Benchmarks
  run: |
    npm install
    npm run build
    cd performance-benchmarks
    ./run-all-benchmarks.js
    
- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: performance-reports
    path: performance-benchmarks/results/
```

### Performance Budgets
Use the baseline from these benchmarks to set performance budgets:

```json
{
  "budgets": {
    "lighthouse": {
      "performance": 85,
      "accessibility": 95
    },
    "bundle": {
      "maxSize": "3MB"
    },
    "runtime": {
      "maxNavigationTime": 3000
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**Build fails before benchmarking**
```bash
# Fix TypeScript errors, then run:
npm run build
```

**Puppeteer installation fails**
```bash
# Install manually with specific Chromium version:
npm install puppeteer --save-dev
```

**Lighthouse command not found**
```bash
# Install globally:
npm install -g lighthouse
```

**Permission denied on scripts**
```bash
# Make scripts executable:
chmod +x *.js
```

### Debug Mode

For verbose output and debugging:

```bash
# Enable debug logging
DEBUG=1 ./run-all-benchmarks.js

# Run individual tests with error details
node --trace-warnings ./benchmark.js
```

## 🤝 Contributing

### Adding New Tests

1. Create new benchmark module in this directory
2. Export a class with `async run()` method
3. Add to `run-all-benchmarks.js` orchestrator
4. Update this README with test description

### Improving Existing Tests

- Add new metrics to measure
- Improve test reliability and accuracy  
- Enhance reporting and visualization
- Add platform-specific optimizations

## 📝 License

Same as parent project. See main README for details.

---

## 🔗 Related Documentation

- [Melo v2 Main README](../README.md)
- [Matrix SDK Documentation](https://matrix-org.github.io/matrix-js-sdk/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Google Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Web Performance Metrics](https://web.dev/metrics/)

---

*Generated by Melo v2 Performance Benchmarking Suite*