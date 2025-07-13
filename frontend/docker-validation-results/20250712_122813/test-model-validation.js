const { ModelExistenceValidator } = require('../utils/modelExistenceValidator.js');

async function testModelValidation() {
    console.log('🔍 Testing Enhanced Model Validation System...');
    
    try {
        const validator = ModelExistenceValidator.getInstance();
        
        // Test known models
        const modelsToTest = [
            '/models/seiron.glb',
            '/models/seiron_animated.gltf',
            '/models/seiron_optimized.glb',
            '/models/dragon_head_optimized.glb'
        ];
        
        console.log('📋 Testing model availability...');
        const results = await validator.validateModels(modelsToTest);
        
        let availableCount = 0;
        let unavailableCount = 0;
        
        results.forEach(result => {
            if (result.exists) {
                console.log(`✅ ${result.path} - Available (${result.loadTime}ms, ${result.fileSize} bytes)`);
                availableCount++;
            } else {
                console.log(`❌ ${result.path} - Not available: ${result.error}`);
                unavailableCount++;
            }
        });
        
        console.log(`\n📊 Summary: ${availableCount} available, ${unavailableCount} unavailable`);
        
        // Test fallback chain creation
        console.log('\n🔗 Testing fallback chain creation...');
        const fallbackChain = await validator.createFallbackChain('seiron-primary');
        console.log(`Fallback chain: ${fallbackChain.join(' → ')}`);
        
        // Generate diagnostic report
        console.log('\n📈 Generating diagnostic report...');
        const report = await validator.createDiagnosticReport();
        
        console.log('🏥 Health Score:', report.healthScore);
        console.log('📊 Available Models:', report.availableModels.length);
        console.log('🚫 Failed Models:', report.failedModels.length);
        
        // Return success if health score is good
        return report.healthScore >= 50;
        
    } catch (error) {
        console.error('❌ Model validation test failed:', error);
        return false;
    }
}

testModelValidation().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
