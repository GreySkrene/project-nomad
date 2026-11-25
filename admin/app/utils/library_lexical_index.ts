import type { LexicalDocumentChunk } from './library_document_search.js'

export const LIBRARY_LEXICAL_INDEX_SCHEMA = 1
export const LIBRARY_LEXICAL_INDEX_PATH = 'storage/library_lexical_index.json'

export type LibraryLexicalIndexDocument = {
  source: string
  fileName: string
  size: number | null
  uploadedAt: string | null
  chunks: LexicalDocumentChunk[]
}

export type LibraryLexicalIndex = {
  schemaVersion: 1
  generatedAt: string
  documents: LibraryLexicalIndexDocument[]
}

export type AllowedLexicalDocument = {
  source: string
  fileName: string
  size: number | null
  uploadedAt: string | null
}

const MAX_DOCUMENTS = 2_000
const MAX_CHUNKS = 150_000
const MAX_CHUNK_CHARACTERS = 100_000
const MAX_TOTAL_CHARACTERS = 80_000_000

/**
 * Validate a disk-built lexical index against NOMAD's current managed-file
 * inventory. Paths from the JSON are never trusted on their own: stale,
 * replaced, or outside-inventory sources are ignored.
 */
export function validateLibraryLexicalIndex(
  value: unknown,
  allowedDocuments: AllowedLexicalDocument[]
): { chunks: LexicalDocumentChunk[]; sources: Set<string> } {
  if (!value || typeof value !== 'object') throw new Error('Lexical index must be an object')
  const index = value as Partial<LibraryLexicalIndex>
  if (index.schemaVersion !== LIBRARY_LEXICAL_INDEX_SCHEMA || !Array.isArray(index.documents)) {
    throw new Error('Unsupported lexical index schema')
  }
  if (index.documents.length > MAX_DOCUMENTS)
    throw new Error('Lexical index has too many documents')

  const allowed = new Map(allowedDocuments.map((document) => [document.source, document]))
  const chunks: LexicalDocumentChunk[] = []
  const sources = new Set<string>()
  let totalCharacters = 0

  for (const document of index.documents) {
    if (!document || typeof document !== 'object') continue
    const current = allowed.get(document.source)
    if (!current || !Array.isArray(document.chunks)) continue
    if (document.size !== current.size || document.uploadedAt !== current.uploadedAt) continue

    for (const chunk of document.chunks) {
      if (!chunk || typeof chunk !== 'object') continue
      if (typeof chunk.text !== 'string' || !chunk.text.trim()) continue
      if (!Number.isInteger(chunk.chunkIndex) || chunk.chunkIndex < 0) continue
      if (chunk.source !== document.source || chunk.text.length > MAX_CHUNK_CHARACTERS) continue
      const pageNumber =
        Number.isInteger(chunk.pageNumber) && Number(chunk.pageNumber) > 0
          ? Number(chunk.pageNumber)
          : null
      totalCharacters += chunk.text.length
      if (chunks.length >= MAX_CHUNKS || totalCharacters > MAX_TOTAL_CHARACTERS) {
        throw new Error('Lexical index exceeds safety limits')
      }
      chunks.push({
        source: document.source,
        text: chunk.text,
        chunkIndex: chunk.chunkIndex,
        pageNumber,
      })
      sources.add(document.source)
    }
  }

  return { chunks, sources }
}
