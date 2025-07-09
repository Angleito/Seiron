import { logger } from './logger';
// Note: voiceLogger removed - using console methods for logging

interface ModelLoadingRequest {
  id: string;
  modelPath: string;
  priority: 'low' | 'medium' | 'high';
  onSuccess?: (model: any) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  timestamp: number;
}

interface ModelCacheEntry {
  model: any;
  lastUsed: number;
  loadTime: number;
  size: number;
}

interface ModelLoadingState {
  isLoading: boolean;
  activeRequests: Map<string, ModelLoadingRequest[]>;
  cache: Map<string, ModelCacheEntry>;
  loadQueue: ModelLoadingRequest[];
  maxConcurrentLoads: number;
  maxCacheSize: number;
  currentLoads: number;
}

/**
 * Model Loading Manager with lazy loading, request deduplication, and caching
 * Prevents resource exhaustion from multiple simultaneous model loads
 */
class ModelLoadingManager {
  private static instance: ModelLoadingManager | null = null;
  private state: ModelLoadingState;
  private requestIdCounter = 0;
  private processQueueTimeout: NodeJS.Timeout | null = null;
  private cacheCleanupInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.state = {
      isLoading: false,
      activeRequests: new Map(),
      cache: new Map(),
      loadQueue: [],
      maxConcurrentLoads: 2, // Limit concurrent loads to prevent resource exhaustion
      maxCacheSize: 50 * 1024 * 1024, // 50MB cache limit
      currentLoads: 0
    };
    
    // Start cache cleanup interval
    this.startCacheCleanup();
    
    console.log('🎮 Model Loading Manager initialized');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ModelLoadingManager {
    if (!ModelLoadingManager.instance) {
      ModelLoadingManager.instance = new ModelLoadingManager();
    }
    return ModelLoadingManager.instance;
  }
  
  /**
   * Load a 3D model with deduplication and caching
   */
  public async loadModel(
    modelPath: string,
    options: {
      priority?: 'low' | 'medium' | 'high';
      onSuccess?: (model: any) => void;
      onError?: (error: Error) => void;
      onProgress?: (progress: number) => void;
      enableCache?: boolean;
      forceReload?: boolean;
    } = {}
  ): Promise<any> {
    const {
      priority = 'medium',
      onSuccess,
      onError,
      onProgress,
      enableCache = true,
      forceReload = false
    } = options;
    
    // Check cache first
    if (enableCache && !forceReload) {
      const cached = this.state.cache.get(modelPath);
      if (cached) {
        // Update last used timestamp
        cached.lastUsed = Date.now();
        this.state.cache.set(modelPath, cached);
        
        console.log('🎮 Model loaded from cache', { modelPath });
        onSuccess?.(cached.model);
        return cached.model;
      }
    }
    
    // Check if there's already a request for this model
    const existingRequests = this.state.activeRequests.get(modelPath) || [];
    
    return new Promise((resolve, reject) => {
      const requestId = `model-${++this.requestIdCounter}-${Date.now()}`;
      
      const request: ModelLoadingRequest = {
        id: requestId,
        modelPath,
        priority,
        onSuccess: (model) => {
          onSuccess?.(model);
          resolve(model);
        },
        onError: (error) => {
          onError?.(error);
          reject(error);
        },
        onProgress,
        timestamp: Date.now()
      };
      
      // Add to active requests for this model
      this.state.activeRequests.set(modelPath, [...existingRequests, request]);
      
      // If this is the first request for this model, add to queue
      if (existingRequests.length === 0) {
        this.addToQueue(request);
      }
      
      console.log('🎮 Model load request queued', {
        requestId,
        modelPath,
        priority,
        existingRequests: existingRequests.length,
        queueLength: this.state.loadQueue.length
      });
    });
  }
  
  /**
   * Add request to load queue based on priority
   */
  private addToQueue(request: ModelLoadingRequest): void {
    if (request.priority === 'high') {
      this.state.loadQueue.unshift(request);
    } else if (request.priority === 'medium') {
      const highPriorityCount = this.state.loadQueue.filter(r => r.priority === 'high').length;
      this.state.loadQueue.splice(highPriorityCount, 0, request);
    } else {
      this.state.loadQueue.push(request);
    }
    
    // Start processing queue
    this.processQueue();
  }
  
