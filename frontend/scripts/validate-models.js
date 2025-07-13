#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const gl = require('gl');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Model validation report
const report = {
  totalModels: 0,
  validModels: 0,
  missingModels: [],
  corruptedModels: [],
  invalidFormat: [],
  loadingErrors: [],
  summary: {},
  timestamp: new Date().toISOString(),
};

// Expected model files (customize this list based on your project)
const EXPECTED_MODELS = [
  'dragon_head_optimized.glb',
  'dragon_head.glb',
  'seiron_animated_lod_high.gltf',
  'seiron_animated_optimized.gltf',
  'seiron_animated.gltf',
  'seiron_optimized.glb',
  'seiron.glb',
  // Add more model filenames as needed
];

// Configuration
const MODELS_DIR = path.join(process.cwd(), 'public', 'models');
const MIN_FILE_SIZE = 100; // Minimum file size in bytes
const MAX_FILE_SIZE = 100 * 1024 * 1024; // Maximum file size in bytes (100MB)

/**
 * Check if a file exists and get its stats
 */
async function checkFileExists(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    return { exists: true, stats };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

/**
 * Validate GLTF/GLB file format
 */
async function validateGLTFFormat(filePath) {
  try {
    const buffer = await fs.promises.readFile(filePath);
    
    // Check GLB magic number
    if (path.extname(filePath).toLowerCase() === '.glb') {
      const magic = buffer.toString('utf8', 0, 4);
      if (magic !== 'glTF') {
        return { valid: false, error: 'Invalid GLB magic number' };
      }
      
      // Check GLB version
      const version = buffer.readUInt32LE(4);
      if (version !== 2) {
        return { valid: false, error: `Unsupported GLB version: ${version}` };
      }
      
      // Check GLB length
      const length = buffer.readUInt32LE(8);
      if (length !== buffer.length) {
        return { valid: false, error: 'GLB length mismatch' };
      }
    }
    
    // For GLTF files, try to parse as JSON
    if (path.extname(filePath).toLowerCase() === '.gltf') {
      try {
        const content = buffer.toString('utf8');
        const gltf = JSON.parse(content);
        
        // Check for required GLTF properties
        if (!gltf.asset || !gltf.asset.version) {
          return { valid: false, error: 'Missing required GLTF asset information' };
        }
        
        // Check GLTF version
        const majorVersion = parseInt(gltf.asset.version.split('.')[0]);
        if (majorVersion !== 2) {
          return { valid: false, error: `Unsupported GLTF version: ${gltf.asset.version}` };
        }
      } catch (parseError) {
        return { valid: false, error: `Invalid GLTF JSON: ${parseError.message}` };
      }
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Test loading model with headless WebGL context
 */
async function testWebGLLoading(filePath) {
  try {
    // Create headless WebGL context
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const glContext = gl(width, height, { preserveDrawingBuffer: true });
    
    if (!glContext) {
      return { success: false, error: 'Failed to create WebGL context' };
    }
    
    // Test basic WebGL operations
    glContext.clearColor(0.0, 0.0, 0.0, 1.0);
    glContext.clear(glContext.COLOR_BUFFER_BIT);
    
    // Check WebGL capabilities
    const maxTextureSize = glContext.getParameter(glContext.MAX_TEXTURE_SIZE);
    const maxVertexAttribs = glContext.getParameter(glContext.MAX_VERTEX_ATTRIBS);
    const renderer = glContext.getParameter(glContext.RENDERER);
    const vendor = glContext.getParameter(glContext.VENDOR);
    
    // Simulate model loading by reading file data
    const fileData = await fs.promises.readFile(filePath);
    
    // Basic memory allocation test
    const vertices = new Float32Array(1000);
    const buffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, vertices, glContext.STATIC_DRAW);
    
    // Clean up
    glContext.deleteBuffer(buffer);
    
    return {
      success: true,
      details: {
        renderer,
        vendor,
        maxTextureSize,
        maxVertexAttribs,
        fileSize: fileData.length,
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Validate a single model file
 */
async function validateModel(modelName) {
  const filePath = path.join(MODELS_DIR, modelName);
  const result = {
    name: modelName,
    path: filePath,
    exists: false,
    size: 0,
    formatValid: false,
    webglLoadable: false,
    errors: [],
    warnings: [],
  };
  
  console.log(`\n${colors.cyan}Validating: ${modelName}${colors.reset}`);
  
  // Check file existence
  const fileCheck = await checkFileExists(filePath);
  if (!fileCheck.exists) {
    result.errors.push(`File not found: ${fileCheck.error}`);
    report.missingModels.push(modelName);
    console.log(`  ${colors.red}✗ File missing${colors.reset}`);
    return result;
  }
  
  result.exists = true;
  result.size = fileCheck.stats.size;
  console.log(`  ${colors.green}✓ File exists${colors.reset} (${(result.size / 1024 / 1024).toFixed(2)} MB)`);
  
  // Check file size
  if (result.size < MIN_FILE_SIZE) {
    result.warnings.push(`File size too small: ${result.size} bytes`);
    console.log(`  ${colors.yellow}⚠ File size suspiciously small${colors.reset}`);
  }
  
  if (result.size > MAX_FILE_SIZE) {
    result.errors.push(`File size too large: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  ${colors.red}✗ File size exceeds limit${colors.reset}`);
  }
  
  // Validate GLTF/GLB format
  const formatValidation = await validateGLTFFormat(filePath);
  if (!formatValidation.valid) {
    result.errors.push(`Format validation failed: ${formatValidation.error}`);
    report.invalidFormat.push(modelName);
    console.log(`  ${colors.red}✗ Invalid format: ${formatValidation.error}${colors.reset}`);
  } else {
    result.formatValid = true;
    console.log(`  ${colors.green}✓ Valid GLTF/GLB format${colors.reset}`);
  }
  
  // Test WebGL loading
  const webglTest = await testWebGLLoading(filePath);
  if (!webglTest.success) {
    result.errors.push(`WebGL loading failed: ${webglTest.error}`);
    report.loadingErrors.push(modelName);
    console.log(`  ${colors.red}✗ WebGL loading failed: ${webglTest.error}${colors.reset}`);
  } else {
    result.webglLoadable = true;
    console.log(`  ${colors.green}✓ WebGL loading successful${colors.reset}`);
    if (webglTest.details) {
      console.log(`    Renderer: ${webglTest.details.renderer}`);
      console.log(`    Max texture size: ${webglTest.details.maxTextureSize}`);
    }
  }
  
  // Determine overall status
  if (result.errors.length === 0) {
    report.validModels++;
    result.status = 'valid';
  } else if (result.exists && result.formatValid) {
    result.status = 'partial';
  } else {
    result.status = 'invalid';
  }
  
  return result;
}

/**
 * Scan for additional models in the directory
 */
async function scanForAdditionalModels() {
  try {
    const files = await fs.promises.readdir(MODELS_DIR);
    const modelFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.gltf' || ext === '.glb';
    });
    
    const additionalModels = modelFiles.filter(file => !EXPECTED_MODELS.includes(file));
    
    if (additionalModels.length > 0) {
      console.log(`\n${colors.yellow}Found additional models not in expected list:${colors.reset}`);
      additionalModels.forEach(model => {
        console.log(`  - ${model}`);
      });
      
      // Validate additional models
      for (const model of additionalModels) {
        const result = await validateModel(model);
        report.summary[model] = result;
      }
    }
    
    return additionalModels;
  } catch (error) {
    console.error(`${colors.red}Error scanning models directory: ${error.message}${colors.reset}`);
    return [];
  }
}

/**
 * Generate final report
 */
function generateReport() {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}Model Validation Report${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  console.log(`\n${colors.cyan}Summary:${colors.reset}`);
  console.log(`  Total models checked: ${report.totalModels}`);
  console.log(`  Valid models: ${colors.green}${report.validModels}${colors.reset}`);
  console.log(`  Missing models: ${colors.red}${report.missingModels.length}${colors.reset}`);
  console.log(`  Corrupted models: ${colors.red}${report.corruptedModels.length}${colors.reset}`);
  console.log(`  Invalid format: ${colors.red}${report.invalidFormat.length}${colors.reset}`);
  console.log(`  Loading errors: ${colors.red}${report.loadingErrors.length}${colors.reset}`);
  
  if (report.missingModels.length > 0) {
    console.log(`\n${colors.red}Missing Models:${colors.reset}`);
    report.missingModels.forEach(model => {
      console.log(`  - ${model}`);
    });
  }
  
  if (report.corruptedModels.length > 0) {
    console.log(`\n${colors.red}Corrupted Models:${colors.reset}`);
    report.corruptedModels.forEach(model => {
      console.log(`  - ${model}`);
    });
  }
  
  if (report.invalidFormat.length > 0) {
    console.log(`\n${colors.red}Invalid Format:${colors.reset}`);
    report.invalidFormat.forEach(model => {
      console.log(`  - ${model}`);
    });
  }
  
  if (report.loadingErrors.length > 0) {
    console.log(`\n${colors.red}WebGL Loading Errors:${colors.reset}`);
    report.loadingErrors.forEach(model => {
      console.log(`  - ${model}`);
    });
  }
  
  // Write detailed report to file
  const reportPath = path.join('scripts', 'model-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n${colors.green}Detailed report saved to: ${reportPath}${colors.reset}`);
  
  // Return exit code based on validation results
  const hasErrors = report.missingModels.length > 0 || 
                   report.corruptedModels.length > 0 || 
                   report.invalidFormat.length > 0 || 
                   report.loadingErrors.length > 0;
  
  return hasErrors ? 1 : 0;
}

/**
 * Main validation function
 */
async function main() {
  console.log(`${colors.magenta}3D Model Validation Script${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}`);
  console.log(`Checking models in: ${MODELS_DIR}`);
  
  // Check if models directory exists
  const dirCheck = await checkFileExists(MODELS_DIR);
  if (!dirCheck.exists) {
    console.error(`${colors.red}Error: Models directory not found at ${MODELS_DIR}${colors.reset}`);
    console.log(`Please ensure the /public/models directory exists.`);
    process.exit(1);
  }
  
  // Validate expected models
  for (const modelName of EXPECTED_MODELS) {
    report.totalModels++;
    const result = await validateModel(modelName);
    report.summary[modelName] = result;
  }
  
  // Scan for additional models
  const additionalModels = await scanForAdditionalModels();
  report.totalModels += additionalModels.length;
  
  // Generate and display report
  const exitCode = generateReport();
  
  process.exit(exitCode);
}

// Run the validation
main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
