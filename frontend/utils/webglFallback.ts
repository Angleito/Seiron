/**
 * WebGL Fallback System for Headless/Docker Environments
 * 
 * This module provides comprehensive WebGL fallback mechanisms that work in
 * headless environments, Docker containers, and low-end devices.
 */
import * as THREE from 'three';
import { webglDiagnostics } from './webglDiagnostics';

export interface WebGLFallbackConfig {
  enableSoftwareRendering?: boolean;
  enableCanvas2DFallback?: boolean;
  maxFallbackAttempts?: number;
  enableHeadlessMode?: boolean;
  enableMockCanvas?: boolean;
  enableOffscreenCanvas?: boolean;
  fallbackWidth?: number;
  fallbackHeight?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none';
}

export interface FallbackCapabilities {
  webgl: boolean;
  webgl2: boolean;
  canvas2d: boolean;
  offscreenCanvas: boolean;
  headlessMode: boolean;
  softwareRendering: boolean;
  mockCanvas: boolean;
  recommendedMode: 'webgl' | 'webgl2' | 'software' | 'canvas2d' | 'mock' | 'none';
}

export interface FallbackContext {
  type: 'webgl' | 'webgl2' | 'software' | 'canvas2d' | 'mock' | 'none';
  context: WebGLRenderingContext | WebGL2RenderingContext | CanvasRenderingContext2D | MockWebGLContext | MockCanvas2DContext | null;
  canvas: HTMLCanvasElement | OffscreenCanvas | MockCanvas | null;
  renderer: THREE.WebGLRenderer | SoftwareRenderer | Canvas2DRenderer | MockRenderer | null;
  capabilities: FallbackCapabilities;
  isHeadless: boolean;
  isDocker: boolean;
  performance: {
    initTime: number;
    renderTime: number;
    memoryUsage: number;
  };
}

/**
 * Mock WebGL Context for headless environments
 */
class MockWebGLContext {
  public canvas: MockCanvas;
  public drawingBufferWidth = 800;
  public drawingBufferHeight = 600;
  
  // WebGL constants
  public readonly COLOR_BUFFER_BIT = 0x4000;
  public readonly DEPTH_BUFFER_BIT = 0x0100;
  public readonly STENCIL_BUFFER_BIT = 0x0400;
  public readonly TRIANGLES = 0x0004;
  public readonly UNSIGNED_SHORT = 0x1403;
  public readonly FLOAT = 0x1406;
  public readonly RGBA = 0x1908;
  public readonly TEXTURE_2D = 0x0DE1;
  public readonly VERTEX_SHADER = 0x8B31;
  public readonly FRAGMENT_SHADER = 0x8B30;
  public readonly COMPILE_STATUS = 0x8B81;
  public readonly LINK_STATUS = 0x8B82;
  public readonly ARRAY_BUFFER = 0x8892;
  public readonly ELEMENT_ARRAY_BUFFER = 0x8893;
  public readonly STATIC_DRAW = 0x88E4;
  public readonly TEXTURE0 = 0x84C0;
  public readonly LINEAR = 0x2601;
  public readonly CLAMP_TO_EDGE = 0x812F;
  public readonly TEXTURE_MIN_FILTER = 0x2801;
  public readonly TEXTURE_MAG_FILTER = 0x2800;
  public readonly TEXTURE_WRAP_S = 0x2802;
  public readonly TEXTURE_WRAP_T = 0x2803;
  public readonly CULL_FACE = 0x0B44;
  public readonly DEPTH_TEST = 0x0B71;
  public readonly BLEND = 0x0BE2;
  public readonly RENDERER = 0x1F01;
  public readonly VENDOR = 0x1F00;
  public readonly VERSION = 0x1F02;
  public readonly SHADING_LANGUAGE_VERSION = 0x8B8C;
  public readonly MAX_TEXTURE_SIZE = 0x0D33;
  public readonly MAX_VERTEX_ATTRIBS = 0x8869;
  public readonly MAX_FRAGMENT_UNIFORM_VECTORS = 0x8DFD;
  public readonly MAX_VERTEX_UNIFORM_VECTORS = 0x8DFB;
  public readonly MAX_VARYING_VECTORS = 0x8DFC;
  public readonly MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8B4D;

  private contextLost = false;
  private mockObjects = new Map<string, any>();
  private nextObjectId = 1;

  constructor(canvas: MockCanvas) {
    this.canvas = canvas;
  }