  /**
   * Process the model loading queue
   */
  private async processQueue(): Promise<void> {
    if (this.processQueueTimeout) {
      clearTimeout(this.processQueueTimeout);
    }
    
    // Process queue with a small delay to batch requests
    this.processQueueTimeout = setTimeout(async () => {
      while (this.state.loadQueue.length > 0 && this.state.currentLoads < this.state.maxConcurrentLoads) {
        const request = this.state.loadQueue.shift()!;
        this.processRequest(request);
      }
    }, 10);
  }
  
  /**
   * Process a single model loading request
   */
  private async processRequest(request: ModelLoadingRequest): Promise<void> {
    this.state.currentLoads++;
    this.state.isLoading = true;
    
    const startTime = performance.now();
    
    try {
      console.log('🎮 Processing model load request', {
        requestId: request.id,
        modelPath: request.modelPath,
        priority: request.priority,
        currentLoads: this.state.currentLoads
      });
      
      request.onProgress?.(0.1);
      
      // Load the model
      const model = await this.loadModelFromPath(request.modelPath, request.onProgress);
      
      request.onProgress?.(0.9);
      
      // Cache the model
      const loadTime = performance.now() - startTime;
      const modelSize = this.estimateModelSize(model);
      
      this.cacheModel(request.modelPath, model, loadTime, modelSize);
      
      // Notify all requests for this model
      const requests = this.state.activeRequests.get(request.modelPath) || [];
      requests.forEach(req => {
        req.onProgress?.(1.0);
        req.onSuccess?.(model);
      });
      
      // Clear active requests for this model
      this.state.activeRequests.delete(request.modelPath);
      
      console.log('🎮 Model loaded successfully', {
        requestId: request.id,
        modelPath: request.modelPath,
        loadTime: Math.round(loadTime),
        modelSize: Math.round(modelSize / 1024) + 'KB',
        requestCount: requests.length
      });
      
    } catch (error) {
      console.error('🎮 Model load failed', {
        requestId: request.id,
        modelPath: request.modelPath,
        error: error instanceof Error ? error.message : error
      });
      
      // Notify all requests for this model about the error
      const requests = this.state.activeRequests.get(request.modelPath) || [];
      requests.forEach(req => {
        req.onError?.(error as Error);
      });
      
      // Clear active requests for this model
      this.state.activeRequests.delete(request.modelPath);
      
    } finally {
      this.state.currentLoads--;
      if (this.state.currentLoads === 0) {
        this.state.isLoading = false;
      }
      
      // Continue processing queue
      this.processQueue();
    }
  }
  
