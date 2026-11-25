import type { DocumentSearchResult } from '../../types/rag.js'

export type LexicalDocument = {
  source: string
  fileName: string
}

export type LexicalDocumentChunk = {
  source: string
  text: string
  chunkIndex: number
  pageNumber?: number | null
}

const HASHED_UPLOAD_SUFFIX = /-[a-f0-9]{12}(?=\.[^.]+$)/i
const WORD = /[\p{L}\p{N}]+/gu

export function friendlyStoredDocumentName(fileName: string): string {
  const baseName = fileName.replace(HASHED_UPLOAD_SUFFIX, '').replace(/(?:\.[^.]+)+$/, '')

  const hesperian = /^en_(wtnd|midw|dent)_(\d{4})_([a-z0-9]+)$/i.exec(baseName)
  if (hesperian) {
    const series: Record<string, string> = {
      wtnd: 'Where There Is No Doctor',
      midw: 'A Book for Midwives',
      dent: 'Where There Is No Dentist',
    }
    const partLabels: Record<string, string> = {
      bm: 'Back matter',
      fm: 'Front matter',
      gloss: 'Glossary',
      indx: 'Index',
      info: 'About this book',
      int: 'Introduction',
      resc: 'Resources',
      toc: 'Table of contents',
    }
    const part = hesperian[3].toLocaleLowerCase()
    const partLabel =
      partLabels[part] ?? `Part ${/^\d+$/.test(part) ? Number(part) : part.toUpperCase()}`
    return `${series[hesperian[1].toLocaleLowerCase()]} (${hesperian[2]}) — ${partLabel}`
  }

  return baseName.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\s+/g, ' ').trim()
}

function terms(value: string): string[] {
  return (value.toLocaleLowerCase().match(WORD) ?? []).filter((term) => term.length > 1)
}

/**
 * Collapse only common English plural forms. This deliberately is not prefix
 * matching: an emergency search for `splint` may match `splints`, but must not
 * match `splinter` or `splinters`.
 */
function comparableTerm(term: string): string {
  if (term.length > 4 && term.endsWith('ies')) return `${term.slice(0, -3)}y`
  if (term.length > 4 && /(ches|shes|sses|xes|zes)$/.test(term)) return term.slice(0, -2)
  if (term.length > 3 && term.endsWith('s') && !term.endsWith('ss')) return term.slice(0, -1)
  return term
}

function comparableTerms(value: string): string[] {
  return terms(value).map(comparableTerm)
}

function includesAllTerms(haystack: string[], needles: string[]): boolean {
  const available = new Set(haystack)
  return needles.every((term) => available.has(term))
}

function includesPhrase(haystack: string[], phrase: string[]): boolean {
  if (phrase.length === 0 || phrase.length > haystack.length) return false
  return haystack.some((_, start) =>
    phrase.every((term, offset) => haystack[start + offset] === term)
  )
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
  const queryTerms = [...new Set(comparableTerms(query))].slice(0, 12)
  if (queryTerms.length === 0) return []

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
    const titleTerms = comparableTerms(title)
    if (!includesAllTerms(titleTerms, queryTerms)) continue
    const score = 80 + sourceWeight(title) + (includesPhrase(titleTerms, queryTerms) ? 35 : 0)
    best.set(document.source, {
      source: document.source,
      fileName: document.fileName,
      title,
      excerpt:
        'The saved document title matches this search. Open it to review the original source.',
      chunkIndex: null,
      pageNumber: null,
      score,
      matchKind: 'title',
    })
  }

  for (const chunk of chunks) {
    const entry = bySource.get(chunk.source)
    if (!entry) continue
    const textTerms = comparableTerms(chunk.text)
    if (!includesAllTerms(textTerms, queryTerms)) continue

    const titleTerms = comparableTerms(entry.title)
    const occurrenceScore = queryTerms.reduce((score, term) => {
      const occurrences = textTerms.filter((candidate) => candidate === term).length
      return score + Math.min(occurrences, 5) * 3
    }, 0)
    const titleScore = includesAllTerms(titleTerms, queryTerms) ? 45 : 0
    const score =
      100 +
      sourceWeight(entry.title) +
      occurrenceScore +
      titleScore +
      (includesPhrase(textTerms, queryTerms) ? 60 : 0)
    const candidate: DocumentSearchResult = {
      source: chunk.source,
      fileName: entry.document.fileName,
      title: entry.title,
      excerpt: excerptAround(chunk.text, queryTerms),
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber ?? null,
      score,
      matchKind: 'content',
    }
    if ((best.get(chunk.source)?.score ?? -1) < score) best.set(chunk.source, candidate)
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, Math.max(1, limit))
}