  // Context state management
  isContextLost(): boolean {
    return this.contextLost;
  }

  loseContext(): void {
    this.contextLost = true;
  }

  restoreContext(): void {
    this.contextLost = false;
  }

  // Basic WebGL methods - simplified implementations
  clear(mask: number): void {
    // Mock clear operation
  }

  clearColor(r: number, g: number, b: number, a: number): void {
    // Mock clear color
  }

  enable(cap: number): void {
    // Mock enable
  }

  disable(cap: number): void {
    // Mock disable
  }

  viewport(x: number, y: number, width: number, height: number): void {
    this.drawingBufferWidth = width;
    this.drawingBufferHeight = height;
  }

  // Buffer operations
  createBuffer(): any {
    const id = `buffer_${this.nextObjectId++}`;
    const buffer = { id, type: 'buffer' };
    this.mockObjects.set(id, buffer);
    return buffer;
  }

  bindBuffer(target: number, buffer: any): void {
    // Mock bind buffer
  }

  bufferData(target: number, data: any, usage: number): void {
    // Mock buffer data
  }

  // Shader operations
  createShader(type: number): any {
    const id = `shader_${this.nextObjectId++}`;
    const shader = { id, type: 'shader', shaderType: type };
    this.mockObjects.set(id, shader);
    return shader;
  }

  shaderSource(shader: any, source: string): void {
    if (shader) {
      shader.source = source;
    }
  }

  compileShader(shader: any): void {
    if (shader) {
      shader.compiled = true;
    }
  }

  getShaderParameter(shader: any, pname: number): any {
    if (pname === this.COMPILE_STATUS) {
      return true;
    }
    return null;
  }

  createProgram(): any {
    const id = `program_${this.nextObjectId++}`;
    const program = { id, type: 'program' };
    this.mockObjects.set(id, program);
    return program;
  }

  attachShader(program: any, shader: any): void {
    // Mock attach shader
  }

  linkProgram(program: any): void {
    if (program) {
      program.linked = true;
    }
  }

  getProgramParameter(program: any, pname: number): any {
    if (pname === this.LINK_STATUS) {
      return true;
    }
    return null;
  }

  useProgram(program: any): void {
    // Mock use program
  }

  // Texture operations
  createTexture(): any {
    const id = `texture_${this.nextObjectId++}`;
    const texture = { id, type: 'texture' };
    this.mockObjects.set(id, texture);
    return texture;
  }

  bindTexture(target: number, texture: any): void {
    // Mock bind texture
  }

  texImage2D(target: number, level: number, internalformat: number, 
             width: number, height: number, border: number, 
             format: number, type: number, pixels: any): void {
    // Mock texture upload
  }

  texParameteri(target: number, pname: number, param: number): void {
    // Mock texture parameters
  }

  activeTexture(texture: number): void {
    // Mock active texture
  }

  // Attribute operations
  getAttribLocation(program: any, name: string): number {
    return 0; // Mock attribute location
  }

  enableVertexAttribArray(index: number): void {
    // Mock enable vertex attrib array
  }

  vertexAttribPointer(index: number, size: number, type: number, 
                     normalized: boolean, stride: number, offset: number): void {
    // Mock vertex attrib pointer
  }

  // Uniform operations
  getUniformLocation(program: any, name: string): any {
    return { name, location: 0 };
  }

  uniform1f(location: any, value: number): void {
    // Mock uniform
  }

  uniform2f(location: any, x: number, y: number): void {
    // Mock uniform
  }

  uniform3f(location: any, x: number, y: number, z: number): void {
    // Mock uniform
  }

  uniform4f(location: any, x: number, y: number, z: number, w: number): void {
    // Mock uniform
  }

  uniformMatrix4fv(location: any, transpose: boolean, value: any): void {
    // Mock uniform matrix
  }

  // Drawing operations
  drawArrays(mode: number, first: number, count: number): void {
    // Mock draw arrays
  }

  drawElements(mode: number, count: number, type: number, offset: number): void {
    // Mock draw elements
  }

