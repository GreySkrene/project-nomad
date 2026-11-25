export type LibraryReference = {
  kind: 'article' | 'document'
  title: string
  sourceTitle: string
  url: string
  touchedAt: string
}

export const SAVED_REFERENCES_KEY = 'nomad.library.saved.v1'
export const RECENT_REFERENCES_KEY = 'nomad.library.recent.v1'
export const LIBRARY_REFERENCES_EVENT = 'nomad-library-references'

const browser = globalThis as unknown as {
  localStorage: {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
  }
  dispatchEvent(event: Event): boolean
}

function safeInternalReaderUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value, 'http://nomad.local')
    if (url.origin !== 'http://nomad.local') return null
    if (!['/library/read', '/library/document'].includes(url.pathname)) return null
    return `${url.pathname}${url.search}`
  } catch {
    return null
  }
}

export function parseLibraryReferences(raw: string | null): LibraryReference[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((candidate): LibraryReference[] => {
      if (!candidate || typeof candidate !== 'object') return []
      const url = safeInternalReaderUrl(candidate.url)
      if (
        !url ||
        !['article', 'document'].includes(candidate.kind) ||
        typeof candidate.title !== 'string' ||
        typeof candidate.sourceTitle !== 'string' ||
        typeof candidate.touchedAt !== 'string'
      ) {
        return []
      }
      return [
        {
          kind: candidate.kind,
          title: candidate.title.slice(0, 300),
          sourceTitle: candidate.sourceTitle.slice(0, 300),
          url,
          touchedAt: candidate.touchedAt,
        },
      ]
    })
  } catch {
    return []
  }
}

export function upsertLibraryReference(
  references: LibraryReference[],
  reference: LibraryReference,
  limit: number
): LibraryReference[] {
  const safeUrl = safeInternalReaderUrl(reference.url)
  if (!safeUrl) return references
  const next = { ...reference, url: safeUrl }
  return [next, ...references.filter((item) => item.url !== safeUrl)].slice(0, limit)
}

function read(key: string): LibraryReference[] {
  try {
    return parseLibraryReferences(browser.localStorage.getItem(key))
  } catch {
    return []
  }
}

function write(key: string, references: LibraryReference[]) {
  try {
    browser.localStorage.setItem(key, JSON.stringify(references))
    browser.dispatchEvent(new Event(LIBRARY_REFERENCES_EVENT))
  } catch {
    // Restricted/private browser storage should not break the offline reader.
  }
}

export function loadSavedReferences(): LibraryReference[] {
  return read(SAVED_REFERENCES_KEY)
}

export function loadRecentReferences(): LibraryReference[] {
  return read(RECENT_REFERENCES_KEY)
}

export function recordRecentReference(reference: LibraryReference) {
  write(RECENT_REFERENCES_KEY, upsertLibraryReference(read(RECENT_REFERENCES_KEY), reference, 12))
}

export function isReferenceSaved(url: string): boolean {
  return read(SAVED_REFERENCES_KEY).some(
    (reference) => reference.url === safeInternalReaderUrl(url)
  )
}

export function toggleSavedReference(reference: LibraryReference): boolean {
  const current = read(SAVED_REFERENCES_KEY)
  const safeUrl = safeInternalReaderUrl(reference.url)
  if (!safeUrl) return false
  const alreadySaved = current.some((item) => item.url === safeUrl)
  write(
    SAVED_REFERENCES_KEY,
    alreadySaved
      ? current.filter((item) => item.url !== safeUrl)
      : upsertLibraryReference(current, reference, 50)
  )
  return !alreadySaved
}

export function removeSavedReference(url: string) {
  const safeUrl = safeInternalReaderUrl(url)
  if (!safeUrl) return
  write(
    SAVED_REFERENCES_KEY,
    read(SAVED_REFERENCES_KEY).filter((item) => item.url !== safeUrl)
  )
}
