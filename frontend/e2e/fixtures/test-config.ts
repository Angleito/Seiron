/**
 * Test Configuration and Fixtures for 3D Model Loading Tests
 * 
 * This file contains shared configuration, test data, and utilities
 * used across the 3D model loading test suite.
 */

export interface TestEnvironment {
  name: string;
  description: string;
  expectWebGL: boolean;
  expectFallback: boolean;
  timeoutMultiplier: number;
  browserArgs?: string[];
}

export interface ModelTestData {
  url: string;
  expectedFormat: string;
  maxSizeBytes: number;
  requiresAuth: boolean;
  supportsProgressive: boolean;
}

export interface DragonTestExpectations {
  minCanvasElements: number;
  minDragonElements: number;
  maxLoadingTime: number;
  maxMemoryUsageMB: number;
  allowedFallbackModes: string[];
}

// Test environment configurations
export const TEST_ENVIRONMENTS: Record<string, TestEnvironment> = {
  docker: {
    name: 'Docker Container',
    description: 'Headless Docker environment with limited WebGL',
    expectWebGL: false,
    expectFallback: true,
    timeoutMultiplier: 2,
    browserArgs: [
      '--headless=new',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--use-gl=swiftshader'
    ]
  },
  
  browser: {
    name: 'Standard Browser',
    description: 'Full browser environment with WebGL support',
    expectWebGL: true,
    expectFallback: false,
    timeoutMultiplier: 1
  },
  
  lowEnd: {
    name: 'Low-End Device',
    description: 'Simulated low-end device with limited resources',
    expectWebGL: false,
    expectFallback: true,
    timeoutMultiplier: 3,
    browserArgs: [
      '--memory-pressure-off',
      '--max_old_space_size=512',
      '--disable-gpu'
    ]
  },
  
  mobile: {
    name: 'Mobile Device',
    description: 'Mobile device simulation',
    expectWebGL: true,
    expectFallback: false,
    timeoutMultiplier: 2
  }
};

// Model files to test
export const TEST_MODEL_FILES: Record<string, ModelTestData> = {
  dragonHead: {
    url: '/models/dragon_head.glb',
    expectedFormat: 'glb',
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    requiresAuth: false,
    supportsProgressive: false
  },
  
  dragonHeadOptimized: {
    url: '/models/dragon_head_optimized.glb',
    expectedFormat: 'glb',
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    requiresAuth: false,
    supportsProgressive: false
  },
  
  seiron: {
    url: '/models/seiron.glb',
    expectedFormat: 'glb',
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    requiresAuth: false,
    supportsProgressive: false
  },
  
  seironAnimated: {
    url: '/models/seiron_animated.gltf',
    expectedFormat: 'gltf',
    maxSizeBytes: 15 * 1024 * 1024, // 15MB
    requiresAuth: false,
    supportsProgressive: true
  }
};

// Dragon test expectations by environment
export const DRAGON_EXPECTATIONS: Record<string, DragonTestExpectations> = {
  docker: {
    minCanvasElements: 0, // May use ASCII fallback
    minDragonElements: 1,
    maxLoadingTime: 15000,
    maxMemoryUsageMB: 200,
    allowedFallbackModes: ['ascii', 'mock', 'canvas2d']
  },
  
  browser: {
    minCanvasElements: 1,
    minDragonElements: 1,
    maxLoadingTime: 8000,
    maxMemoryUsageMB: 500,
    allowedFallbackModes: ['webgl', '3d']
  },
  
  lowEnd: {
    minCanvasElements: 0,
    minDragonElements: 1,
    maxLoadingTime: 20000,
    maxMemoryUsageMB: 150,
    allowedFallbackModes: ['ascii', 'mock', 'canvas2d', 'sprite2d']
  },
  
  mobile: {
    minCanvasElements: 1,
    minDragonElements: 1,
    maxLoadingTime: 12000,
    maxMemoryUsageMB: 300,
    allowedFallbackModes: ['webgl', '3d', 'canvas2d']
  }
};

// Test selectors for different dragon components
export const DRAGON_SELECTORS = {
  // Unified DragonRenderer
  dragonRenderer: '[data-component="DragonRenderer"]',
  dragonRendererClass: '[class*="DragonRenderer"]',
  
  // Specific dragon types
  dragonType3D: '[data-dragon-type="3d"]',
  dragonType2D: '[data-dragon-type="2d"]',
  dragonTypeASCII: '[data-dragon-type="ascii"]',
  
  // Fallback components
  fallbackRenderer: '[data-component="DragonFallbackRenderer"]',
  fallbackElements: '[data-fallback], [class*="fallback"]',
  
  // Specific components mentioned in codebase
  seironGLBDragon: '[class*="SeironGLB"]',
  dragonHead3D: '[class*="DragonHead3D"]',
  enhancedDragonRenderer: '[class*="EnhancedDragonRenderer"]',
  
  // Canvas and rendering elements
  canvasElements: 'canvas',
  webglCanvas: 'canvas[data-context="webgl"]',
  canvas2dFallback: 'canvas[data-context="2d"]',
  
  // Loading and error states
  loadingElements: '[data-loading], [class*="loading"]',
  errorElements: '[data-error], [class*="error"]',
  errorBoundaries: '[data-error-boundary]',
  
  // ASCII dragon elements
  asciiElements: 'pre, [class*="ascii"]',
  asciiDragonSpecific: '[data-component="ASCIIDragon"]',
  
  // Model switching controls
  modelSwitchingControls: [
    '[data-testid*="model"]',
    '[data-action*="switch"]',
    '[data-model]',
    'button:has-text("Model")',
    'button:has-text("Switch")',
    'select[data-model]',
    '.model-selector',
    '.dragon-model-switch'
  ],
  
  // Debug and testing elements
  debugElements: '[class*="debug"]',
  testElements: '[data-testid*="dragon"]'
};

