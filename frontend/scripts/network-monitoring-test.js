#!/usr/bin/env node

/**
 * Network Request Monitoring Test for 3D Model Loading
 * 
 * This script provides comprehensive network request monitoring specifically
 * for 3D model loading scenarios. It tracks timing, caching, file sizes,
 * and provides detailed analysis of network behavior during model loading.
 * 
 * Features:
 * - Detailed network request timing analysis
 * - Model file size and compression analysis
 * - Cache behavior monitoring
 * - Progressive loading detection
 * - Network error categorization
 * - Performance recommendations
 * - WebP/texture optimization analysis
 * 
 * Usage:
 *   node scripts/network-monitoring-test.js [options]
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class NetworkMonitoringTest {
  constructor(options = {}) {
    this.baseUrl = options.url || 'http://localhost:3000';
    this.timeout = options.timeout || 60000;
    this.outputDir = options.output || './network-monitoring-reports';
    this.verbose = options.verbose || false;
    this.headless = options.headless !== false;
    this.monitorDuration = options.monitorDuration || 30000;
    this.capturePayloads = options.capturePayloads || false;
    
    this.networkRequests = new Map();
    this.requestTimeline = [];
    this.cacheAnalysis = new Map();
    this.sizeAnalysis = {
      modelFiles: [],
      textureFiles: [],
      totalBytes: 0
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      testUrl: `${this.baseUrl}/dragons/webgl-3d`,
      configuration: {
        monitorDuration: this.monitorDuration,
        capturePayloads: this.capturePayloads,
        timeout: this.timeout
      },
      networkAnalysis: {
        requests: [],
        timeline: [],
        timing: {},
        caching: {},
        sizes: {},
        errors: [],
        recommendations: []
      },
      summary: {}
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    if (level === 'error' || this.verbose) {
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  async setupOutputDirectory() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      this.log(`Output directory created: ${this.outputDir}`);
    } catch (error) {
      this.log(`Failed to create output directory: ${error.message}`, 'error');
      throw error;
    }
  }

  async launchBrowser() {
    this.log('Launching browser for network monitoring...');
    
    const browserArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--enable-logging',
      '--log-level=0',
      '--enable-features=NetworkService,NetworkServiceLogging',
      '--disable-extensions',
      '--disable-plugins'
    ];

    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: browserArgs,
      defaultViewport: { width: 1920, height: 1080 }
    });

    this.page = await this.browser.newPage();
    
    // Enable network domain for detailed monitoring
    await this.page._client.send('Network.enable');
    await this.page._client.send('Runtime.enable');
    
    this.log('Browser launched with network monitoring enabled');
  }

  async setupNetworkMonitoring() {
    this.log('Setting up comprehensive network monitoring...');

    // Monitor network requests with detailed timing
    this.page.on('request', (request) => {
      const requestId = this.generateRequestId(request);
      const requestData = {
        id: requestId,
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        resourceType: request.resourceType(),
        timestamp: Date.now(),
        initiator: request.frame() ? request.frame().url() : 'unknown',
        isModelFile: this.isModelFile(request.url()),
        isTextureFile: this.isTextureFile(request.url()),
        phase: 'request'
      };
      
      this.networkRequests.set(requestId, requestData);
      this.requestTimeline.push({ ...requestData, event: 'request-start' });
      
      if (requestData.isModelFile || requestData.isTextureFile) {
        this.log(`${requestData.isModelFile ? 'Model' : 'Texture'} request: ${request.url()}`);
      }
    });

    // Monitor responses with timing and size data
    this.page.on('response', async (response) => {
      const request = response.request();
      const requestId = this.generateRequestId(request);
      const requestData = this.networkRequests.get(requestId);
      
      if (requestData) {
        const responseTime = Date.now() - requestData.timestamp;
        const headers = response.headers();
        
        const responseData = {
          ...requestData,
          status: response.status(),
          statusText: response.statusText(),
          responseHeaders: headers,
          responseTime,
          contentType: headers['content-type'],
          contentLength: parseInt(headers['content-length']) || 0,
          contentEncoding: headers['content-encoding'],
          cacheControl: headers['cache-control'],
          etag: headers['etag'],
          lastModified: headers['last-modified'],
          fromCache: response.fromCache(),
          fromServiceWorker: response.fromServiceWorker(),
          securityState: response.securityDetails() ? 'secure' : 'insecure',
          phase: 'response'
        };

        // Capture response body if requested and file is relevant
        if (this.capturePayloads && (requestData.isModelFile || requestData.isTextureFile)) {
          try {
            const buffer = await response.buffer();
            responseData.bodySize = buffer.length;
            responseData.bodyHash = crypto.createHash('md5').update(buffer).digest('hex');
            
            // Analyze file format
            responseData.fileFormat = this.analyzeFileFormat(buffer, requestData.url);
            
            if (this.capturePayloads) {
              // Save payload for analysis
              const filename = this.sanitizeFilename(requestData.url);
              const payloadPath = path.join(this.outputDir, 'payloads', filename);
              await fs.mkdir(path.dirname(payloadPath), { recursive: true });
              await fs.writeFile(payloadPath, buffer);
              responseData.payloadPath = payloadPath;
            }
          } catch (error) {
            this.log(`Failed to capture payload for ${requestData.url}: ${error.message}`, 'error');
          }
        }

        this.networkRequests.set(requestId, responseData);
        this.requestTimeline.push({ ...responseData, event: 'response-received' });
        
        // Analyze caching behavior
        this.analyzeCachingBehavior(responseData);
        
        // Analyze file sizes
        this.analyzeSizes(responseData);
        
        this.log(`Response: ${request.url()} - ${response.status()} (${responseTime}ms, ${responseData.contentLength || responseData.bodySize || 0} bytes)`);
      }
    });

    // Monitor failed requests
    this.page.on('requestfailed', (request) => {
      const requestId = this.generateRequestId(request);
      const requestData = this.networkRequests.get(requestId);
      
      if (requestData) {
        const failureData = {
          ...requestData,
          failed: true,
          failure: request.failure(),
          responseTime: Date.now() - requestData.timestamp,
          phase: 'failed'
        };
        
        this.networkRequests.set(requestId, failureData);
        this.requestTimeline.push({ ...failureData, event: 'request-failed' });
        this.results.networkAnalysis.errors.push(failureData);
        
        this.log(`Request failed: ${request.url()} - ${request.failure().errorText}`, 'error');
      }
    });

    // Monitor resource loading events from the page
    await this.page.evaluateOnNewDocument(() => {
      window.networkMonitoringData = {
        resourceLoadTimes: new Map(),
        performanceEntries: []
      };

      // Override fetch to monitor model loading
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const startTime = performance.now();
        const url = args[0];
        
        return originalFetch.apply(this, args).then(response => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          window.networkMonitoringData.resourceLoadTimes.set(url, {
            startTime,
            endTime,
            duration,
            size: response.headers.get('content-length'),
            cached: response.headers.get('cf-cache-status') === 'HIT' || 
                   response.headers.get('x-cache') === 'HIT'
          });
          
          return response;
        });
      };

      // Monitor resource timing API
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('.glb') || entry.name.includes('.gltf') || 
              entry.name.includes('model') || entry.name.includes('texture')) {
            window.networkMonitoringData.performanceEntries.push({
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration,
              transferSize: entry.transferSize,
              encodedBodySize: entry.encodedBodySize,
              decodedBodySize: entry.decodedBodySize,
              responseStart: entry.responseStart,
              responseEnd: entry.responseEnd
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
    });
  }

  generateRequestId(request) {
    return crypto.createHash('md5').update(request.url() + request.method()).digest('hex').substring(0, 8);
  }

  isModelFile(url) {
    return /\.(glb|gltf|obj|fbx|dae|bin)(\?|$)/i.test(url) || url.includes('model');
  }

  isTextureFile(url) {
    return /\.(png|jpg|jpeg|webp|ktx|dds|hdr|exr)(\?|$)/i.test(url) || url.includes('texture');
  }

  sanitizeFilename(url) {
    return url.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100);
  }

  analyzeFileFormat(buffer, url) {
    const analysis = {
      detectedFormat: 'unknown',
      size: buffer.length,
      compression: 'none',
      isOptimized: false
    };

    // Check file signatures
    const header = buffer.slice(0, 16);
    const headerHex = header.toString('hex');
    
    if (headerHex.startsWith('676c5446')) { // glTF binary
      analysis.detectedFormat = 'glb';
      analysis.compression = 'binary';
      analysis.isOptimized = true;
    } else if (buffer.toString('ascii', 0, 8).includes('glTF')) {
      analysis.detectedFormat = 'gltf';
      analysis.compression = 'json';
    } else if (headerHex.startsWith('89504e47')) { // PNG
      analysis.detectedFormat = 'png';
      analysis.compression = 'lossless';
    } else if (headerHex.startsWith('ffd8ff')) { // JPEG
      analysis.detectedFormat = 'jpeg';
      analysis.compression = 'lossy';
    } else if (headerHex.startsWith('52494646') && buffer.toString('ascii', 8, 12) === 'WEBP') {
      analysis.detectedFormat = 'webp';
      analysis.compression = 'optimized';
      analysis.isOptimized = true;
    }

    // Analyze compression ratio
    if (url.includes('.gz') || url.includes('gzip')) {
      analysis.compression = 'gzip';
    }

    return analysis;
  }

  analyzeCachingBehavior(responseData) {
    const cacheKey = responseData.url;
    const cacheInfo = {
      url: cacheKey,
      fromCache: responseData.fromCache,
      fromServiceWorker: responseData.fromServiceWorker,
      cacheControl: responseData.cacheControl,
      etag: responseData.etag,
      lastModified: responseData.lastModified,
      cacheable: this.isCacheable(responseData),
      cacheStrategy: this.determineCacheStrategy(responseData)
    };

    this.cacheAnalysis.set(cacheKey, cacheInfo);
  }

  isCacheable(responseData) {
    if (responseData.fromCache || responseData.fromServiceWorker) {
      return true;
    }

    const cacheControl = responseData.cacheControl;
    if (cacheControl) {
      return !cacheControl.includes('no-cache') && !cacheControl.includes('no-store');
    }

    return responseData.etag || responseData.lastModified;
  }

  determineCacheStrategy(responseData) {
    if (responseData.fromServiceWorker) return 'service-worker';
    if (responseData.fromCache) return 'browser-cache';
    if (responseData.cacheControl?.includes('immutable')) return 'immutable';
    if (responseData.cacheControl?.includes('max-age')) return 'max-age';
    if (responseData.etag) return 'etag';
    if (responseData.lastModified) return 'last-modified';
    return 'no-cache';
  }

  analyzeSizes(responseData) {
    const size = responseData.contentLength || responseData.bodySize || 0;
    
    if (responseData.isModelFile) {
      this.sizeAnalysis.modelFiles.push({
        url: responseData.url,
        size,
        format: responseData.fileFormat?.detectedFormat || 'unknown',
        compressed: responseData.contentEncoding === 'gzip' || responseData.contentEncoding === 'br',
        optimized: responseData.fileFormat?.isOptimized || false
      });
    } else if (responseData.isTextureFile) {
      this.sizeAnalysis.textureFiles.push({
        url: responseData.url,
        size,
        format: responseData.fileFormat?.detectedFormat || 'unknown',
        compressed: responseData.contentEncoding === 'gzip' || responseData.contentEncoding === 'br',
        optimized: responseData.fileFormat?.isOptimized || false
      });
    }
    
    this.sizeAnalysis.totalBytes += size;
  }

  async navigateAndMonitor() {
    this.log(`Navigating to target page: ${this.results.testUrl}`);
    
    const startTime = Date.now();
    
    try {
      await this.page.goto(this.results.testUrl, {
        waitUntil: 'networkidle0',
        timeout: this.timeout
      });

      this.log('Page loaded, monitoring network activity...');
      
      // Monitor for the specified duration
      await this.page.waitForTimeout(this.monitorDuration);
      
      // Get performance data from the page
      const pagePerformanceData = await this.page.evaluate(() => {
        return {
          resourceLoadTimes: Array.from(window.networkMonitoringData?.resourceLoadTimes?.entries() || []),
          performanceEntries: window.networkMonitoringData?.performanceEntries || [],
          navigationTiming: {
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
            firstPaint: performance.getEntriesByType('paint').find(e => e.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime || 0
          }
        };
      });

      const totalTime = Date.now() - startTime;
      this.log(`Network monitoring completed in ${totalTime}ms`);
      
      return {
        success: true,
        duration: totalTime,
        pagePerformanceData
      };

    } catch (error) {
      this.log(`Navigation failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  async analyzeNetworkBehavior() {
    this.log('Analyzing network behavior...');

    const requests = Array.from(this.networkRequests.values());
    const modelRequests = requests.filter(r => r.isModelFile);
    const textureRequests = requests.filter(r => r.isTextureFile);
    const failedRequests = requests.filter(r => r.failed);

    // Timing analysis
    const timingAnalysis = {
      totalRequests: requests.length,
      modelRequests: modelRequests.length,
      textureRequests: textureRequests.length,
      failedRequests: failedRequests.length,
      averageResponseTime: requests.reduce((sum, r) => sum + (r.responseTime || 0), 0) / requests.length,
      slowestRequest: requests.reduce((slowest, r) => 
        (r.responseTime || 0) > (slowest.responseTime || 0) ? r : slowest, { responseTime: 0 }),
      fastestRequest: requests.reduce((fastest, r) => 
        (r.responseTime || 0) < (fastest.responseTime || Infinity) ? r : fastest, { responseTime: Infinity })
    };

    // Caching analysis
    const cacheAnalysis = {
      totalCacheable: Array.from(this.cacheAnalysis.values()).filter(c => c.cacheable).length,
      fromCache: Array.from(this.cacheAnalysis.values()).filter(c => c.fromCache).length,
      fromServiceWorker: Array.from(this.cacheAnalysis.values()).filter(c => c.fromServiceWorker).length,
      strategies: Array.from(this.cacheAnalysis.values()).reduce((acc, c) => {
        acc[c.cacheStrategy] = (acc[c.cacheStrategy] || 0) + 1;
        return acc;
      }, {})
    };

    // Size analysis
    const sizeAnalysis = {
      totalBytes: this.sizeAnalysis.totalBytes,
      totalMB: this.sizeAnalysis.totalBytes / (1024 * 1024),
      modelFiles: {
        count: this.sizeAnalysis.modelFiles.length,
        totalBytes: this.sizeAnalysis.modelFiles.reduce((sum, f) => sum + f.size, 0),
        averageSize: this.sizeAnalysis.modelFiles.reduce((sum, f) => sum + f.size, 0) / this.sizeAnalysis.modelFiles.length,
        largestFile: this.sizeAnalysis.modelFiles.reduce((largest, f) => f.size > largest.size ? f : largest, { size: 0 }),
        optimizedCount: this.sizeAnalysis.modelFiles.filter(f => f.optimized).length,
        compressedCount: this.sizeAnalysis.modelFiles.filter(f => f.compressed).length
      },
      textureFiles: {
        count: this.sizeAnalysis.textureFiles.length,
        totalBytes: this.sizeAnalysis.textureFiles.reduce((sum, f) => sum + f.size, 0),
        averageSize: this.sizeAnalysis.textureFiles.reduce((sum, f) => sum + f.size, 0) / this.sizeAnalysis.textureFiles.length,
        largestFile: this.sizeAnalysis.textureFiles.reduce((largest, f) => f.size > largest.size ? f : largest, { size: 0 }),
        optimizedCount: this.sizeAnalysis.textureFiles.filter(f => f.optimized).length,
        compressedCount: this.sizeAnalysis.textureFiles.filter(f => f.compressed).length
      }
    };

    // Progressive loading analysis
    const progressiveAnalysis = this.analyzeProgressiveLoading(requests);

    // Generate recommendations
    const recommendations = this.generateNetworkRecommendations(timingAnalysis, cacheAnalysis, sizeAnalysis, progressiveAnalysis);

    this.results.networkAnalysis = {
      requests: requests.map(r => ({
        url: r.url,
        method: r.method,
        status: r.status,
        responseTime: r.responseTime,
        size: r.contentLength || r.bodySize || 0,
        cached: r.fromCache,
        isModelFile: r.isModelFile,
        isTextureFile: r.isTextureFile,
        failed: r.failed
      })),
      timeline: this.requestTimeline,
      timing: timingAnalysis,
      caching: cacheAnalysis,
      sizes: sizeAnalysis,
      progressive: progressiveAnalysis,
      errors: failedRequests,
      recommendations
    };

    return this.results.networkAnalysis;
  }

  analyzeProgressiveLoading(requests) {
    // Look for evidence of progressive loading patterns
    const modelRequests = requests.filter(r => r.isModelFile);
    const sortedByTime = modelRequests.sort((a, b) => a.timestamp - b.timestamp);
    
    const analysis = {
      hasProgressiveLoading: false,
      loadingStages: [],
      parallelRequests: 0,
      loadingPattern: 'unknown'
    };

    if (sortedByTime.length === 0) {
      return analysis;
    }

    // Check for parallel vs sequential loading
    const timeWindows = [];
    let currentWindow = { start: sortedByTime[0].timestamp, requests: [sortedByTime[0]] };
    
    for (let i = 1; i < sortedByTime.length; i++) {
      const request = sortedByTime[i];
      const timeDiff = request.timestamp - currentWindow.start;
      
      if (timeDiff < 1000) { // Within 1 second = parallel
        currentWindow.requests.push(request);
      } else {
        timeWindows.push(currentWindow);
        currentWindow = { start: request.timestamp, requests: [request] };
      }
    }
    timeWindows.push(currentWindow);

    analysis.loadingStages = timeWindows.length;
    analysis.parallelRequests = Math.max(...timeWindows.map(w => w.requests.length));
    
    if (timeWindows.length > 1) {
      analysis.hasProgressiveLoading = true;
      analysis.loadingPattern = 'progressive';
    } else if (analysis.parallelRequests > 1) {
      analysis.loadingPattern = 'parallel';
    } else {
      analysis.loadingPattern = 'sequential';
    }

    return analysis;
  }

  generateNetworkRecommendations(timing, caching, sizes, progressive) {
    const recommendations = [];

    // Performance recommendations
    if (timing.averageResponseTime > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Average response time is high (${timing.averageResponseTime.toFixed(0)}ms)`,
        solution: 'Consider using a CDN, compressing files, or implementing progressive loading'
      });
    }

    if (timing.slowestRequest.responseTime > 10000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Slowest request took ${timing.slowestRequest.responseTime.toFixed(0)}ms: ${timing.slowestRequest.url}`,
        solution: 'Optimize this specific file or implement lazy loading'
      });
    }

    // Size recommendations
    if (sizes.totalMB > 50) {
      recommendations.push({
        type: 'size',
        priority: 'medium',
        message: `Total download size is large (${sizes.totalMB.toFixed(1)}MB)`,
        solution: 'Consider model optimization, texture compression, or progressive loading'
      });
    }

    if (sizes.modelFiles.count > 0 && sizes.modelFiles.optimizedCount / sizes.modelFiles.count < 0.5) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        message: 'Less than 50% of model files are optimized',
        solution: 'Use GLB format and Draco compression for better performance'
      });
    }

    if (sizes.textureFiles.count > 0 && sizes.textureFiles.optimizedCount / sizes.textureFiles.count < 0.5) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        message: 'Less than 50% of texture files are optimized',
        solution: 'Consider using WebP format and texture compression'
      });
    }

    // Caching recommendations
    if (caching.totalCacheable > 0 && caching.fromCache / caching.totalCacheable < 0.3) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        message: 'Low cache hit rate for static assets',
        solution: 'Implement proper cache headers and consider service worker caching'
      });
    }

    // Progressive loading recommendations
    if (!progressive.hasProgressiveLoading && sizes.modelFiles.count > 1) {
      recommendations.push({
        type: 'loading',
        priority: 'low',
        message: 'No progressive loading detected',
        solution: 'Consider implementing progressive or lazy loading for better user experience'
      });
    }

    return recommendations;
  }

  async generateReport() {
    this.log('Generating network monitoring report...');

    this.results.summary = {
      totalRequests: this.results.networkAnalysis.requests.length,
      modelRequests: this.results.networkAnalysis.requests.filter(r => r.isModelFile).length,
      textureRequests: this.results.networkAnalysis.requests.filter(r => r.isTextureFile).length,
      failedRequests: this.results.networkAnalysis.errors.length,
      totalSizeMB: this.results.networkAnalysis.sizes.totalMB,
      averageResponseTime: this.results.networkAnalysis.timing.averageResponseTime,
      cacheHitRate: this.results.networkAnalysis.caching.fromCache / Math.max(this.results.networkAnalysis.caching.totalCacheable, 1),
      recommendations: this.results.networkAnalysis.recommendations.length
    };

    const reportPath = path.join(this.outputDir, `network-monitoring-${Date.now()}.json`);
    const textReportPath = path.join(this.outputDir, `network-monitoring-${Date.now()}.txt`);

    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    await fs.writeFile(textReportPath, this.generateTextReport());

    this.log(`Network monitoring report saved to: ${reportPath}`);
    return { reportPath, textReportPath };
  }

  generateTextReport() {
    const summary = [];
    summary.push('='.repeat(60));
    summary.push('NETWORK MONITORING REPORT - 3D MODEL LOADING');
    summary.push('='.repeat(60));
    summary.push('');
    summary.push(`Timestamp: ${this.results.timestamp}`);
    summary.push(`Test URL: ${this.results.testUrl}`);
    summary.push(`Monitor Duration: ${this.results.configuration.monitorDuration}ms`);
    summary.push('');

    // Request Summary
    summary.push('REQUEST SUMMARY:');
    summary.push('-'.repeat(30));
    summary.push(`Total Requests: ${this.results.summary.totalRequests}`);
    summary.push(`Model File Requests: ${this.results.summary.modelRequests}`);
    summary.push(`Texture File Requests: ${this.results.summary.textureRequests}`);
    summary.push(`Failed Requests: ${this.results.summary.failedRequests}`);
    summary.push('');

    // Timing Analysis
    summary.push('TIMING ANALYSIS:');
    summary.push('-'.repeat(30));
    summary.push(`Average Response Time: ${this.results.summary.averageResponseTime.toFixed(0)}ms`);
    summary.push(`Slowest Request: ${this.results.networkAnalysis.timing.slowestRequest.url} (${this.results.networkAnalysis.timing.slowestRequest.responseTime}ms)`);
    summary.push(`Fastest Request: ${this.results.networkAnalysis.timing.fastestRequest.url} (${this.results.networkAnalysis.timing.fastestRequest.responseTime}ms)`);
    summary.push('');

    // Size Analysis
    summary.push('SIZE ANALYSIS:');
    summary.push('-'.repeat(30));
    summary.push(`Total Download Size: ${this.results.summary.totalSizeMB.toFixed(2)}MB`);
    summary.push(`Model Files: ${this.results.networkAnalysis.sizes.modelFiles.count} files, ${(this.results.networkAnalysis.sizes.modelFiles.totalBytes / (1024 * 1024)).toFixed(2)}MB`);
    summary.push(`Texture Files: ${this.results.networkAnalysis.sizes.textureFiles.count} files, ${(this.results.networkAnalysis.sizes.textureFiles.totalBytes / (1024 * 1024)).toFixed(2)}MB`);
    summary.push('');

    // Cache Analysis
    summary.push('CACHE ANALYSIS:');
    summary.push('-'.repeat(30));
    summary.push(`Cache Hit Rate: ${(this.results.summary.cacheHitRate * 100).toFixed(1)}%`);
    summary.push(`Cached Responses: ${this.results.networkAnalysis.caching.fromCache}`);
    summary.push(`Service Worker Responses: ${this.results.networkAnalysis.caching.fromServiceWorker}`);
    summary.push('');

    // Progressive Loading
    summary.push('LOADING PATTERN:');
    summary.push('-'.repeat(30));
    summary.push(`Pattern: ${this.results.networkAnalysis.progressive.loadingPattern}`);
    summary.push(`Progressive Loading: ${this.results.networkAnalysis.progressive.hasProgressiveLoading ? 'Yes' : 'No'}`);
    summary.push(`Loading Stages: ${this.results.networkAnalysis.progressive.loadingStages}`);
    summary.push(`Max Parallel Requests: ${this.results.networkAnalysis.progressive.parallelRequests}`);
    summary.push('');

    // Recommendations
    if (this.results.networkAnalysis.recommendations.length > 0) {
      summary.push('RECOMMENDATIONS:');
      summary.push('-'.repeat(30));
      this.results.networkAnalysis.recommendations.forEach((rec, index) => {
        summary.push(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        summary.push(`   Solution: ${rec.solution}`);
        summary.push('');
      });
    }

    return summary.join('\\n');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('Browser closed');
    }
  }

  async run() {
    try {
      await this.setupOutputDirectory();
      await this.launchBrowser();
      await this.setupNetworkMonitoring();
      
      const navigationResult = await this.navigateAndMonitor();
      if (!navigationResult.success) {
        throw new Error(navigationResult.error);
      }

      await this.analyzeNetworkBehavior();
      const reportPaths = await this.generateReport();
      
      console.log('\\n' + this.generateTextReport());
      
      return {
        success: true,
        results: this.results,
        reportPaths
      };

    } catch (error) {
      this.log(`Network monitoring failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        results: this.results
      };
    } finally {
      await this.cleanup();
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        options.url = args[++i];
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--monitor-duration':
        options.monitorDuration = parseInt(args[++i]);
        break;
      case '--capture-payloads':
        options.capturePayloads = true;
        break;
      case '--headless':
        options.headless = args[++i] !== 'false';
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
Network Request Monitoring for 3D Model Loading

Usage: node scripts/network-monitoring-test.js [options]

Options:
  --url <url>              Target URL (default: http://localhost:3000)
  --timeout <ms>           Navigation timeout (default: 60000)
  --output <dir>           Output directory (default: ./network-monitoring-reports)
  --monitor-duration <ms>  How long to monitor network activity (default: 30000)
  --capture-payloads       Capture and save response payloads for analysis
  --headless <bool>        Run in headless mode (default: true)
  --verbose                Enable verbose logging
  --help                   Show this help message

Examples:
  node scripts/network-monitoring-test.js --verbose --capture-payloads
  node scripts/network-monitoring-test.js --url http://localhost:4000 --monitor-duration 60000
        `);
        process.exit(0);
        break;
    }
  }

  console.log('🌐 Starting Network Request Monitoring for 3D Model Loading...');
  console.log(`Target: ${options.url || 'http://localhost:3000'}/dragons/webgl-3d`);
  console.log(`Monitor Duration: ${options.monitorDuration || 30000}ms`);
  console.log('');

  const monitor = new NetworkMonitoringTest(options);
  const result = await monitor.run();

  if (result.success) {
    console.log(`\\n✅ Network monitoring completed successfully!`);
    console.log(`Reports saved to: ${result.reportPaths.reportPath}`);
    process.exit(0);
  } else {
    console.log(`\\n❌ Network monitoring failed: ${result.error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { NetworkMonitoringTest };