  // Parameter queries
  getParameter(pname: number): any {
    switch (pname) {
      case this.RENDERER:
        return 'Mock Software Renderer';
      case this.VENDOR:
        return 'Seiron Fallback System';
      case this.VERSION:
        return 'WebGL 1.0 (Mock)';
      case this.SHADING_LANGUAGE_VERSION:
        return 'WebGL GLSL ES 1.0 (Mock)';
      case this.MAX_TEXTURE_SIZE:
        return 2048;
      case this.MAX_VERTEX_ATTRIBS:
        return 16;
      case this.MAX_FRAGMENT_UNIFORM_VECTORS:
        return 1024;
      case this.MAX_VERTEX_UNIFORM_VECTORS:
        return 1024;
      case this.MAX_VARYING_VECTORS:
        return 30;
      case this.MAX_COMBINED_TEXTURE_IMAGE_UNITS:
        return 32;
      default:
        return null;
    }
  }

  getExtension(name: string): any {
    // Return mock extensions
    if (name === 'WEBGL_lose_context') {
      return {
        loseContext: () => this.loseContext(),
        restoreContext: () => this.restoreContext()
      };
    }
    return null;
  }

  getSupportedExtensions(): string[] {
    return ['WEBGL_lose_context'];
  }

  getContextAttributes(): any {
    return {
      alpha: true,
      antialias: false,
      depth: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: false
    };
  }

  flush(): void {
    // Mock flush
  }

  finish(): void {
    // Mock finish
  }
}

/**
 * Mock Canvas for headless environments
 */
class MockCanvas {
  public width = 800;
  public height = 600;
  public style: any = {};
  
  private contextType: string | null = null;
  private context: any = null;

  constructor(width = 800, height = 600) {
    this.width = width;
    this.height = height;
    this.style = {
      width: `${width}px`,
      height: `${height}px`
    };
  }

  getContext(contextType: string, attributes?: any): any {
    if (this.contextType && this.contextType !== contextType) {
      return null;
    }

    this.contextType = contextType;

    if (!this.context) {
      switch (contextType) {
        case 'webgl':
        case 'webgl2':
        case 'experimental-webgl':
          this.context = new MockWebGLContext(this);
          break;
        case '2d':
          this.context = new MockCanvas2DContext(this);
          break;
        default:
          return null;
      }
    }

    return this.context;
  }

  toDataURL(type?: string, quality?: any): string {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }

  toBlob(callback: BlobCallback, type?: string, quality?: any): void {
    setTimeout(() => {
      const blob = new Blob([''], { type: type || 'image/png' });
      callback(blob);
    }, 0);
  }

  getBoundingClientRect(): DOMRect {
    return {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      top: 0,
      right: this.width,
      bottom: this.height,
      left: 0,
      toJSON: () => ({})
    };
  }

  addEventListener(type: string, listener: any): void {
    // Mock event listener
  }

  removeEventListener(type: string, listener: any): void {
    // Mock event listener removal
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }
}

/**
 * Mock 2D Context
 */
class MockCanvas2DContext {
  public canvas: MockCanvas;
  public fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  public strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  public lineWidth = 1;
  public font = '10px sans-serif';
  public textAlign: CanvasTextAlign = 'start';
  public textBaseline: CanvasTextBaseline = 'alphabetic';

  constructor(canvas: MockCanvas) {
    this.canvas = canvas;
  }

  // Drawing methods - all no-ops in headless mode
  clearRect(x: number, y: number, w: number, h: number): void {}
  fillRect(x: number, y: number, w: number, h: number): void {}
  strokeRect(x: number, y: number, w: number, h: number): void {}
  fillText(text: string, x: number, y: number, maxWidth?: number): void {}
  strokeText(text: string, x: number, y: number, maxWidth?: number): void {}
  beginPath(): void {}
  closePath(): void {}
  moveTo(x: number, y: number): void {}
  lineTo(x: number, y: number): void {}
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {}
  ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {}
  fill(): void {}
  stroke(): void {}
  save(): void {}
  restore(): void {}
  translate(x: number, y: number): void {}
  rotate(angle: number): void {}
  scale(x: number, y: number): void {}
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {}
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {}

  measureText(text: string): TextMetrics {
    return {
      width: text.length * 8, // Rough approximation
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 8,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
      fontBoundingBoxAscent: 8,
      fontBoundingBoxDescent: 2,
      alphabeticBaseline: 0,
      emHeightAscent: 8,
      emHeightDescent: 2,
      hangingBaseline: 0,
      ideographicBaseline: 0
    };
  }
}

/**
 * Software Renderer using CPU-based Three.js rendering
 */
class SoftwareRenderer {
  public domElement: HTMLCanvasElement | MockCanvas;
  public context: CanvasRenderingContext2D | MockCanvas2DContext;
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
  private width = 800;
  private height = 600;

