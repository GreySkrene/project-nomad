import type { DocumentSearchResult } from '../../types/rag.js'

export type LexicalDocument = {
  source: string
  fileName: string
}

export type LexicalDocumentChunk = {
  source: string
  text: string
  chunkIndex: number
}

const HASHED_UPLOAD_SUFFIX = /-[a-f0-9]{12}(?=\.[^.]+$)/i
const WORD = /[\p{L}\p{N}]+/gu

export function friendlyStoredDocumentName(fileName: string): string {
  return fileName
    .replace(HASHED_UPLOAD_SUFFIX, '')
    .replace(/(?:\.[^.]+)+$/, '')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function terms(value: string): string[] {
  return (value.toLocaleLowerCase().match(WORD) ?? []).filter((term) => term.length > 1)
}

function sourceWeight(title: string): number {
  if (/^index$/i.test(title)) return -60
  if (
    /^(aha|cdc|cpsc|epa|fema|noaa|nws|usda|usfa|usgs|ugs|who)\b/i.test(title) ||
    /\b(official|state hazard mitigation plan)\b/i.test(title)
  ) {
    return 15
  }
  return 0
}

function excerptAround(text: string, queryTerms: string[], maxLength = 320): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= maxLength) return compact

  const lower = compact.toLocaleLowerCase()
  const positions = queryTerms
    .map((term) => lower.indexOf(term))
    .filter((position) => position >= 0)
  const first = positions.length ? Math.min(...positions) : 0
  const start = Math.max(0, first - Math.floor(maxLength * 0.3))
  const end = Math.min(compact.length, start + maxLength)
  return `${start > 0 ? '…' : ''}${compact.slice(start, end).trim()}${end < compact.length ? '…' : ''}`
}

/**
 * Rank stored manuals without an embedding model. Results use AND semantics for
 * multi-word queries so a broad emergency library does not bury an exact guide.
 * Only the best matching chunk from each source is returned.
 */
export function rankStoredDocuments(
  query: string,
  documents: LexicalDocument[],
  chunks: LexicalDocumentChunk[],
  limit = 12
): DocumentSearchResult[] {
  const queryTerms = [...new Set(terms(query))].slice(0, 12)
  if (queryTerms.length === 0) return []
  const phrase = queryTerms.join(' ')

  const bySource = new Map(
    documents.map((document) => [
      document.source,
      {
        document,
        title: friendlyStoredDocumentName(document.fileName),
      },
    ])
  )
  const best = new Map<string, DocumentSearchResult>()

  for (const { document, title } of bySource.values()) {
    const titleText = title.toLocaleLowerCase()
    if (!queryTerms.every((term) => titleText.includes(term))) continue
    const score = 80 + sourceWeight(title) + (titleText.includes(phrase) ? 35 : 0)
    best.set(document.source, {
      source: document.source,
      fileName: document.fileName,
      title,
      excerpt:
        'The saved document title matches this search. Open it to review the original source.',
      chunkIndex: null,
      score,
      matchKind: 'title',
    })
  }

  for (const chunk of chunks) {
    const entry = bySource.get(chunk.source)
    if (!entry) continue
    const text = chunk.text.toLocaleLowerCase()
    if (!queryTerms.every((term) => text.includes(term))) continue

    const titleText = entry.title.toLocaleLowerCase()
    const occurrenceScore = queryTerms.reduce((score, term) => {
      const occurrences = text.split(term).length - 1
      return score + Math.min(occurrences, 5) * 3
    }, 0)
    const titleScore = queryTerms.every((term) => titleText.includes(term)) ? 45 : 0
    const score =
      100 +
      sourceWeight(entry.title) +
      occurrenceScore +
      titleScore +
      (text.includes(phrase) ? 60 : 0)
    const candidate: DocumentSearchResult = {
      source: chunk.source,
      fileName: entry.document.fileName,
      title: entry.title,
      excerpt: excerptAround(chunk.text, queryTerms),
      chunkIndex: chunk.chunkIndex,
      score,
      matchKind: 'content',
    }
    if ((best.get(chunk.source)?.score ?? -1) < score) best.set(chunk.source, candidate)
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, Math.max(1, limit))
}
