import { z } from 'zod'
import { config } from 'dotenv'
import { join } from 'path'

// Load test environment if in test mode
if (process.env.NODE_ENV === 'test' || process.argv.includes('--test')) {
  config({ path: join(process.cwd(), '.env.test') })
}

// Define required environment variables schema
const EnvironmentSchema = z.object({
  // Next.js specific
  NODE_ENV: z.enum(['development', 'production', 'test']),
  
  // Database
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  
  // API endpoints
  NEXT_PUBLIC_BACKEND_URL: z.string().url('Invalid backend URL'),
  
  // Voice/AI services
  NEXT_PUBLIC_ELEVENLABS_API_KEY: z.string().min(1, 'ElevenLabs API key is required'),
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required').optional(),
  
  // Wallet/Auth
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1, 'Privy App ID is required'),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1, 'WalletConnect Project ID is required'),
  
  // Security
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters').optional(),
  NEXTAUTH_URL: z.string().url('Invalid NextAuth URL').optional(),
  
  // Blockchain
  SEI_RPC_URL: z.string().url('Invalid Sei RPC URL').optional(),
  SEI_CHAIN_ID: z.string().optional(),
  
  // Redis/Caching
  REDIS_URL: z.string().url('Invalid Redis URL').optional(),
  
  // Deployment
  VERCEL_URL: z.string().optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
})

export interface ValidationResult {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
    severity: 'error' | 'warning'
  }>
  warnings: Array<{
    field: string
    message: string
  }>
  summary: {
    total: number
    valid: number
    invalid: number
    warnings: number
  }
}

export class EnvironmentValidator {
  private errors: ValidationResult['errors'] = []
  private warnings: ValidationResult['warnings'] = []

  validate(): ValidationResult {
    this.errors = []
    this.warnings = []

    // Validate required environment variables
    this.validateEnvironmentVariables()
    
    // Validate URLs accessibility
    this.validateURLs()
    
    // Validate API keys format
    this.validateAPIKeys()
    
    // Check for development vs production configurations
    this.validateEnvironmentSpecificConfigs()

    const total = Object.keys(process.env).length
    const invalid = this.errors.length
    const warnings = this.warnings.length
    const valid = total - invalid

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        total,
        valid,
        invalid,
        warnings
      }
    }
  }

  private validateEnvironmentVariables() {
    try {
      EnvironmentSchema.parse(process.env)
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          this.errors.push({
            field: issue.path.join('.'),
            message: issue.message,
            severity: 'error'
          })
        }
      }
    }
  }

  private validateURLs() {
    const urls = [
      { key: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
      { key: 'NEXT_PUBLIC_BACKEND_URL', value: process.env.NEXT_PUBLIC_BACKEND_URL },
      { key: 'SEI_RPC_URL', value: process.env.SEI_RPC_URL },
      { key: 'REDIS_URL', value: process.env.REDIS_URL },
    ]

    urls.forEach(({ key, value }) => {
      if (value && !this.isValidURL(value)) {
        this.errors.push({
          field: key,
          message: `Invalid URL format: ${value}`,
          severity: 'error'
        })
      }
    })
  }

  private validateAPIKeys() {
    const apiKeys = [
      { key: 'NEXT_PUBLIC_ELEVENLABS_API_KEY', value: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY },
      { key: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY },
      { key: 'NEXT_PUBLIC_PRIVY_APP_ID', value: process.env.NEXT_PUBLIC_PRIVY_APP_ID },
    ]

    apiKeys.forEach(({ key, value }) => {
      if (value) {
        if (key.includes('ELEVENLABS') && !value.startsWith('sk-')) {
          this.warnings.push({
            field: key,
            message: 'ElevenLabs API key should start with "sk-"'
          })
        }
        
        if (key.includes('OPENAI') && !value.startsWith('sk-')) {
          this.warnings.push({
            field: key,
            message: 'OpenAI API key should start with "sk-"'
          })
        }
      }
    })
  }

  private validateEnvironmentSpecificConfigs() {
    const env = process.env.NODE_ENV

    // Production-specific validations
    if (env === 'production') {
      if (!process.env.NEXTAUTH_SECRET) {
        this.errors.push({
          field: 'NEXTAUTH_SECRET',
          message: 'NextAuth secret is required in production',
          severity: 'error'
        })
      }

      if (process.env.NEXT_PUBLIC_BACKEND_URL?.includes('localhost')) {
        this.warnings.push({
          field: 'NEXT_PUBLIC_BACKEND_URL',
          message: 'Using localhost URL in production environment'
        })
      }
    }

    // Development-specific validations
    if (env === 'development') {
      if (!process.env.NEXT_PUBLIC_BACKEND_URL?.includes('localhost')) {
        this.warnings.push({
          field: 'NEXT_PUBLIC_BACKEND_URL',
          message: 'Consider using localhost URL in development'
        })
      }
    }

    // Test environment validations
    if (env === 'test') {
      const testEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_BACKEND_URL'
      ]

      testEnvVars.forEach(envVar => {
        const value = process.env[envVar]
        if (value && !value.includes('test') && !value.includes('localhost')) {
          this.warnings.push({
            field: envVar,
            message: 'Consider using test-specific URLs in test environment'
          })
        }
      })
    }
  }

  private isValidURL(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // Static method for quick validation
  static validate(): ValidationResult {
    const validator = new EnvironmentValidator()
    return validator.validate()
  }

  // Method to print validation results
  static printResults(result: ValidationResult) {
    console.log('🔍 Environment Validation Results')
    console.log('================================')
    
    if (result.isValid) {
      console.log('✅ All environment variables are valid!')
    } else {
      console.log('❌ Environment validation failed')
    }

    console.log(`\n📊 Summary:`)
    console.log(`   Total variables: ${result.summary.total}`)
    console.log(`   Valid: ${result.summary.valid}`)
    console.log(`   Invalid: ${result.summary.invalid}`)
    console.log(`   Warnings: ${result.summary.warnings}`)

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:')
      result.errors.forEach(error => {
        console.log(`   ${error.field}: ${error.message}`)
      })
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:')
      result.warnings.forEach(warning => {
        console.log(`   ${warning.field}: ${warning.message}`)
      })
    }

    console.log('')
  }
}

// CLI usage
if (require.main === module) {
  const result = EnvironmentValidator.validate()
  EnvironmentValidator.printResults(result)
  process.exit(result.isValid ? 0 : 1)
}