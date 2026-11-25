import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { PDFParse } from 'pdf-parse'

import {
  LIBRARY_LEXICAL_INDEX_PATH,
  LIBRARY_LEXICAL_INDEX_SCHEMA,
  type LibraryLexicalIndex,
  type LibraryLexicalIndexDocument,
} from '../app/utils/library_lexical_index.js'
import type { StoredFileInfo } from '../types/rag.js'

const baseUrl =
  process.argv
    .find((argument) => argument.startsWith('--base-url='))
    ?.slice('--base-url='.length) ?? 'http://127.0.0.1:8080'
const outputPath = join(process.cwd(), LIBRARY_LEXICAL_INDEX_PATH)

function textChunks(source: string, text: string, maxCharacters = 12_000) {
  const compact = text.replaceAll('\0', '').trim()
  const chunks = []
  for (let start = 0; start < compact.length; start += maxCharacters) {
    const value = compact.slice(start, start + maxCharacters).trim()
    if (value) {
      chunks.push({ source, text: value, chunkIndex: chunks.length, pageNumber: null })
    }
  }
  return chunks
}

async function extractDocument(file: StoredFileInfo): Promise<LibraryLexicalIndexDocument> {
  const extension = extname(file.source).toLowerCase()
  if (extension === '.pdf') {
    const parser = new PDFParse({ data: await readFile(file.source) })
    try {
      const result = await parser.getText()
      return {
        source: file.source,
        fileName: file.fileName,
        size: file.size,
        uploadedAt: file.uploadedAt,
        chunks: result.pages
          .filter((page) => page.text.trim())
          .map((page, index) => ({
            source: file.source,
            text: page.text.replaceAll('\0', '').trim(),
            chunkIndex: index,
            pageNumber: page.num,
          })),
      }
    } finally {
      await parser.destroy()
    }
  }

  const text = await readFile(file.source, 'utf-8')
  return {
    source: file.source,
    fileName: file.fileName,
    size: file.size,
    uploadedAt: file.uploadedAt,
    chunks: textChunks(file.source, text),
  }
}

async function save(documents: LibraryLexicalIndexDocument[]) {
  const index: LibraryLexicalIndex = {
    schemaVersion: LIBRARY_LEXICAL_INDEX_SCHEMA,
    generatedAt: new Date().toISOString(),
    documents,
  }
  await mkdir(dirname(outputPath), { recursive: true })
  const temporaryPath = `${outputPath}.tmp`
  await writeFile(temporaryPath, JSON.stringify(index))
  await rename(temporaryPath, outputPath)
}

async function main() {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/rag/files`)
  if (!response.ok) throw new Error(`Stored-file inventory returned HTTP ${response.status}`)
  const payload = (await response.json()) as { files?: StoredFileInfo[] }
  const files = (payload.files ?? [])
    .filter(
      (file) =>
        file.isUserUpload &&
        file.state === 'pending_decision' &&
        ['.pdf', '.md', '.markdown', '.txt'].includes(extname(file.source).toLowerCase())
    )
    .sort((a, b) => a.source.localeCompare(b.source))

  let existing: LibraryLexicalIndexDocument[] = []
  try {
    const parsed = JSON.parse(await readFile(outputPath, 'utf-8')) as Partial<LibraryLexicalIndex>
    if (parsed.schemaVersion === LIBRARY_LEXICAL_INDEX_SCHEMA && Array.isArray(parsed.documents)) {
      existing = parsed.documents
    }
  } catch {}

  const currentSources = new Set(files.map((file) => file.source))
  const bySource = new Map(
    existing
      .filter((document) => currentSources.has(document.source))
      .map((document) => [document.source, document])
  )
  let completedSinceCheckpoint = 0
  const failures: Array<{ source: string; error: string }> = []

  for (const [index, file] of files.entries()) {
    const cached = bySource.get(file.source)
    if (cached?.size === file.size && cached.uploadedAt === file.uploadedAt) {
      console.log(
        `[${index + 1}/${files.length}] cached ${file.fileName}${cached.chunks.length === 0 ? ' (no extractable text; title search only)' : ''}`
      )
      continue
    }
    try {
      console.log(`[${index + 1}/${files.length}] extracting ${file.fileName}`)
      const document = await extractDocument(file)
      bySource.set(file.source, document)
      completedSinceCheckpoint += 1
      console.log(`  ${document.chunks.length} searchable page/chunk records`)
      if (document.chunks.length === 0) {
        console.warn('  no extractable text; the document remains available to title search')
      }
      if (completedSinceCheckpoint >= 5) {
        await save(files.flatMap((candidate) => bySource.get(candidate.source) ?? []))
        completedSinceCheckpoint = 0
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push({ source: file.source, error: message })
      console.error(`  failed: ${message}`)
    }
  }

  const documents = files.flatMap((file) => bySource.get(file.source) ?? [])
  await save(documents)
  const chunks = documents.reduce((total, document) => total + document.chunks.length, 0)
  const titleOnly = documents.filter((document) => document.chunks.length === 0)
  console.log(
    `Wrote ${documents.length}/${files.length} documents and ${chunks} page/chunk records to ${outputPath}`
  )
  if (titleOnly.length) {
    console.warn(
      `Title-search only (${titleOnly.length}): ${titleOnly.map((document) => document.fileName).join(', ')}`
    )
  }
  if (failures.length) {
    console.error(JSON.stringify({ failures }, null, 2))
    process.exitCode = 1
  }
}

await main()