  /**
   * Actually load the model from the path
   */
  private async loadModelFromPath(modelPath: string, onProgress?: (progress: number) => void): Promise<any> {
    // Dynamic import to avoid loading three.js until needed
    const { useGLTF } = await import('@react-three/drei');
    
    onProgress?.(0.3);
    
    return new Promise((resolve, reject) => {
      try {
        // Create a temporary component to load the model
        const loadModel = async () => {
          const gltf = useGLTF(modelPath);
          onProgress?.(0.8);
          resolve(gltf);
        };
        
        loadModel();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Cache a loaded model
   */
  private cacheModel(modelPath: string, model: any, loadTime: number, size: number): void {
    // Check cache size limits
    this.enforceCacheSizeLimit(size);
    
    const cacheEntry: ModelCacheEntry = {
      model,
      lastUsed: Date.now(),
      loadTime,
      size
    };
    
    this.state.cache.set(modelPath, cacheEntry);
    
    console.log('🎮 Model cached', {
      modelPath,
      size: Math.round(size / 1024) + 'KB',
      loadTime: Math.round(loadTime),
      cacheSize: this.state.cache.size
    });
  }
  
  /**
   * Enforce cache size limits
   */
  private enforceCacheSizeLimit(newEntrySize: number): void {
    const currentSize = this.getCurrentCacheSize();
    
    if (currentSize + newEntrySize > this.state.maxCacheSize) {
      // Remove oldest entries until we have space
      const entries = Array.from(this.state.cache.entries())
        .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      
      let freedSpace = 0;
      for (const [path, entry] of entries) {
        this.state.cache.delete(path);
        freedSpace += entry.size;
        
        console.log('🎮 Removed cached model', {
          modelPath: path,
          size: Math.round(entry.size / 1024) + 'KB',
          freedSpace: Math.round(freedSpace / 1024) + 'KB'
        });
        
        if (freedSpace >= newEntrySize) {
          break;
        }
      }
    }
  }
  
  /**
   * Get current cache size
   */
  private getCurrentCacheSize(): number {
    return Array.from(this.state.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }
  
  /**
   * Estimate model size (rough approximation)
   */
  private estimateModelSize(model: any): number {
    try {
      // This is a rough estimate based on the model structure
      const jsonSize = JSON.stringify(model).length;
      return jsonSize * 2; // Rough multiplier for binary data
    } catch (error) {
      return 1024 * 1024; // Default 1MB estimate
    }
  }
  
  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    const entriesRemoved = [];
    
    for (const [path, entry] of this.state.cache.entries()) {
      if (now - entry.lastUsed > maxAge) {
        this.state.cache.delete(path);
        entriesRemoved.push(path);
      }
    }
    
    if (entriesRemoved.length > 0) {
      console.log('🎮 Cache cleanup completed', {
        removedCount: entriesRemoved.length,
        remainingCount: this.state.cache.size
      });
    }
  }
  
  /**
   * Preload models
   */
  public preloadModels(modelPaths: string[], priority: 'low' | 'medium' | 'high' = 'low'): void {
    console.log('🎮 Preloading models', { paths: modelPaths, priority });
    
    modelPaths.forEach(path => {
      this.loadModel(path, {
        priority,
        onSuccess: () => {
          console.log('🎮 Model preloaded', { path });
        },
        onError: (error) => {
          console.warn('🎮 Model preload failed', { path, error: error.message });
        }
      });
    });
  }
  
  /**
   * Clear cache
   */
  public clearCache(): void {
    this.state.cache.clear();
    console.log('🎮 Model cache cleared');
  }
  
  /**
   * Get cache stats
   */
  public getCacheStats(): {
    size: number;
    count: number;
    entries: Array<{ path: string; size: number; lastUsed: number; loadTime: number }>;
  } {
    const entries = Array.from(this.state.cache.entries()).map(([path, entry]) => ({
      path,
      size: entry.size,
      lastUsed: entry.lastUsed,
      loadTime: entry.loadTime
    }));
    
    return {
      size: this.getCurrentCacheSize(),
      count: this.state.cache.size,
      entries
    };
  }
  
  /**
   * Get loading state
   */
  public getLoadingState(): {
    isLoading: boolean;
    currentLoads: number;
    queueLength: number;
    activeRequests: number;
  } {
    return {
      isLoading: this.state.isLoading,
      currentLoads: this.state.currentLoads,
      queueLength: this.state.loadQueue.length,
      activeRequests: this.state.activeRequests.size
    };
  }
  
  /**
   * Dispose of the manager
   */
  public dispose(): void {
    if (this.processQueueTimeout) {
      clearTimeout(this.processQueueTimeout);
    }
    
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    
    this.state.cache.clear();
    this.state.activeRequests.clear();
    this.state.loadQueue = [];
    
    console.log('🎮 Model Loading Manager disposed');
  }
}

// Export singleton instance
export const modelLoadingManager = ModelLoadingManager.getInstance();

// Export hook for React components
export function useModelLoader() {
  return {
    loadModel: modelLoadingManager.loadModel.bind(modelLoadingManager),
    preloadModels: modelLoadingManager.preloadModels.bind(modelLoadingManager),
    clearCache: modelLoadingManager.clearCache.bind(modelLoadingManager),
    getCacheStats: modelLoadingManager.getCacheStats.bind(modelLoadingManager),
    getLoadingState: modelLoadingManager.getLoadingState.bind(modelLoadingManager)
  };
}

// Export types
export type { ModelLoadingRequest, ModelCacheEntry, ModelLoadingState };
