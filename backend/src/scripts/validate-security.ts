#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { validateStartupConfiguration } from '../config/validation';
import { validateSecurityConfiguration } from '../middleware/security';
import { apiKeyValidationService } from '../services/ApiKeyValidationService';
import { securityAuditService } from '../services/SecurityAuditService';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

/**
 * Comprehensive security validation script
 */
async function validateSecurity(): Promise<void> {
  console.log('🔐 Starting comprehensive security validation...\n');

  let hasErrors = false;
  let hasWarnings = false;

  try {
    // 1. Validate startup configuration
    console.log('1️⃣  Validating startup configuration...');
    const startupValidation = validateStartupConfiguration();
    
    if (startupValidation._tag === 'Left') {
      console.error('❌ Startup configuration validation failed:');
      startupValidation.left.forEach(error => {
        console.error(`   • ${error.field}: ${error.message}`);
      });
      hasErrors = true;
    } else {
      console.log('✅ Startup configuration validation passed');
      
      if (startupValidation.right.apiKeys.warnings.length > 0) {
        console.warn('⚠️  Configuration warnings:');
        startupValidation.right.apiKeys.warnings.forEach(warning => {
          console.warn(`   • ${warning}`);
        });
        hasWarnings = true;
      }
      
      console.log(`   Environment: ${startupValidation.right.environment.environment}`);
      console.log(`   Security Level: ${startupValidation.right.environment.securityLevel}`);
      console.log(`   Configured Keys: ${Object.keys(startupValidation.right.apiKeys.keys).length}`);
    }

    // 2. Validate security middleware configuration
    console.log('\n2️⃣  Validating security middleware configuration...');
    const securityValidation = await validateSecurityConfiguration();
    
    if (!securityValidation.success) {
      console.error('❌ Security middleware validation failed:');
      securityValidation.errors.forEach(error => {
        console.error(`   • ${error}`);
      });
      hasErrors = true;
    } else {
      console.log('✅ Security middleware validation passed');
    }
    
    if (securityValidation.warnings.length > 0) {
      console.warn('⚠️  Security middleware warnings:');
      securityValidation.warnings.forEach(warning => {
        console.warn(`   • ${warning}`);
      });
      hasWarnings = true;
    }

    // 3. Test API key validation service
    console.log('\n3️⃣  Testing API key validation service...');
    try {
      const requiredKeysValidation = apiKeyValidationService.validateRequiredKeys();
      
      if (requiredKeysValidation._tag === 'Left') {
        console.error('❌ Required keys validation failed:');
        requiredKeysValidation.left.forEach(error => {
          console.error(`   • ${error.message}`);
        });
        hasErrors = true;
      } else {
        console.log('✅ API key validation service operational');
        
        const keyStats = apiKeyValidationService.getKeyUsageStats();
        console.log(`   Tracked API keys: ${Object.keys(keyStats).length}`);
      }
    } catch (error) {
      console.error('❌ API key validation service error:', error);
      hasErrors = true;
    }

    // 4. Test security audit service
    console.log('\n4️⃣  Testing security audit service...');
    try {
      // Log a test security event
      securityAuditService.logEvent({
        eventType: 'system_security_event',
        severity: 'low',
        source: 'security_validation_script',
        success: true,
        message: 'Security validation test event'
      });

      const metrics = securityAuditService.getMetrics();
      console.log('✅ Security audit service operational');
      console.log(`   Total events logged: ${metrics.totalEvents}`);
      console.log(`   Alert configurations: ${metrics.alertConfigs.length}`);
      console.log(`   Recent alerts: ${metrics.recentAlerts}`);
    } catch (error) {
      console.error('❌ Security audit service error:', error);
      hasErrors = true;
    }

    // 5. Validate environment-specific security requirements
    console.log('\n5️⃣  Validating environment-specific security...');
    const environment = process.env.NODE_ENV || 'development';
    
    if (environment === 'production') {
      const productionRequirements = [
        { key: 'INTERNAL_API_KEY', name: 'Internal API Key' },
        { key: 'JWT_SECRET', name: 'JWT Secret' },
        { key: 'OPENAI_API_KEY', name: 'OpenAI API Key' },
        { key: 'SUPABASE_SERVICE_ROLE_KEY', name: 'Supabase Service Role Key' }
      ];

      productionRequirements.forEach(req => {
        if (!process.env[req.key]) {
          console.error(`❌ Production requirement missing: ${req.name} (${req.key})`);
          hasErrors = true;
        }
      });

      if (hasErrors) {
        console.error('❌ Production security requirements not met');
      } else {
        console.log('✅ Production security requirements validated');
      }
    } else {
      console.log(`✅ Development environment security validated (${environment})`);
    }

    // 6. Security configuration recommendations
    console.log('\n6️⃣  Security configuration recommendations...');
    const recommendations: string[] = [];

    if (!process.env.REDIS_URL && environment === 'production') {
      recommendations.push('Configure REDIS_URL for enhanced rate limiting and session management');
    }

    if (!process.env.MCP_API_KEY) {
      recommendations.push('Configure MCP_API_KEY for secure MCP server communication');
    }

    if (!process.env.BLOCKED_IPS && !process.env.ALLOWED_IPS) {
      recommendations.push('Consider configuring IP allowlist/blocklist for additional security');
    }

    if (process.env.FRONTEND_URL === 'http://localhost:3000' && environment === 'production') {
      recommendations.push('Update FRONTEND_URL for production deployment');
    }

    if (recommendations.length > 0) {
      console.log('💡 Security recommendations:');
      recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
      hasWarnings = true;
    } else {
      console.log('✅ No additional security recommendations');
    }

    // 7. Generate security report
    console.log('\n7️⃣  Generating security report...');
    const now = new Date();
    const report = securityAuditService.generateSecurityReport({
      startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
      endDate: now
    });

    console.log('📊 Security Report Summary:');
    console.log(`   Total Events (24h): ${report.summary.totalEvents}`);
    console.log(`   Critical Events: ${report.summary.criticalEvents}`);
    console.log(`   Failed Events: ${report.summary.failedEvents}`);
    console.log(`   Unique IPs: ${report.summary.uniqueIPs}`);
    console.log(`   Failure Rate: ${(report.trends.failureRate * 100).toFixed(2)}%`);

    if (report.recommendations.length > 0) {
      console.log('🚨 Security Alert Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
      hasWarnings = true;
    }

    // Final summary
    console.log('\n📋 Validation Summary:');
    if (hasErrors) {
      console.error('❌ Security validation completed with ERRORS');
      console.error('   Please address the errors above before deploying to production.');
      process.exit(1);
    } else if (hasWarnings) {
      console.warn('⚠️  Security validation completed with warnings');
      console.warn('   Consider addressing the warnings above for optimal security.');
      process.exit(0);
    } else {
      console.log('✅ Security validation completed successfully');
      console.log('   All security checks passed. System is ready for deployment.');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n💥 Security validation failed with error:', error);
    logger.error('Security validation script error', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Run the validation
if (require.main === module) {
  validateSecurity().catch(error => {
    console.error('💥 Unhandled error in security validation:', error);
    process.exit(1);
  });
}

export { validateSecurity };