  constructor(canvas: HTMLCanvasElement | MockCanvas) {
    this.domElement = canvas;
    this.context = canvas.getContext('2d') as CanvasRenderingContext2D | MockCanvas2DContext;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.domElement.width = width;
    this.domElement.height = height;
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.scene = scene;
    this.camera = camera;

    // Clear canvas
    this.context.clearRect(0, 0, this.width, this.height);

    // Simple software rendering approach
    this.renderScene(scene, camera);
  }

  private renderScene(scene: THREE.Scene, camera: THREE.Camera): void {
    // Simplified software rendering
    // In a real implementation, this would involve:
    // 1. World to view space transformation
    // 2. View to projection space transformation
    // 3. Clipping
    // 4. Rasterization
    
    // For now, we'll render simple shapes as placeholders
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        this.renderMesh(object, camera);
      }
    });
  }

  private renderMesh(mesh: THREE.Mesh, camera: THREE.Camera): void {
    // Project 3D position to 2D screen coordinates
    const vector = mesh.position.clone();
    vector.project(camera);

    const x = (vector.x * 0.5 + 0.5) * this.width;
    const y = (vector.y * -0.5 + 0.5) * this.height;

    // Render as simple shapes based on geometry type
    if (mesh.geometry instanceof THREE.BoxGeometry) {
      this.renderBox(x, y, 20);
    } else if (mesh.geometry instanceof THREE.SphereGeometry) {
      this.renderSphere(x, y, 15);
    } else if (mesh.geometry instanceof THREE.ConeGeometry) {
      this.renderCone(x, y, 15);
    } else {
      this.renderGenericMesh(x, y, 10);
    }
  }

  private renderBox(x: number, y: number, size: number): void {
    this.context.fillStyle = '#ff6600';
    this.context.fillRect(x - size/2, y - size/2, size, size);
    this.context.strokeStyle = '#cc4400';
    this.context.strokeRect(x - size/2, y - size/2, size, size);
  }

  private renderSphere(x: number, y: number, radius: number): void {
    this.context.fillStyle = '#0066ff';
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, Math.PI * 2);
    this.context.fill();
    this.context.strokeStyle = '#004499';
    this.context.stroke();
  }

  private renderCone(x: number, y: number, size: number): void {
    this.context.fillStyle = '#66ff00';
    this.context.beginPath();
    this.context.moveTo(x, y - size);
    this.context.lineTo(x - size/2, y + size/2);
    this.context.lineTo(x + size/2, y + size/2);
    this.context.closePath();
    this.context.fill();
    this.context.strokeStyle = '#44aa00';
    this.context.stroke();
  }

  private renderGenericMesh(x: number, y: number, size: number): void {
    this.context.fillStyle = '#ffaa00';
    this.context.fillRect(x - size/2, y - size/2, size, size);
    this.context.strokeStyle = '#cc8800';
    this.context.strokeRect(x - size/2, y - size/2, size, size);
  }

  dispose(): void {
    // Cleanup
  }
}

/**
 * Canvas2D Renderer for 2D fallback
 */
class Canvas2DRenderer {
  public domElement: HTMLCanvasElement | MockCanvas;
  public context: CanvasRenderingContext2D | MockCanvas2DContext;
  private width = 800;
  private height = 600;

  constructor(canvas: HTMLCanvasElement | MockCanvas) {
    this.domElement = canvas;
    this.context = canvas.getContext('2d') as CanvasRenderingContext2D | MockCanvas2DContext;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.domElement.width = width;
    this.domElement.height = height;
  }

  render(): void {
    // Clear canvas
    this.context.clearRect(0, 0, this.width, this.height);
    
    // Render 2D dragon representation
    this.renderDragon2D();
  }

