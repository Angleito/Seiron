#!/usr/bin/env tsx

import { pipe } from 'fp-ts/function'
import * as E from 'fp-ts/Either'
import { auditMocks, generateCleanupScript } from '../services/MockAuditService' // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
import * as fs from 'fs/promises'
import * as path from 'path'

const main = async () => {
  console.log('🔍 Starting mock audit...\n') // TODO: REMOVE_MOCK - Mock-related keywords

  const pattern = process.argv[2] || '**/*.{ts,tsx}'
  const outputFile = process.argv[3] || 'mock-cleanup-checklist.md' // TODO: REMOVE_MOCK - Mock-related keywords

  const result = await auditMocks(pattern)() // TODO: REMOVE_MOCK - Mock-related keywords

  if (E.isLeft(result)) {
    console.error('❌ Audit failed:', result.left.message)
    process.exit(1)
  }

  const report = result.right
  
  console.log(`✅ Audit complete!\n`)
  console.log(`📊 Summary:`)
  console.log(`   Total files scanned: ${report.totalFiles}`)
  console.log(`   Files with mocks: ${report.filesWithMocks}`) // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  console.log(`   Total occurrences: ${report.occurrences.length}\n`)
  
  console.log(`📈 By Pattern:`)
  Object.entries(report.byPattern).forEach(([pattern, count]) => {
    console.log(`   ${pattern}: ${count}`)
  })
  
  console.log(`\n🚨 By Severity:`)
  Object.entries(report.bySeverity).forEach(([severity, count]) => {
    console.log(`   ${severity}: ${count}`)
  })

  const cleanupScript = generateCleanupScript(report)
  await fs.writeFile(outputFile, cleanupScript)
  
  console.log(`\n📄 Cleanup checklist written to: ${outputFile}`)
  console.log(`💡 All mock occurrences have been marked with TODO: REMOVE_MOCK comments`) // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
}

main().catch(console.error)