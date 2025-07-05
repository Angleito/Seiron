#!/usr/bin/env node

const fs = require('fs').promises
const path = require('path')
const glob = require('glob').glob

/**
 * Script to replace console.log statements with proper logger calls
 */

const LOGGER_IMPORT = "import { logger } from '@/lib/logger'"
const LOGGER_IMPORT_RELATIVE = "import { logger } from '../lib/logger'"

// Patterns to replace
const REPLACEMENTS = [
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.debug(',
    description: 'console.log -> logger.debug'
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
    description: 'console.info -> logger.info'
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    description: 'console.warn -> logger.warn'
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    description: 'console.error -> logger.error'
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
    description: 'console.debug -> logger.debug'
  },
  {
    pattern: /console\.group\(/g,
    replacement: 'logger.group(',
    description: 'console.group -> logger.group'
  },
  {
    pattern: /console\.groupEnd\(/g,
    replacement: 'logger.groupEnd(',
    description: 'console.groupEnd -> logger.groupEnd'
  },
  {
    pattern: /console\.table\(/g,
    replacement: 'logger.table(',
    description: 'console.table -> logger.table'
  },
  {
    pattern: /console\.time\(/g,
    replacement: 'logger.time(',
    description: 'console.time -> logger.time'
  },
  {
    pattern: /console\.timeEnd\(/g,
    replacement: 'logger.timeEnd(',
    description: 'console.timeEnd -> logger.timeEnd'
  },
  {
    pattern: /console\.assert\(/g,
    replacement: 'logger.assert(',
    description: 'console.assert -> logger.assert'
  },
  {
    pattern: /console\.clear\(/g,
    replacement: 'logger.clear(',
    description: 'console.clear -> logger.clear'
  }
]

// Files to exclude
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.test.{ts,tsx,js,jsx}',
  '**/*.spec.{ts,tsx,js,jsx}',
  '**/jest.setup.js',
  '**/jest.*.js',
  '**/scripts/**',
  '**/lib/logger.ts',
  '**/lib/logger/**'
]

/**
 * Calculate relative path depth from file to lib/logger
 */
function getRelativeLoggerPath(filePath) {
  const relativePath = path.relative(path.dirname(filePath), path.join(process.cwd(), 'lib/logger'))
  return relativePath.startsWith('.') ? relativePath : './' + relativePath
}

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content) {
  return content.includes("from '@/lib/logger'") || 
         content.includes("from '../lib/logger'") ||
         content.includes("from '../../lib/logger'") ||
         content.includes("from './lib/logger'")
}

/**
 * Add logger import to file
 */
function addLoggerImport(content, filePath) {
  if (hasLoggerImport(content)) {
    return content
  }

  const relativeLoggerPath = getRelativeLoggerPath(filePath)
  const importStatement = `import { logger } from '${relativeLoggerPath}'`

  // Find the best place to insert the import
  const lines = content.split('\n')
  let insertIndex = 0
  let lastImportIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('import ')) {
      lastImportIndex = i
    } else if (lastImportIndex !== -1 && !line.startsWith('import ')) {
      // Found the end of imports
      insertIndex = lastImportIndex + 1
      break
    }
  }

  if (insertIndex === 0 && lastImportIndex === -1) {
    // No imports found, add at the beginning
    lines.unshift(importStatement)
  } else {
    lines.splice(insertIndex, 0, importStatement)
  }

  return lines.join('\n')
}

/**
 * Process a single file
 */
async function processFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8')
    let modified = false
    const changes = []

    // Check if file contains any console statements
    const hasConsole = REPLACEMENTS.some(r => r.pattern.test(content))
    if (!hasConsole) {
      return { filePath, modified: false, changes: [] }
    }

    // Apply replacements
    for (const replacement of REPLACEMENTS) {
      const matches = content.match(replacement.pattern)
      if (matches && matches.length > 0) {
        content = content.replace(replacement.pattern, replacement.replacement)
        modified = true
        changes.push({
          description: replacement.description,
          count: matches.length
        })
      }
    }

    // Add logger import if needed
    if (modified) {
      content = addLoggerImport(content, filePath)
    }

    // Write back if modified
    if (modified) {
      await fs.writeFile(filePath, content, 'utf8')
    }

    return { filePath, modified, changes }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
    return { filePath, error: error.message }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting console.log replacement...\n')

  // Find all TypeScript and JavaScript files
  const patterns = ['**/*.{ts,tsx,js,jsx}']
  const files = []

  for (const pattern of patterns) {
    const matches = await glob(pattern, { 
      ignore: EXCLUDE_PATTERNS,
      cwd: process.cwd()
    })
    files.push(...matches)
  }

  console.log(`Found ${files.length} files to process\n`)

  // Process files
  const results = []
  for (const file of files) {
    const result = await processFile(file)
    results.push(result)
    
    if (result.modified) {
      console.log(`✅ ${file}`)
      result.changes.forEach(change => {
        console.log(`   - ${change.description} (${change.count} occurrences)`)
      })
    }
  }

  // Summary
  console.log('\n📊 Summary:')
  const modifiedFiles = results.filter(r => r.modified)
  const errorFiles = results.filter(r => r.error)
  
  console.log(`- Total files processed: ${results.length}`)
  console.log(`- Files modified: ${modifiedFiles.length}`)
  console.log(`- Files with errors: ${errorFiles.length}`)

  if (errorFiles.length > 0) {
    console.log('\n❌ Files with errors:')
    errorFiles.forEach(f => {
      console.log(`- ${f.filePath}: ${f.error}`)
    })
  }

  console.log('\n✨ Console replacement complete!')
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})