  private renderDragon2D(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Draw a stylized 2D dragon
    this.context.fillStyle = '#ff6600';
    
    // Dragon body (oval)
    this.context.beginPath();
    if ('ellipse' in this.context && typeof this.context.ellipse === 'function') {
      this.context.ellipse(centerX, centerY, 60, 40, 0, 0, Math.PI * 2);
    } else {
      // Fallback for contexts without ellipse support
      this.context.arc(centerX, centerY, 50, 0, Math.PI * 2);
    }
    this.context.fill();
    
    // Dragon head (circle)
    this.context.beginPath();
    this.context.arc(centerX - 70, centerY - 20, 30, 0, Math.PI * 2);
    this.context.fill();
    
    // Dragon eyes
    this.context.fillStyle = '#ffffff';
    this.context.beginPath();
    this.context.arc(centerX - 80, centerY - 25, 5, 0, Math.PI * 2);
    this.context.fill();
    
    this.context.beginPath();
    this.context.arc(centerX - 60, centerY - 25, 5, 0, Math.PI * 2);
    this.context.fill();
    
    // Dragon wings
    this.context.fillStyle = '#cc4400';
    this.context.beginPath();
    this.context.moveTo(centerX + 20, centerY - 20);
    this.context.lineTo(centerX + 80, centerY - 40);
    this.context.lineTo(centerX + 60, centerY + 10);
    this.context.closePath();
    this.context.fill();
    
    this.context.beginPath();
    this.context.moveTo(centerX + 20, centerY + 20);
    this.context.lineTo(centerX + 80, centerY + 40);
    this.context.lineTo(centerX + 60, centerY - 10);
    this.context.closePath();
    this.context.fill();
    
    // Dragon tail
    this.context.fillStyle = '#ff6600';
    this.context.beginPath();
    this.context.moveTo(centerX + 60, centerY);
    this.context.lineTo(centerX + 120, centerY - 10);
    this.context.lineTo(centerX + 100, centerY + 10);
    this.context.closePath();
    this.context.fill();
  }

  dispose(): void {
    // Cleanup
  }
}

/**
 * Mock Renderer for complete fallback
 */
class MockRenderer {
  public domElement: MockCanvas;
  private mockId: string;

  constructor(width = 800, height = 600) {
    this.domElement = new MockCanvas(width, height);
    this.mockId = `mock_renderer_${Date.now()}`;
    console.log(`[WebGLFallback] Created mock renderer ${this.mockId}`);
  }

  setSize(width: number, height: number): void {
    this.domElement.width = width;
    this.domElement.height = height;
    console.log(`[WebGLFallback] Mock renderer ${this.mockId} resized to ${width}x${height}`);
  }

  render(): void {
    console.log(`[WebGLFallback] Mock renderer ${this.mockId} rendered frame`);
  }

  dispose(): void {
    console.log(`[WebGLFallback] Mock renderer ${this.mockId} disposed`);
  }
}

/**
 * Main WebGL Fallback Manager
 */
export class WebGLFallbackManager {
  private config: Required<WebGLFallbackConfig>;
  private capabilities: FallbackCapabilities | null = null;
  private currentContext: FallbackContext | null = null;
  private isHeadless = false;
  private isDocker = false;
  private attemptCount = 0;

  constructor(config: WebGLFallbackConfig = {}) {
    this.config = {
      enableSoftwareRendering: true,
      enableCanvas2DFallback: true,
      maxFallbackAttempts: 3,
      enableHeadlessMode: true,
      enableMockCanvas: true,
      enableOffscreenCanvas: true,
      fallbackWidth: 800,
      fallbackHeight: 600,
      logLevel: 'info',
      ...config
    };

    this.detectEnvironment();
    this.log('info', 'WebGL Fallback Manager initialized', { 
      headless: this.isHeadless, 
      docker: this.isDocker 
    });
  }

  /**
   * Detect if we're running in headless or Docker environment
   */
  private detectEnvironment(): void {
    if (typeof window === 'undefined') {
      this.isHeadless = true;
      this.log('info', 'Detected server-side/headless environment');
      return;
    }

    // Check for headless Chrome indicators
    const windowChrome = (window as any).chrome;
    const isHeadlessChrome = !windowChrome || 
                            !windowChrome.runtime ||
                            navigator.webdriver === true ||
                            window.navigator.userAgent.includes('HeadlessChrome');

    // Check for Docker indicators
    const isDockerEnv = process.env.NODE_ENV === 'test' ||
                       process.env.DOCKER === 'true' ||
                       process.env.CONTAINER === 'docker' ||
                       window.location.hostname === 'localhost' && 
                       !window.devicePixelRatio;

    this.isHeadless = isHeadlessChrome;
    this.isDocker = isDockerEnv;

    this.log('info', 'Environment detected', {
      headless: this.isHeadless,
      docker: this.isDocker,
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio
    });
  }

