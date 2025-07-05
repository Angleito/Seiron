import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as fs from 'fs/promises'
import * as path from 'path'
import glob from 'glob'

export interface MockPattern { // TODO: REMOVE_MOCK - Mock-related keywords
  pattern: RegExp
  description: string
  severity: 'high' | 'medium' | 'low'
}

export interface MockOccurrence { // TODO: REMOVE_MOCK - Mock-related keywords
  file: string
  line: number
  column: number
  code: string
  pattern: MockPattern // TODO: REMOVE_MOCK - Mock-related keywords
}

export interface AuditReport {
  totalFiles: number
  filesWithMocks: number // TODO: REMOVE_MOCK - Mock-related keywords
  occurrences: MockOccurrence[] // TODO: REMOVE_MOCK - Mock-related keywords
  byPattern: Record<string, number>
  bySeverity: Record<string, number>
}

const mockPatterns: MockPattern[] = [ // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  {
    pattern: /Math\.random\(\)/g,
    description: 'Random value generation',
    severity: 'high'
  },
  {
    pattern: /\[(["'])[^\1]*\1,\s*(["'])[^\2]*\2,\s*(["'])[^\3]*\3\]/g,
    description: 'Hard-coded array literals',
    severity: 'medium'
  },
  {
    pattern: /\$[\d,]+\.?\d*/g,
    description: 'Hard-coded currency values',
    severity: 'medium'
  },
  {
    pattern: /placeholder|dummy|fake|mock/gi, // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    description: 'Mock-related keywords', // TODO: REMOVE_MOCK - Mock-related keywords
    severity: 'low'
  },
  {
    pattern: /TODO:?\s*REMOVE_MOCK/g, // TODO: REMOVE_MOCK - Mock-related keywords
    description: 'Existing mock markers', // TODO: REMOVE_MOCK - Mock-related keywords
    severity: 'high'
  }
]

const findAllFiles = (pattern: string): TE.TaskEither<Error, string[]> =>
  TE.tryCatch(
    () => new Promise<string[]>((resolve, reject) => {
      glob(pattern, { ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'] }, (err, files) => { // TODO: REMOVE_MOCK - Hard-coded array literals
        if (err) reject(err)
        else resolve(files)
      })
    }),
    (error) => new Error(`Failed to find files: ${error}`)
  )

const readFile = (filePath: string): TE.TaskEither<Error, string> =>
  TE.tryCatch(
    () => fs.readFile(filePath, 'utf-8'),
    (error) => new Error(`Failed to read ${filePath}: ${error}`)
  )

const detectMockPatterns = (filePath: string, content: string): MockOccurrence[] => { // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  const lines = content.split('\n')
  const occurrences: MockOccurrence[] = [] // TODO: REMOVE_MOCK - Mock-related keywords

  lines.forEach((line, lineIndex) => {
    mockPatterns.forEach((mockPattern) => { // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      let match
      const regex = new RegExp(mockPattern.pattern) // TODO: REMOVE_MOCK - Mock-related keywords
      
      while ((match = regex.exec(line)) !== null) {
        occurrences.push({
          file: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          code: line.trim(),
          pattern: mockPattern // TODO: REMOVE_MOCK - Mock-related keywords
        })
      }
    })
  })

  return occurrences
}

const addTodoMarkers = (
  filePath: string,
  content: string,
  occurrences: MockOccurrence[] // TODO: REMOVE_MOCK - Mock-related keywords
): TE.TaskEither<Error, void> => {
  if (occurrences.length === 0) {
    return TE.right(undefined)
  }

  const lines = content.split('\n')
  const markedOccurrences = occurrences.filter(o => 
    !o.pattern.description.includes('Existing mock markers') // TODO: REMOVE_MOCK - Mock-related keywords
  )

  markedOccurrences
    .sort((a, b) => b.line - a.line)
    .forEach((occurrence) => {
      const lineIndex = occurrence.line - 1
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const indent = lines[lineIndex].match(/^\s*/)?.[0] || ''
        lines[lineIndex] = `${lines[lineIndex]} // TODO: REMOVE_MOCK - ${occurrence.pattern.description}` // TODO: REMOVE_MOCK - Mock-related keywords
      }
    })

  return TE.tryCatch(
    () => fs.writeFile(filePath, lines.join('\n')),
    (error) => new Error(`Failed to write ${filePath}: ${error}`)
  )
}

const processFile = (filePath: string): TE.TaskEither<Error, MockOccurrence[]> => // TODO: REMOVE_MOCK - Mock-related keywords
  pipe(
    readFile(filePath),
    TE.chain((content) => {
      const occurrences = detectMockPatterns(filePath, content) // TODO: REMOVE_MOCK - Mock-related keywords
      return pipe(
        addTodoMarkers(filePath, content, occurrences),
        TE.map(() => occurrences)
      )
    })
  )

const generateReport = (
  files: string[],
  allOccurrences: MockOccurrence[] // TODO: REMOVE_MOCK - Mock-related keywords
): AuditReport => {
  const filesWithMocks = new Set(allOccurrences.map(o => o.file)).size // TODO: REMOVE_MOCK - Mock-related keywords
  
  const byPattern = allOccurrences.reduce((acc, o) => {
    const key = o.pattern.description
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const bySeverity = allOccurrences.reduce((acc, o) => {
    acc[o.pattern.severity] = (acc[o.pattern.severity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    totalFiles: files.length,
    filesWithMocks, // TODO: REMOVE_MOCK - Mock-related keywords
    occurrences: allOccurrences,
    byPattern,
    bySeverity
  }
}

export const auditMocks = ( // TODO: REMOVE_MOCK - Mock-related keywords
  globPattern: string = '**/*.{ts,tsx}'
): TE.TaskEither<Error, AuditReport> =>
  pipe(
    findAllFiles(globPattern),
    TE.chain(files =>
      pipe(
        A.traverse(TE.ApplicativePar)(processFile)(files),
        TE.map(A.flatten),
        TE.map(occurrences => generateReport(files, occurrences))
      )
    )
  )

export const generateCleanupScript = (report: AuditReport): string => {
  const groupedByFile = report.occurrences.reduce((acc, o) => {
    if (!acc[o.file]) acc[o.file] = []
    acc[o.file].push(o)
    return acc
  }, {} as Record<string, MockOccurrence[]>) // TODO: REMOVE_MOCK - Mock-related keywords

  const script = Object.entries(groupedByFile)
    .map(([file, occurrences]) => {
      const items = occurrences.map(o => 
        `  - Line ${o.line}: ${o.pattern.description} (${o.pattern.severity})`
      ).join('\n')
      
      return `# ${path.relative(process.cwd(), file)}\n${items}`
    })
    .join('\n\n')

  return `# Mock Cleanup Checklist\n\nTotal files scanned: ${report.totalFiles}\nFiles with mocks: ${report.filesWithMocks}\n\n${script}` // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
}