// Network request patterns
export const NETWORK_PATTERNS = {
  modelFiles: /\.(glb|gltf|obj|fbx|dae|bin)(\?|$)/i,
  textureFiles: /\.(png|jpg|jpeg|webp|ktx|dds|hdr|exr)(\?|$)/i,
  dracoCompression: /draco/i,
  modelRelated: /(model|dragon|seiron)/i,
  textureRelated: /(texture|material|diffuse|normal|specular)/i
};

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  // Loading times (milliseconds)
  maxPageLoadTime: 15000,
  maxModelLoadTime: 10000,
  maxFallbackActivationTime: 3000,
  
  // Memory usage (bytes)
  maxMemoryGrowth: 100 * 1024 * 1024, // 100MB
  maxInitialMemoryUsage: 50 * 1024 * 1024, // 50MB
  
  // File sizes (bytes)
  maxModelFileSize: 20 * 1024 * 1024, // 20MB
  maxTextureFileSize: 5 * 1024 * 1024, // 5MB
  maxTotalDownloadSize: 50 * 1024 * 1024, // 50MB
  
  // Response times (milliseconds)
  maxNetworkResponseTime: 8000,
  maxAverageResponseTime: 3000,
  
  // Success rates (percentage)
  minCacheHitRate: 0.7, // 70%
  minModelLoadSuccessRate: 0.9, // 90%
  minFallbackSuccessRate: 0.95 // 95%
};

// Error categories for analysis
export const ERROR_CATEGORIES = {
  webgl: ['webgl', 'opengl', 'gpu', 'graphics'],
  network: ['network', 'fetch', 'xhr', 'load', 'timeout'],
  model: ['gltf', 'glb', 'model', 'mesh', 'geometry'],
  three: ['three', 'threejs', 'renderer', 'scene', 'camera'],
  memory: ['memory', 'heap', 'oom', 'allocation'],
  fallback: ['fallback', 'ascii', 'canvas2d', 'mock']
};

// Helper functions for test configuration
export class TestConfigHelper {
  static getEnvironmentConfig(environmentName: string): TestEnvironment {
    const config = TEST_ENVIRONMENTS[environmentName];
    if (!config) {
      throw new Error(`Unknown test environment: ${environmentName}`);
    }
    return config;
  }
  
  static getModelConfig(modelName: string): ModelTestData {
    const config = TEST_MODEL_FILES[modelName];
    if (!config) {
      throw new Error(`Unknown model file: ${modelName}`);
    }
    return config;
  }
  
  static getExpectations(environmentName: string): DragonTestExpectations {
    const expectations = DRAGON_EXPECTATIONS[environmentName];
    if (!expectations) {
      throw new Error(`No expectations defined for environment: ${environmentName}`);
    }
    return expectations;
  }
  
  static isModelFile(url: string): boolean {
    return NETWORK_PATTERNS.modelFiles.test(url) || 
           NETWORK_PATTERNS.modelRelated.test(url);
  }
  
  static isTextureFile(url: string): boolean {
    return NETWORK_PATTERNS.textureFiles.test(url) || 
           NETWORK_PATTERNS.textureRelated.test(url);
  }
  
  static categorizeError(errorMessage: string): string[] {
    const categories = [];
    const lowerMessage = errorMessage.toLowerCase();
    
    for (const [category, keywords] of Object.entries(ERROR_CATEGORIES)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        categories.push(category);
      }
    }
    
    return categories.length > 0 ? categories : ['unknown'];
  }
  
  static calculateTimeout(baseTimeout: number, environment: string): number {
    const config = this.getEnvironmentConfig(environment);
    return baseTimeout * config.timeoutMultiplier;
  }
  
  static shouldExpectWebGL(environment: string): boolean {
    const config = this.getEnvironmentConfig(environment);
    return config.expectWebGL;
  }
  
  static shouldExpectFallback(environment: string): boolean {
    const config = this.getEnvironmentConfig(environment);
    return config.expectFallback;
  }
}

// Test data generators
export class TestDataGenerator {
  static generateMockModelResponse(size: number = 1024): Buffer {
    // Generate a mock model file response for testing
    const buffer = Buffer.alloc(size);
    buffer.write('glTF mock data', 0); // Simple mock GLB header
    return buffer;
  }
  
  static generateRandomModelRequests(count: number = 5): ModelTestData[] {
    const models = Object.values(TEST_MODEL_FILES);
    const result = [];
    
    for (let i = 0; i < count; i++) {
      result.push(models[i % models.length]);
    }
    
    return result;
  }
  
  static generatePerformanceScenarios(): Array<{name: string, config: any}> {
    return [
      {
        name: 'optimal',
        config: { memory: 'high', network: 'fast', cpu: 'fast' }
      },
      {
        name: 'slow-network',
        config: { memory: 'high', network: 'slow', cpu: 'fast' }
      },
      {
        name: 'low-memory',
        config: { memory: 'low', network: 'fast', cpu: 'fast' }
      },
      {
        name: 'constrained',
        config: { memory: 'low', network: 'slow', cpu: 'slow' }
      }
    ];
  }
}

export default {
  TEST_ENVIRONMENTS,
  TEST_MODEL_FILES,
  DRAGON_EXPECTATIONS,
  DRAGON_SELECTORS,
  NETWORK_PATTERNS,
  PERFORMANCE_THRESHOLDS,
  ERROR_CATEGORIES,
  TestConfigHelper,
  TestDataGenerator
};