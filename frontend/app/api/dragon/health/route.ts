import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// GET /api/dragon/health - Health check for dragon 3D models and resources
export async function GET(request: NextRequest) {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const modelsDir = path.join(publicDir, 'models');
    
    // Check critical dragon model files
    const criticalModels = [
      'seiron_animated_optimized.gltf',
      'seiron_optimized.glb',
      'seiron_animated_lod_high.gltf',
      'seiron_animated.bin'
    ];
    
    const modelHealth = await Promise.all(
      criticalModels.map(async (modelName) => {
        const modelPath = path.join(modelsDir, modelName);
        try {
          const stats = await fs.stat(modelPath);
          return {
            name: modelName,
            status: 'healthy',
            exists: true,
            size: stats.size,
            sizeHuman: formatBytes(stats.size),
            lastModified: stats.mtime,
            path: `/models/${modelName}`,
            accessible: true
          };
        } catch (error) {
          return {
            name: modelName,
            status: 'unhealthy',
            exists: false,
            error: 'File not found',
            path: `/models/${modelName}`,
            accessible: false
          };
        }
      })
    );
    
    // Check textures directory
    const texturesDir = path.join(modelsDir, 'textures');
    let texturesHealth = {
      directory: '/models/textures',
      exists: false,
      count: 0,
      status: 'unhealthy'
    };
    
    try {
      const textureFiles = await fs.readdir(texturesDir);
      const imageFiles = textureFiles.filter(file => 
        file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')
      );
      
      texturesHealth = {
        directory: '/models/textures',
        exists: true,
        count: imageFiles.length,
        status: imageFiles.length > 0 ? 'healthy' : 'empty'
      };
    } catch (error) {
      // texturesHealth already set to unhealthy
    }
    
    // Overall health assessment
    const healthyModels = modelHealth.filter(m => m.status === 'healthy');
    const overallHealth = {
      status: healthyModels.length === criticalModels.length ? 'healthy' : 'degraded',
      modelsFound: healthyModels.length,
      modelsTotal: criticalModels.length,
      texturesStatus: texturesHealth.status,
      recommendation: healthyModels.length === criticalModels.length 
        ? 'All critical models are available' 
        : 'Some models are missing - dragon may fallback to 2D/ASCII mode'
    };
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall: overallHealth,
      models: modelHealth,
      textures: texturesHealth,
      paths: {
        modelsDirectory: '/models',
        texturesDirectory: '/models/textures',
        publicDirectory: '/public'
      }
    });
  } catch (error) {
    console.error('Dragon health check error:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall: {
        status: 'error',
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