  /**
   * Detect available capabilities
   */
  public detectCapabilities(): FallbackCapabilities {
    if (this.capabilities) {
      return this.capabilities;
    }

    this.log('debug', 'Detecting WebGL capabilities...');

    const capabilities: FallbackCapabilities = {
      webgl: false,
      webgl2: false,
      canvas2d: false,
      offscreenCanvas: false,
      headlessMode: this.isHeadless,
      softwareRendering: false,
      mockCanvas: false,
      recommendedMode: 'none'
    };

    // If we're in headless mode, skip real WebGL detection
    if (this.isHeadless) {
      this.log('info', 'Headless mode detected, skipping WebGL detection');
      capabilities.mockCanvas = this.config.enableMockCanvas;
      capabilities.softwareRendering = this.config.enableSoftwareRendering;
      capabilities.canvas2d = this.config.enableCanvas2DFallback;
      capabilities.recommendedMode = 'mock';
      this.capabilities = capabilities;
      return capabilities;
    }

    // Test real WebGL support
    try {
      const canvas = document.createElement('canvas');
      
      // Test WebGL 2
      const gl2 = canvas.getContext('webgl2');
      if (gl2 && 'isContextLost' in gl2 && !gl2.isContextLost()) {
        capabilities.webgl2 = true;
        capabilities.webgl = true;
        this.log('debug', 'WebGL 2 support detected');
      }
      
      // Test WebGL 1 if WebGL 2 not available
      if (!capabilities.webgl2) {
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl && 'isContextLost' in gl && !gl.isContextLost()) {
          capabilities.webgl = true;
          this.log('debug', 'WebGL 1 support detected');
        }
      }

      // Test Canvas 2D
      const ctx2d = canvas.getContext('2d');
      if (ctx2d) {
        capabilities.canvas2d = true;
        this.log('debug', 'Canvas 2D support detected');
      }

      // Test OffscreenCanvas
      if (typeof OffscreenCanvas !== 'undefined') {
        try {
          const offscreen = new OffscreenCanvas(1, 1);
          const offscreenCtx = offscreen.getContext('webgl');
          if (offscreenCtx) {
            capabilities.offscreenCanvas = true;
            this.log('debug', 'OffscreenCanvas support detected');
          }
        } catch (e) {
          this.log('debug', 'OffscreenCanvas not supported');
        }
      }

      // Clean up
      canvas.remove();

    } catch (error) {
      this.log('warn', 'Error during capability detection', error);
    }

    // Determine software rendering capability
    if (this.config.enableSoftwareRendering) {
      capabilities.softwareRendering = capabilities.canvas2d;
    }

    // Determine mock canvas capability
    if (this.config.enableMockCanvas) {
      capabilities.mockCanvas = true;
    }

    // Determine recommended mode
    if (capabilities.webgl2) {
      capabilities.recommendedMode = 'webgl2';
    } else if (capabilities.webgl) {
      capabilities.recommendedMode = 'webgl';
    } else if (capabilities.softwareRendering) {
      capabilities.recommendedMode = 'software';
    } else if (capabilities.canvas2d) {
      capabilities.recommendedMode = 'canvas2d';
    } else if (capabilities.mockCanvas) {
      capabilities.recommendedMode = 'mock';
    }

    this.capabilities = capabilities;
    this.log('info', 'Capability detection complete', capabilities);
    
