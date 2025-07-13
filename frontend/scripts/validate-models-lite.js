#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
  summary: {},
  timestamp: new Date().toISOString(),
};

// Expected model files
const EXPECTED_MODELS = [
  'dragon_head_optimized.glb',
  'dragon_head.glb',
  'seiron_animated_lod_high.gltf',
  'seiron_animated_optimized.gltf',
  'seiron_animated.gltf',
  'seiron_optimized.glb',
  'seiron.glb',
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
        
        // Additional GLTF validation
        if (gltf.buffers) {
          console.log(`    Found ${gltf.buffers.length} buffer(s)`);
        }
        if (gltf.meshes) {
          console.log(`    Found ${gltf.meshes.length} mesh(es)`);
        }
        if (gltf.materials) {
          console.log(`    Found ${gltf.materials.length} material(s)`);
        }
        if (gltf.animations) {
          console.log(`    Found ${gltf.animations.length} animation(s)`);
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
  
  // Check for associated files (for GLTF)
  if (path.extname(filePath).toLowerCase() === '.gltf') {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const gltf = JSON.parse(content);
      
      // Check for external buffers
      if (gltf.buffers) {
        for (const buffer of gltf.buffers) {
          if (buffer.uri && !buffer.uri.startsWith('data:')) {
            const bufferPath = path.join(path.dirname(filePath), buffer.uri);
            const bufferCheck = await checkFileExists(bufferPath);
            if (!bufferCheck.exists) {
              result.warnings.push(`Referenced buffer file missing: ${buffer.uri}`);
              console.log(`  ${colors.yellow}⚠ Missing buffer: ${buffer.uri}${colors.reset}`);
            } else {
              console.log(`  ${colors.green}✓ Found buffer: ${buffer.uri}${colors.reset}`);
            }
          }
        }
      }
      
      // Check for external images
      if (gltf.images) {
        for (const image of gltf.images) {
          if (image.uri && !image.uri.startsWith('data:')) {
            const imagePath = path.join(path.dirname(filePath), image.uri);
            const imageCheck = await checkFileExists(imagePath);
            if (!imageCheck.exists) {
              result.warnings.push(`Referenced image file missing: ${image.uri}`);
              console.log(`  ${colors.yellow}⚠ Missing image: ${image.uri}${colors.reset}`);
            }
          }
        }
      }
    } catch (error) {
      // Ignore parsing errors as they're already caught above
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
  console.log(`${colors.blue}Model Validation Report (Lite Version)${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  console.log(`\n${colors.cyan}Summary:${colors.reset}`);
  console.log(`  Total models checked: ${report.totalModels}`);
  console.log(`  Valid models: ${colors.green}${report.validModels}${colors.reset}`);
  console.log(`  Missing models: ${colors.red}${report.missingModels.length}${colors.reset}`);
  console.log(`  Invalid format: ${colors.red}${report.invalidFormat.length}${colors.reset}`);
  
  if (report.missingModels.length > 0) {
    console.log(`\n${colors.red}Missing Models:${colors.reset}`);
    report.missingModels.forEach(model => {
      console.log(`  - ${model}`);
    });
  }
  
  if (report.invalidFormat.length > 0) {
    console.log(`\n${colors.red}Invalid Format:${colors.reset}`);
    report.invalidFormat.forEach(model => {
      console.log(`  - ${model}`);
    });
  }
  
  // Detailed results
  console.log(`\n${colors.cyan}Detailed Results:${colors.reset}`);
  Object.entries(report.summary).forEach(([modelName, result]) => {
    const statusColor = result.status === 'valid' ? colors.green : 
                       result.status === 'partial' ? colors.yellow : colors.red;
    console.log(`\n  ${modelName}: ${statusColor}${result.status}${colors.reset}`);
    
    if (result.errors.length > 0) {
      console.log(`    Errors:`);
      result.errors.forEach(error => {
        console.log(`      - ${colors.red}${error}${colors.reset}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log(`    Warnings:`);
      result.warnings.forEach(warning => {
        console.log(`      - ${colors.yellow}${warning}${colors.reset}`);
      });
    }
  });
  
  // Write detailed report to file
  const reportPath = path.join('scripts', 'model-validation-report-lite.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n${colors.green}Detailed report saved to: ${reportPath}${colors.reset}`);
  
  console.log(`\n${colors.yellow}Note: This is the lite version without WebGL testing.${colors.reset}`);
  console.log(`${colors.yellow}For full WebGL validation, install dependencies and run validate-models.js${colors.reset}`);
  
  // Return exit code based on validation results
  const hasErrors = report.missingModels.length > 0 || 
                   report.invalidFormat.length > 0;
  
  return hasErrors ? 1 : 0;
}

/**
 * Main validation function
 */
async function main() {
  console.log(`${colors.magenta}3D Model Validation Script (Lite Version)${colors.reset}`);
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
