'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Canvas } from '@react-three/fiber';
import { getAllModelIds, getModelConfig, DragonModelConfig } from '../../config/dragonModels';
import { logger } from '@lib/logger';

// Dynamically import DragonModelManager to avoid SSR issues
// Temporarily commented out due to build errors
/*
const DragonModelManager = dynamic(
  () => import('../../components/dragon/DragonModelManager').then(mod => mod.DragonModelManager),
  { ssr: false }
);
*/

// Types
interface ModelLoadTest {
  modelId: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  loadTime?: number;
  error?: string;
  memoryUsage?: number;
}

interface WebGLCapabilities {
  version: string;
  vendor: string;
  renderer: string;
  maxTextureSize: number;
  maxVertexAttributes: number;
  maxVertexUniformVectors: number;
  maxFragmentUniformVectors: number;
  maxRenderBufferSize: number;
  extensions: string[];
  webgl2Supported: boolean;
}

interface ModelDiagnostic {
  model: DragonModelConfig;
  loadTest: ModelLoadTest;
  fallbackChain: string[];
}

const ModelDiagnosticsPage: React.FC = () => {
  const [modelDiagnostics, setModelDiagnostics] = useState<ModelDiagnostic[]>([]);
  const [webglCapabilities, setWebglCapabilities] = useState<WebGLCapabilities | null>(null);
  const [currentTestModel, setCurrentTestModel] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState({ fps: 0, memory: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const fpsIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize WebGL capabilities check
  useEffect(() => {
    const checkWebGLCapabilities = () => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') as WebGL2RenderingContext || 
                 canvas.getContext('webgl') as WebGLRenderingContext || 
                 canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      
      if (!gl) {
        logger.error('WebGL not supported');
        return;
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const capabilities: WebGLCapabilities = {
        version: gl.getParameter(gl.VERSION) as string,
        vendor: gl.getParameter(gl.VENDOR) as string,
        renderer: debugInfo 
          ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string
          : gl.getParameter(gl.RENDERER) as string,
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
        maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number,
        maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) as number,
        maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) as number,
        maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
        extensions: gl.getSupportedExtensions() || [],
        webgl2Supported: Boolean(canvas.getContext('webgl2'))
      };

      setWebglCapabilities(capabilities);
    };

    checkWebGLCapabilities();
  }, []);

  // Initialize model diagnostics
  useEffect(() => {
    const modelIds = getAllModelIds();
    const diagnostics: ModelDiagnostic[] = modelIds.map(id => {
      const model = getModelConfig(id);
      if (!model) return null;

      return {
        model,
        loadTest: {
          modelId: id,
          status: 'idle'
        },
        fallbackChain: model.fallbackModels || []
      };
    }).filter(Boolean) as ModelDiagnostic[];

    setModelDiagnostics(diagnostics);
  }, []);

  // FPS Monitor
  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        setPerformanceMetrics(prev => ({ ...prev, fps }));
        frames = 0;
        lastTime = currentTime;
      }

      animationFrameRef.current = requestAnimationFrame(measureFPS);
    };

    measureFPS();

    // Memory usage monitor (if available)
    if ('memory' in performance) {
      fpsIntervalRef.current = setInterval(() => {
        const memory = (performance as any).memory;
        const usedMemory = Math.round(memory.usedJSHeapSize / 1048576);
        setPerformanceMetrics(prev => ({ ...prev, memory: usedMemory }));
      }, 1000);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
      }
    };
  }, []);

  // Test model loading
  const testModelLoad = useCallback(async (modelId: string) => {
    setModelDiagnostics(prev => prev.map(d => 
      d.model.id === modelId 
        ? { ...d, loadTest: { ...d.loadTest, status: 'loading' } }
        : d
    ));

    const startTime = performance.now();

    try {
      // Simulate model loading test
      const model = getModelConfig(modelId);
      if (!model) throw new Error('Model not found');

      // Test if path exists
      const response = await fetch(model.path, { method: 'HEAD' });
      if (!response.ok) throw new Error(`Model file not found: ${response.status}`);

      const loadTime = performance.now() - startTime;

      setModelDiagnostics(prev => prev.map(d => 
        d.model.id === modelId 
          ? { 
              ...d, 
              loadTest: { 
                ...d.loadTest, 
                status: 'success',
                loadTime,
                memoryUsage: model.performance.memoryUsageMB
              } 
            }
          : d
      ));
    } catch (error) {
      const loadTime = performance.now() - startTime;
      logger.error(`Failed to load model ${modelId}:`, error);
      
      setModelDiagnostics(prev => prev.map(d => 
        d.model.id === modelId 
          ? { 
              ...d, 
              loadTest: { 
                ...d.loadTest, 
                status: 'error',
                loadTime,
                error: error instanceof Error ? error.message : 'Unknown error'
              } 
            }
          : d
      ));
    }
  }, []);

  // Test all models
  const testAllModels = useCallback(() => {
    modelDiagnostics.forEach(d => {
      testModelLoad(d.model.id);
    });
  }, [modelDiagnostics, testModelLoad]);

  // Switch model test
  const testModelSwitch = useCallback((modelId: string) => {
    setCurrentTestModel(modelId);
    setTestError(null);
  }, []);

  // Simulate error for recovery test
  const testErrorRecovery = useCallback(() => {
    setTestError('Simulated model loading error');
    setTimeout(() => {
      setTestError(null);
      logger.info('Error recovery completed');
    }, 2000);
  }, []);

  // Render model status badge
  const renderStatusBadge = (status: ModelLoadTest['status']) => {
    const statusColors = {
      idle: '#6b7280',
      loading: '#3b82f6',
      success: '#10b981',
      error: '#ef4444'
    };

    return (
      <span 
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          color: 'white',
          backgroundColor: statusColors[status],
          textTransform: 'uppercase'
        }}
      >
        {status}
      </span>
    );
  };

  // Render fallback chain visualization
  const renderFallbackChain = (chain: string[]) => {
    if (chain.length === 0) return <span style={{ color: '#6b7280' }}>No fallbacks</span>;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {chain.map((modelId, index) => (
          <React.Fragment key={modelId}>
            {index > 0 && <span style={{ color: '#6b7280' }}>→</span>}
            <span 
              style={{
                padding: '2px 6px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              {modelId}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Dragon Model Diagnostics</h1>

      {/* Performance Metrics */}
      <div style={{ 
        backgroundColor: '#f9fafb', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '24px' 
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Performance Metrics</h2>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <span style={{ fontWeight: 'bold' }}>FPS:</span> {performanceMetrics.fps}
          </div>
          {performanceMetrics.memory > 0 && (
            <div>
              <span style={{ fontWeight: 'bold' }}>Memory:</span> {performanceMetrics.memory} MB
            </div>
          )}
        </div>
      </div>

      {/* WebGL Capabilities */}
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '24px' 
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>WebGL Capabilities</h2>
        {webglCapabilities ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div>
              <strong>Version:</strong> {webglCapabilities.version}
            </div>
            <div>
              <strong>Vendor:</strong> {webglCapabilities.vendor}
            </div>
            <div>
              <strong>Renderer:</strong> {webglCapabilities.renderer}
            </div>
            <div>
              <strong>WebGL2 Support:</strong> {webglCapabilities.webgl2Supported ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Max Texture Size:</strong> {webglCapabilities.maxTextureSize}px
            </div>
            <div>
              <strong>Max Render Buffer:</strong> {webglCapabilities.maxRenderBufferSize}px
            </div>
          </div>
        ) : (
          <p>WebGL not supported</p>
        )}
      </div>

      {/* Model List with Status */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Configured Models</h2>
          <button
            onClick={testAllModels}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Test All Models
          </button>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {modelDiagnostics.map(({ model, loadTest, fallbackChain }) => (
            <div 
              key={model.id} 
              style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                padding: '16px',
                backgroundColor: 'white'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>{model.displayName}</h3>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    <div>ID: {model.id}</div>
                    <div>Format: {model.format.toUpperCase()}</div>
                    <div>Quality: {model.quality}</div>
                    <div>Type: {model.type}</div>
                    <div>Status: {model.status}</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>Performance Profile</h4>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    <div>Memory: {model.performance.memoryUsageMB} MB</div>
                    <div>Load Time: {model.performance.loadTimeMs} ms</div>
                    <div>Complexity: {model.performance.renderComplexity}/10</div>
                    <div>FPS Target: {model.performance.recommendedFPS}</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>Load Test</h4>
                  <div style={{ marginBottom: '8px' }}>
                    {renderStatusBadge(loadTest.status)}
                  </div>
                  {loadTest.loadTime && (
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Load time: {loadTest.loadTime.toFixed(0)}ms</div>
                  )}
                  {loadTest.error && (
                    <div style={{ fontSize: '14px', color: '#ef4444' }}>{loadTest.error}</div>
                  )}
                  <button
                    onClick={() => testModelLoad(model.id)}
                    style={{
                      marginTop: '8px',
                      padding: '4px 12px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Test Load
                  </button>
                </div>

                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>Fallback Chain</h4>
                  {renderFallbackChain(fallbackChain)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Model Test */}
      <div style={{ 
        backgroundColor: '#f9fafb', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '24px' 
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Live Model Test</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select Model:</label>
          <select
            value={currentTestModel || ''}
            onChange={(e) => testModelSwitch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">Choose a model...</option>
            {modelDiagnostics.map(({ model }) => (
              <option key={model.id} value={model.id}>
                {model.displayName} ({model.quality})
              </option>
            ))}
          </select>
        </div>

        {currentTestModel && (
          <div 
            style={{ 
              height: '400px', 
              backgroundColor: '#1f2937', 
              borderRadius: '8px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {testError ? (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#ef4444',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
                <div>{testError}</div>
              </div>
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-gray-800 text-gray-400">
                DragonModelManager temporarily disabled
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Actions */}
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '16px', 
        borderRadius: '8px' 
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Test Actions</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              const models = modelDiagnostics.map(d => d.model.id);
              const randomModel = models[Math.floor(Math.random() * models.length)];
              if (randomModel) {
                testModelSwitch(randomModel);
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Random Model Switch
          </button>

          <button
            onClick={testErrorRecovery}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Simulate Error & Recovery
          </button>

          <button
            onClick={() => {
              if (currentTestModel) {
                const diagnostic = modelDiagnostics.find(d => d.model.id === currentTestModel);
                if (diagnostic && diagnostic.fallbackChain.length > 0) {
                  const fallbackModel = diagnostic.fallbackChain[0];
                  if (fallbackModel) {
                    testModelSwitch(fallbackModel);
                  }
                }
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Test Fallback Chain
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Reset Page
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ModelDiagnosticsPage;