    return capabilities;
  }

  /**
   * Create appropriate rendering context based on capabilities
   */
  public createContext(preferredMode?: string): FallbackContext {
    const capabilities = this.detectCapabilities();
    const mode = preferredMode || capabilities.recommendedMode;
    const startTime = performance.now();

    this.log('info', `Creating context for mode: ${mode}`);

    let context: FallbackContext = {
      type: 'none',
      context: null,
      canvas: null,
      renderer: null,
      capabilities,
      isHeadless: this.isHeadless,
      isDocker: this.isDocker,
      performance: {
        initTime: 0,
        renderTime: 0,
        memoryUsage: 0
      }
    };

    try {
      switch (mode) {
        case 'webgl2':
          context = this.createWebGL2Context();
          break;
        case 'webgl':
          context = this.createWebGLContext();
          break;
        case 'software':
          context = this.createSoftwareContext();
          break;
        case 'canvas2d':
          context = this.createCanvas2DContext();
          break;
        case 'mock':
          context = this.createMockContext();
          break;
        default:
          throw new Error(`Unsupported mode: ${mode}`);
      }

      context.performance.initTime = performance.now() - startTime;
      this.currentContext = context;
      
      this.log('info', `Context created successfully for mode: ${mode}`, {
        initTime: context.performance.initTime
      });

      // Record successful context creation
      webglDiagnostics.recordError(`Fallback context created: ${mode}`);

    } catch (error) {
      this.log('error', `Failed to create context for mode: ${mode}`, error);
      
      // Try fallback modes
      if (this.attemptCount < this.config.maxFallbackAttempts) {
        this.attemptCount++;
        return this.createFallbackContext(mode);
      }
      
      // Final fallback to mock
      context = this.createMockContext();
      this.log('warn', 'Using final mock context fallback');
    }

    return context;
  }

  /**
   * Create WebGL 2 context
   */
  private createWebGL2Context(): FallbackContext {
    if (this.isHeadless) {
      throw new Error('WebGL 2 not available in headless mode');
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.config.fallbackWidth;
    canvas.height = this.config.fallbackHeight;

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: false
    });

    if (!gl || ('isContextLost' in gl && gl.isContextLost())) {
      throw new Error('Failed to create WebGL 2 context');
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });

    return {
      type: 'webgl2',
      context: gl,
      canvas,
      renderer,
      capabilities: this.capabilities!,
      isHeadless: this.isHeadless,
      isDocker: this.isDocker,
      performance: {
        initTime: 0,
        renderTime: 0,
        memoryUsage: 0
      }
    };
  }

  /**
   * Create WebGL context
   */
  private createWebGLContext(): FallbackContext {
    if (this.isHeadless) {
      throw new Error('WebGL not available in headless mode');
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.config.fallbackWidth;
    canvas.height = this.config.fallbackHeight;

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: false
    }) || canvas.getContext('experimental-webgl');

    if (!gl || ('isContextLost' in gl && gl.isContextLost())) {
      throw new Error('Failed to create WebGL context');
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl as WebGLRenderingContext,
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });

    return {
      type: 'webgl',
      context: gl as WebGLRenderingContext,
      canvas,
      renderer,
      capabilities: this.capabilities!,
      isHeadless: this.isHeadless,
      isDocker: this.isDocker,
      performance: {
        initTime: 0,
        renderTime: 0,
        memoryUsage: 0
      }
    };
  }

  /**
   * Create software rendering context
   */
  private createSoftwareContext(): FallbackContext {
    let canvas: HTMLCanvasElement | MockCanvas;
    
    if (this.isHeadless) {
      canvas = new MockCanvas(this.config.fallbackWidth, this.config.fallbackHeight);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = this.config.fallbackWidth;
      canvas.height = this.config.fallbackHeight;
    }

    const renderer = new SoftwareRenderer(canvas);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to create 2D context for software rendering');
    }

    return {
      type: 'software',
      context: context,
      canvas,
      renderer,
      capabilities: this.capabilities!,
      isHeadless: this.isHeadless,
      isDocker: this.isDocker,
      performance: {
        initTime: 0,
        renderTime: 0,
        memoryUsage: 0
      }
    };
  }

  /**
   * Create Canvas 2D context
   */
  private createCanvas2DContext(): FallbackContext {
    let canvas: HTMLCanvasElement | MockCanvas;
    
    if (this.isHeadless) {
      canvas = new MockCanvas(this.config.fallbackWidth, this.config.fallbackHeight);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = this.config.fallbackWidth;
      canvas.height = this.config.fallbackHeight;
    }

    const renderer = new Canvas2DRenderer(canvas);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to create 2D context');
    }

    return {
      type: 'canvas2d',
      context: context,
      canvas,
      renderer,
      capabilities: this.capabilities!,
      isHeadless: this.isHeadless,
      isDocker: this.isDocker,
      performance: {
        initTime: 0,
        renderTime: 0,
        memoryUsage: 0
      }
    };
  }

  /**
   * Create mock context for complete fallback
   */
  private createMockContext(): FallbackContext {
    const canvas = new MockCanvas(this.config.fallbackWidth, this.config.fallbackHeight);
    const context = new MockWebGLContext(canvas);
    const renderer = new MockRenderer(this.config.fallbackWidth, this.config.fallbackHeight);

    return {
      type: 'mock',
      context,
      canvas,
      renderer,
      capabilities: this.capabilities!,
      isHeadless: this.isHeadless,
      isDocker: this.isDocker,
      performance: {
        initTime: 0,
        renderTime: 0,
        memoryUsage: 0
      }
    };
  }

  /**
   * Create fallback context when primary mode fails
   */
  private createFallbackContext(failedMode: string): FallbackContext {
    this.log('warn', `Attempting fallback from failed mode: ${failedMode}`);

    const fallbackOrder = ['webgl2', 'webgl', 'software', 'canvas2d', 'mock'];
    const currentIndex = fallbackOrder.indexOf(failedMode);
    
    for (let i = currentIndex + 1; i < fallbackOrder.length; i++) {
      const fallbackMode = fallbackOrder[i];
      
      try {
        this.log('info', `Trying fallback mode: ${fallbackMode}`);
        return this.createContext(fallbackMode);
      } catch (error) {
        this.log('warn', `Fallback mode ${fallbackMode} also failed`, error);
        continue;
      }
    }

    // If all else fails, create mock context
    this.log('warn', 'All fallback modes failed, using mock context');
    return this.createMockContext();
  }

  /**
   * Get current context
   */
  public getCurrentContext(): FallbackContext | null {
    return this.currentContext;
  }

  /**
   * Test if Three.js works with current context
   */
  public testThreeJS(): boolean {
    if (!this.currentContext || !this.currentContext.renderer) {
      return false;
    }

    try {
      // Create simple scene
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      
      scene.add(cube);
      camera.position.z = 5;

      // Test render
      const startTime = performance.now();
      
      if (this.currentContext.renderer instanceof THREE.WebGLRenderer) {
        this.currentContext.renderer.render(scene, camera);
      } else if (this.currentContext.renderer instanceof SoftwareRenderer) {
        this.currentContext.renderer.render(scene, camera);
      } else {
        this.currentContext.renderer.render();
      }
      
      const renderTime = performance.now() - startTime;
      this.currentContext.performance.renderTime = renderTime;

      this.log('info', 'Three.js test successful', { renderTime });
      return true;

    } catch (error) {
      this.log('error', 'Three.js test failed', error);
      return false;
    }
  }

  /**
   * Dispose current context
   */
  public dispose(): void {
    if (this.currentContext) {
      try {
        if (this.currentContext.renderer) {
          this.currentContext.renderer.dispose();
        }
        
        if (this.currentContext.canvas && 'remove' in this.currentContext.canvas) {
          (this.currentContext.canvas as HTMLCanvasElement).remove();
        }
      } catch (error) {
        this.log('warn', 'Error during context disposal', error);
      }

      this.currentContext = null;
    }

    this.log('info', 'WebGL Fallback Manager disposed');
  }

  /**
   * Logging utility
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.config.logLevel === 'none') return;

    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);

    if (logLevelIndex >= currentLevelIndex) {
      const prefix = '[WebGLFallback]';
      if (data) {
        console[level](prefix, message, data);
      } else {
        console[level](prefix, message);
      }
    }
  }

  /**
   * Get diagnostic information
   */
  public getDiagnostics(): {
    capabilities: FallbackCapabilities | null;
    currentContext: FallbackContext | null;
    environment: {
      isHeadless: boolean;
      isDocker: boolean;
      userAgent?: string;
    };
    performance: {
      attemptCount: number;
      lastInitTime: number;
      lastRenderTime: number;
    };
  } {
    return {
      capabilities: this.capabilities,
      currentContext: this.currentContext,
      environment: {
        isHeadless: this.isHeadless,
        isDocker: this.isDocker,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      },
      performance: {
        attemptCount: this.attemptCount,
        lastInitTime: this.currentContext?.performance.initTime || 0,
        lastRenderTime: this.currentContext?.performance.renderTime || 0
      }
    };
  }
}

// Export singleton instance
export const webglFallbackManager = new WebGLFallbackManager();

// Export helper functions
export function createWebGLFallback(config?: WebGLFallbackConfig): FallbackContext {
  const manager = new WebGLFallbackManager(config);
  return manager.createContext();
}

export function detectWebGLCapabilities(): FallbackCapabilities {
  return webglFallbackManager.detectCapabilities();
}

export function isHeadlessEnvironment(): boolean {
  if (typeof window === 'undefined') return true;
  
  const windowChrome = (window as any).chrome;
  return !windowChrome || 
         !windowChrome.runtime || 
         navigator.webdriver === true;
}

export function createMockWebGLContext(width = 800, height = 600): {
  canvas: MockCanvas;
  context: MockWebGLContext;
} {
  const canvas = new MockCanvas(width, height);
  const context = new MockWebGLContext(canvas);
  return { canvas, context };
}