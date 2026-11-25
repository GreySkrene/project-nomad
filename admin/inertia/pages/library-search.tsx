import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  IconBook2,
  IconBooks,
  IconBookmark,
  IconClockExclamation,
  IconClock,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconFileText,
  IconPhoto,
  IconSearch,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react'

import AppLayout from '~/layouts/AppLayout'
import api from '~/lib/api'
import {
  browseProfile,
  displayTitle,
  formatBytes,
  groupDocumentsForBrowse,
  LIBRARY_CATEGORIES,
  readerDetails,
  type LibraryCategory,
} from '~/lib/library_browse_catalog'
import { libraryDocumentUrl, libraryReaderUrl, sourceName } from '~/lib/library_reader'
import { getServiceLink } from '~/lib/navigation'
import { selectDiverseTitleSuggestions } from '~/lib/library_search_rank'
import {
  LIBRARY_REFERENCES_EVENT,
  loadRecentReferences,
  loadSavedReferences,
  removeSavedReference,
  type LibraryReference,
} from '~/lib/library_references'
import type { DocumentSearchResult, StoredFileInfo } from '../../types/rag'
import type { ServiceSlim } from '../../types/services'
import type { ZimFileWithMetadata } from '../../types/zim'

type KiwixSuggestion = {
  value: string
  label: string
  kind: 'path' | 'pattern'
  path?: string
  source: string
  sourceTitle: string
}

type ViewMode = 'browse' | 'search'

function friendlyDocumentName(fileName: string) {
  return fileName
    .replace(/-[a-f0-9]{12}(?=\.[^.]+$)/i, '')
    .replace(/(?:\.[^.]+)+$/, '')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
}

export default function LibrarySearch({ kiwixService }: { kiwixService: ServiceSlim | null }) {
  const [view, setView] = useState<ViewMode>('browse')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [libraries, setLibraries] = useState<ZimFileWithMetadata[]>([])
  const [documents, setDocuments] = useState<StoredFileInfo[]>([])
  const [category, setCategory] = useState<'All' | LibraryCategory>('All')
  const [browseFilter, setBrowseFilter] = useState('')
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [suggestions, setSuggestions] = useState<KiwixSuggestion[]>([])
  const [documentResults, setDocumentResults] = useState<DocumentSearchResult[]>([])
  const [documentSearchNote, setDocumentSearchNote] = useState('')
  const [savedReferences, setSavedReferences] = useState<LibraryReference[]>([])
  const [recentReferences, setRecentReferences] = useState<LibraryReference[]>([])
  const [showAllSaved, setShowAllSaved] = useState(false)
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [correctedFrom, setCorrectedFrom] = useState<string | null>(null)
  const [status, setStatus] = useState(
    'Searches article titles and indexed passages from saved documents.'
  )
  const [loading, setLoading] = useState(false)
  const searchInput = useRef<HTMLInputElement>(null)
  const searchRequest = useRef(0)

  const kiwixBase = useMemo(
    () =>
      kiwixService ? getServiceLink(kiwixService.ui_location || '', kiwixService.custom_url) : '',
    [kiwixService]
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'search') setView('search')
    const initialQuery = params.get('q')?.trim()
    const initialSource = params.get('source')?.trim()
    if (initialQuery) setQuery(initialQuery.slice(0, 120))
    if (initialSource) setSource(initialSource)

    api.listZimFiles().then((response) => {
      const ordered = [...response.data.files].sort((a, b) => {
        const aProfile = browseProfile(a)
        const bProfile = browseProfile(b)
        return (
          aProfile.priority - bProfile.priority || displayTitle(a).localeCompare(displayTitle(b))
        )
      })
      setLibraries(ordered)
    })

    api.getStoredRAGFiles().then((files) => setDocuments(files || []))
  }, [])

  useEffect(() => {
    const refresh = () => {
      setSavedReferences(loadSavedReferences())
      setRecentReferences(loadRecentReferences())
    }
    refresh()
    window.addEventListener(LIBRARY_REFERENCES_EVENT, refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener(LIBRARY_REFERENCES_EVENT, refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const visibleLibraries = useMemo(() => {
    const needle = browseFilter.trim().toLowerCase()
    return libraries.filter((file) => {
      const profile = browseProfile(file)
      if (category !== 'All' && profile.category !== category) return false
      if (!needle) return true
      return [
        displayTitle(file),
        profile.description,
        profile.category,
        profile.role ?? '',
        ...profile.topics,
        ...profile.commonSearches,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [browseFilter, category, libraries])

  const documentCollections = useMemo(() => groupDocumentsForBrowse(documents), [documents])

  async function lookupTitles(term: string, selectedSource = source) {
    const trimmed = term.trim()
    const requestId = ++searchRequest.current
    if (!trimmed || !kiwixBase || !selectedSource) {
      setSuggestions([])
      return []
    }

    async function fromLibrary(file: ZimFileWithMetadata) {
      const librarySource = sourceName(file.name)
      const url = new URL('/suggest', kiwixBase)
      url.searchParams.set('content', librarySource)
      url.searchParams.set('term', trimmed)
      url.searchParams.set('count', selectedSource === 'all' ? '8' : '12')
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Kiwix title search returned ${response.status}`)
      const results = (await response.json()) as Array<
        Omit<KiwixSuggestion, 'source' | 'sourceTitle'>
      >
      return results
        .filter((result) => result.kind === 'path' && result.path)
        .map((result) => ({
          ...result,
          source: librarySource,
          sourceTitle: displayTitle(file),
        }))
    }

    const selectedLibraries =
      selectedSource === 'all'
        ? libraries
        : libraries.filter((file) => sourceName(file.name) === selectedSource)
    const settled = await Promise.allSettled(selectedLibraries.map(fromLibrary))
    const successful = settled.filter((result) => result.status === 'fulfilled')
    if (successful.length === 0 && selectedLibraries.length > 0) {
      throw new Error('Every Kiwix title search failed')
    }
    const combined = successful.flatMap((result) => result.value)
    const seen = new Set<string>()
    const unique = combined.filter((result) => {
      const key = `${result.source}\0${result.value.toLocaleLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    const paths = selectDiverseTitleSuggestions(trimmed, unique)
    if (requestId === searchRequest.current) setSuggestions(paths)
    return paths
  }

  async function lookupDocuments(term: string, selectedSource = source) {
    const trimmed = term.trim()
    if (!trimmed || !['all', 'documents'].includes(selectedSource)) {
      setDocumentResults([])
      setDocumentSearchNote('')
      return []
    }
    const response = await api.searchStoredDocuments(trimmed, 12)
    const results = response?.results ?? []
    setDocumentResults(results)
    setDocumentSearchNote(
      response?.partial
        ? 'Document text search is partially unavailable; filename matches are still shown.'
        : response
          ? `Searched text from ${response.indexedDocuments} indexed saved document${response.indexedDocuments === 1 ? '' : 's'} without an AI model.`
          : 'Saved-document search is temporarily unavailable.'
    )
    return results
  }

  useEffect(() => {
    searchRequest.current += 1
    if (view !== 'search' || !query.trim() || !source || source === 'documents') {
      setSuggestions([])
      return
    }
    const timer = window.setTimeout(() => {
      lookupTitles(query).catch(() => setStatus('Title suggestions are temporarily unavailable.'))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [query, source, kiwixBase, view, libraries])

  function openArticle(result: KiwixSuggestion) {
    if (result.path) {
      window.location.href = libraryReaderUrl({
        source: result.source,
        path: result.path,
        title: result.value,
        sourceTitle: result.sourceTitle,
      })
    }
  }

  function openFullText(term = query, selectedSource = source) {
    if (!term.trim()) return
    const selectedFile = libraries.find((file) => sourceName(file.name) === selectedSource)
    window.location.href = libraryReaderUrl({
      source: selectedSource,
      sourceTitle: selectedFile ? displayTitle(selectedFile) : 'All installed article libraries',
      mode: 'search',
      query: term.trim(),
    })
  }

  function startSearch(term: string, selectedSource: string) {
    setSource(selectedSource)
    setQuery(term)
    setView('search')
    setCorrectedFrom(null)
    window.setTimeout(() => searchInput.current?.focus(), 0)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const original = query.trim()
    if (!original || !kiwixBase) return
    setLoading(true)
    setCorrectedFrom(null)
    try {
      const [titleResults, savedResults] = await Promise.all([
        source === 'documents' ? Promise.resolve([]) : lookupTitles(original),
        lookupDocuments(original),
      ])
      const exact = titleResults.find(
        (result) => result.value.toLowerCase() === original.toLowerCase()
      )
      if (exact && source !== 'all') return openArticle(exact)

      const response = await fetch(`/api/library-search/spelling?q=${encodeURIComponent(original)}`)
      const spelling = (await response.json()) as { suggestion: string | null }
      if (spelling.suggestion) {
        setCorrectedFrom(original)
        setQuery(spelling.suggestion)
        const [correctedResults, correctedSavedResults] = await Promise.all([
          source === 'documents' ? Promise.resolve([]) : lookupTitles(spelling.suggestion),
          lookupDocuments(spelling.suggestion),
        ])
        const totalResults = correctedResults.length + correctedSavedResults.length
        setStatus(
          totalResults
            ? `Showing offline matches for “${spelling.suggestion}”.`
            : `No indexed offline match for “${spelling.suggestion}”.`
        )
      } else if (titleResults.length || savedResults.length) {
        setStatus('Choose an article or saved original document below.')
      } else {
        setStatus('No indexed match was found. Kiwix full-text search may still help.')
      }
    } catch {
      setStatus(
        'Search could not reach one of the local library services. Check that NOMAD is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  function toggleCollection(name: string) {
    setExpandedCollections((current) => {
      const next = new Set(current)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  if (!kiwixService) {
    return (
      <AppLayout>
        <Head title="Offline Library" />
        <div className="mx-auto max-w-4xl p-6 text-text-primary">
          <h1 className="text-3xl font-semibold">Offline Library</h1>
          <p className="mt-4 text-text-secondary">
            The Kiwix Information Library is not installed.
          </p>
          <Link href="/home" className="mt-6 inline-block text-desert-green underline">
            Back to Command Center
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Head title="Offline Library" />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 text-text-primary">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-desert-green">
              <IconBook2 size={17} /> Offline reference library
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Explore your information library</h1>
            <p className="mt-2 max-w-3xl text-text-secondary">
              Browse by need, learn what each collection covers, or search the original offline
              sources directly.
            </p>
          </div>
          <a
            href={kiwixBase}
            className="inline-flex items-center gap-2 rounded border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-surface-secondary"
          >
            Kiwix shelf <IconExternalLink size={16} />
          </a>
        </div>

        <div
          className="mb-7 inline-flex rounded-lg border border-border-default bg-surface-secondary p-1"
          role="tablist"
          aria-label="Library view"
        >
          {(['browse', 'search'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={view === mode}
              onClick={() => setView(mode)}
              className={`inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold ${view === mode ? 'bg-surface-primary text-text-primary shadow-sm' : 'text-text-secondary'}`}
            >
              {mode === 'browse' ? <IconBooks size={18} /> : <IconSearch size={18} />}
              {mode === 'browse' ? 'Browse' : 'Search'}
            </button>
          ))}
        </div>

        <aside className="mb-7 flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <IconClockExclamation className="mt-0.5 shrink-0 text-amber-500" size={20} />
          <p className="leading-6 text-text-secondary">
            <strong className="text-text-primary">Stored offline snapshots:</strong> use these for
            preparedness and background. Current road closures, evacuation orders, fires, weather,
            outbreaks, recalls, and contamination notices still require live verification.
          </p>
        </aside>

        {view === 'browse' && (
          <section className="mb-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border-default bg-surface-primary p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <IconBookmark size={20} className="text-desert-green" /> Saved references
                </h2>
                <span className="text-xs text-text-muted">{savedReferences.length} saved</span>
              </div>
              {savedReferences.length ? (
                <ul className="mt-4 space-y-2">
                  {(showAllSaved ? savedReferences : savedReferences.slice(0, 6)).map(
                    (reference) => (
                      <li
                        key={reference.url}
                        className="flex items-center gap-2 rounded-lg bg-surface-secondary p-3"
                      >
                        <a href={reference.url} className="min-w-0 flex-1 hover:text-desert-green">
                          <span className="block truncate text-sm font-semibold">
                            {reference.title}
                          </span>
                          <span className="block truncate text-xs text-text-muted">
                            {reference.sourceTitle}
                          </span>
                        </a>
                        <button
                          type="button"
                          onClick={() => removeSavedReference(reference.url)}
                          className="rounded p-2 text-text-muted hover:bg-surface-tertiary hover:text-red-500"
                          aria-label={`Remove ${reference.title} from saved references`}
                        >
                          <IconTrash size={16} />
                        </button>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="mt-4 text-sm leading-6 text-text-secondary">
                  Open an article or manual and choose Save reference for one-click offline access.
                </p>
              )}
              {savedReferences.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllSaved((current) => !current)}
                  className="mt-3 text-sm font-semibold text-desert-green underline"
                >
                  {showAllSaved
                    ? 'Show fewer saved references'
                    : `Show all ${savedReferences.length}`}
                </button>
              )}
            </div>

            <div className="rounded-xl border border-border-default bg-surface-primary p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <IconClock size={20} className="text-desert-green" /> Recently opened
                </h2>
                <span className="text-xs text-text-muted">Stored on this device</span>
              </div>
              {recentReferences.length ? (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(showAllRecent ? recentReferences : recentReferences.slice(0, 6)).map(
                    (reference) => (
                      <li key={reference.url}>
                        <a
                          href={reference.url}
                          className="block rounded-lg bg-surface-secondary p-3 hover:bg-surface-tertiary hover:text-desert-green"
                        >
                          <span className="block truncate text-sm font-semibold">
                            {reference.title}
                          </span>
                          <span className="block truncate text-xs text-text-muted">
                            {reference.sourceTitle}
                          </span>
                        </a>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="mt-4 text-sm leading-6 text-text-secondary">
                  Articles and manuals you open will appear here automatically.
                </p>
              )}
              {recentReferences.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllRecent((current) => !current)}
                  className="mt-3 text-sm font-semibold text-desert-green underline"
                >
                  {showAllRecent
                    ? 'Show fewer recent references'
                    : `Show all ${recentReferences.length}`}
                </button>
              )}
            </div>
          </section>
        )}

        {view === 'search' ? (
          <section className="rounded-xl border border-border-default bg-surface-primary p-5 shadow-sm sm:p-7">
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-medium" htmlFor="library-source">
                Search within
              </label>
              <select
                id="library-source"
                value={source}
                onChange={(event) => {
                  setSource(event.target.value)
                  setCorrectedFrom(null)
                  setDocumentResults([])
                  setDocumentSearchNote('')
                }}
                className="w-full rounded-lg border border-border-default bg-surface-secondary px-4 py-3 text-text-primary focus:border-desert-green focus:outline-none"
              >
                <option value="all">All offline articles and saved documents</option>
                <option value="documents">Saved documents & manuals</option>
                {libraries.map((file) => (
                  <option key={file.name} value={sourceName(file.name)}>
                    {displayTitle(file)}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium" htmlFor="library-query">
                Article or topic
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <IconSearch
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                    size={22}
                  />
                  <input
                    ref={searchInput}
                    id="library-query"
                    spellCheck
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setCorrectedFrom(null)
                      setDocumentResults([])
                      setDocumentSearchNote('')
                    }}
                    placeholder="Try cloud, cumulonimbus, earthquake…"
                    className="w-full rounded-lg border border-border-default bg-surface-secondary py-3 pl-12 pr-4 text-lg text-text-primary placeholder:text-text-muted focus:border-desert-green focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-desert-green px-5 py-3 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconSparkles size={19} /> {loading ? 'Checking…' : 'Find article'}
                </button>
              </div>
            </form>

            {correctedFrom && (
              <div className="mt-5 rounded-lg border border-desert-green/40 bg-desert-green/10 px-4 py-3">
                <strong>Spelling corrected:</strong> “{correctedFrom}” → “{query}”.{' '}
                {source !== 'documents' && (
                  <button
                    type="button"
                    onClick={() => openFullText(correctedFrom)}
                    className="underline"
                  >
                    Search the original article text instead
                  </button>
                )}
              </div>
            )}
            <p className="mt-5 text-sm text-text-secondary" aria-live="polite">
              {status}
            </p>
            {suggestions.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {suggestions.map((result) => (
                  <button
                    key={`${result.source}-${result.path}-${result.value}`}
                    type="button"
                    onClick={() => openArticle(result)}
                    className="rounded-lg border border-border-default bg-surface-secondary px-4 py-3 text-left hover:border-desert-green hover:bg-surface-tertiary"
                  >
                    <span className="font-medium">{result.value}</span>
                    <span className="mt-1 block text-xs text-text-muted">
                      {result.sourceTitle} · Open article
                    </span>
                  </button>
                ))}
              </div>
            )}
            {documentResults.length > 0 && (
              <section className="mt-6 border-t border-border-default pt-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                  Saved documents & manuals
                </h2>
                <div className="mt-3 grid gap-3">
                  {documentResults.map((result) => (
                    <a
                      key={result.source}
                      href={libraryDocumentUrl(result.source, result.title, query)}
                      className="rounded-lg border border-border-default bg-surface-secondary px-4 py-3 hover:border-desert-green hover:bg-surface-tertiary"
                    >
                      <span className="font-semibold">{result.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-text-secondary">
                        {result.excerpt}
                      </span>
                      <span className="mt-2 block text-xs font-medium text-desert-green">
                        {result.matchKind === 'content'
                          ? 'Matching passage in indexed original'
                          : 'Matching document title'}{' '}
                        · Open saved source
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}
            {documentSearchNote && (
              <p className="mt-3 text-xs text-text-muted">{documentSearchNote}</p>
            )}
            {source !== 'documents' && (
              <div className="mt-6 border-t border-border-default pt-5">
                <button
                  type="button"
                  disabled={!query.trim()}
                  onClick={() => openFullText()}
                  className="inline-flex items-center gap-2 text-sm font-medium text-desert-green underline disabled:opacity-40"
                >
                  <IconSearch size={17} /> Search for “{query || '…'}” inside article text
                </button>
                <p className="mt-2 text-xs text-text-muted">
                  Full-text results are broader and may rank a different meaning of the same word
                  first.
                </p>
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-10">
            <section>
              <div className="mb-5 rounded-xl border border-border-default bg-surface-primary p-5 shadow-sm">
                <label htmlFor="browse-filter" className="text-sm font-semibold">
                  What do you want to learn or do?
                </label>
                <div className="relative mt-2">
                  <IconSearch
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                    size={20}
                  />
                  <input
                    id="browse-filter"
                    value={browseFilter}
                    onChange={(event) => setBrowseFilter(event.target.value)}
                    placeholder="Try first aid, plumbing, food storage, plants…"
                    className="w-full rounded-lg border border-border-default bg-surface-secondary py-3 pl-11 pr-4 text-text-primary placeholder:text-text-muted focus:border-desert-green focus:outline-none"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {LIBRARY_CATEGORIES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${category === item ? 'border-desert-green bg-desert-green/10 text-desert-green' : 'border-border-default text-text-secondary'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Article libraries</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Searchable collections with offline articles, guides, and visual references.
                  </p>
                </div>
                <span className="text-sm text-text-muted">{visibleLibraries.length} shown</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleLibraries.map((file) => {
                  const profile = browseProfile(file)
                  const reader = readerDetails(file)
                  const sourceId = sourceName(file.name)
                  const browseHref = reader.entryPath
                    ? libraryReaderUrl({
                        source: sourceId,
                        path: reader.entryPath,
                        title: displayTitle(file),
                        sourceTitle: displayTitle(file),
                      })
                    : libraryReaderUrl({
                        source: sourceId,
                        title: displayTitle(file),
                        sourceTitle: displayTitle(file),
                      })
                  return (
                    <article
                      key={file.name}
                      className="flex min-h-[340px] flex-col overflow-hidden rounded-xl border border-border-default bg-surface-primary shadow-sm"
                    >
                      <div className="flex items-start gap-4 border-b border-border-default bg-surface-secondary p-5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-default bg-surface-primary">
                          {file.cover_data_url ? (
                            <img
                              src={file.cover_data_url}
                              alt=""
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <IconBook2 size={30} className="text-desert-green" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold uppercase tracking-wide text-desert-green">
                            {profile.category}
                          </span>
                          {profile.role && (
                            <span
                              className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                profile.role === 'Emergency core'
                                  ? 'border-desert-green/50 bg-desert-green/10 text-desert-green'
                                  : profile.role === 'Supplemental'
                                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-600'
                                    : 'border-border-default bg-surface-primary text-text-muted'
                              }`}
                            >
                              {profile.role}
                            </span>
                          )}
                          <h3 className="mt-1 text-lg font-semibold leading-tight">
                            {displayTitle(file)}
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                            <span>{formatBytes(file.size_bytes)}</span>
                            {file.article_count !== null && (
                              <span>{file.article_count.toLocaleString()} articles</span>
                            )}
                            {(file.media_count ?? 0) > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <IconPhoto size={13} /> Includes media
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-sm leading-6 text-text-secondary">
                          {profile.description}
                        </p>
                        <dl className="mt-4 grid gap-2 rounded-lg border border-border-default bg-surface-secondary p-3 text-xs sm:grid-cols-2">
                          <div>
                            <dt className="font-semibold uppercase tracking-wide text-text-muted">
                              Reader format
                            </dt>
                            <dd className="mt-1 text-text-secondary">{reader.format}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold uppercase tracking-wide text-text-muted">
                              Visual coverage
                            </dt>
                            <dd className="mt-1 text-text-secondary">{reader.visualCoverage}</dd>
                          </div>
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {profile.topics.map((topic) => (
                            <span
                              key={topic}
                              className="rounded bg-surface-secondary px-2 py-1 text-xs text-text-secondary"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                        {profile.formatNote && (
                          <p className="mt-3 text-xs italic text-text-muted">
                            {profile.formatNote}
                          </p>
                        )}
                        {profile.commonSearches.length > 0 && (
                          <div className="mt-5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                              Common searches
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {profile.commonSearches.map((term) => (
                                <button
                                  key={term}
                                  type="button"
                                  onClick={() => startSearch(term, sourceId)}
                                  className="rounded-full border border-border-default px-2.5 py-1 text-xs text-text-secondary hover:border-desert-green hover:text-desert-green"
                                >
                                  {term}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-auto flex gap-2 pt-5">
                          <a
                            href={browseHref}
                            title={`Opens the ${reader.presentation.toLowerCase()} inside NOMAD's offline reader`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-desert-green px-3 py-2 text-sm font-semibold text-white"
                          >
                            Browse contents <IconBook2 size={14} />
                          </a>
                          <button
                            type="button"
                            onClick={() => startSearch('', sourceId)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-2 text-sm font-semibold text-text-secondary"
                          >
                            <IconSearch size={15} /> Search
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
              {visibleLibraries.length === 0 && (
                <div className="rounded-xl border border-dashed border-border-default p-8 text-center text-text-secondary">
                  No installed article library matches those filters.
                </div>
              )}
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold">Original documents & manuals</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Open the saved source files directly when exact wording, diagrams, or page numbers
                  matter.
                </p>
              </div>
              {documentCollections.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {documentCollections.map((collection) => {
                    const expanded = expandedCollections.has(collection.id)
                    return (
                      <article
                        key={collection.id}
                        className="rounded-xl border border-border-default bg-surface-primary p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-desert-green/10 p-2.5 text-desert-green">
                            <IconFileText size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{collection.title}</h3>
                            <p className="mt-1 text-xs text-text-muted">
                              {collection.files.length} saved file
                              {collection.files.length === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-text-secondary">
                          {collection.summary}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {collection.topics.map((topic) => (
                            <span
                              key={topic}
                              className="rounded bg-surface-secondary px-2 py-1 text-xs text-text-secondary"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCollection(collection.id)}
                          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-desert-green"
                        >
                          {expanded ? <IconChevronUp size={17} /> : <IconChevronDown size={17} />}
                          {expanded ? 'Hide files' : 'See every file'}
                        </button>
                        {expanded && (
                          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto border-t border-border-default pt-4">
                            {collection.files.map((file) => (
                              <li
                                key={file.source}
                                className="flex items-center justify-between gap-3 rounded-lg bg-surface-secondary px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <span
                                    className="block truncate text-sm font-medium"
                                    title={file.fileName}
                                  >
                                    {friendlyDocumentName(file.fileName)}
                                  </span>
                                  <span className="text-xs text-text-muted">
                                    {formatBytes(file.size)}
                                    {file.state === 'indexed'
                                      ? ' · Search indexed'
                                      : ' · Original file available'}
                                  </span>
                                </div>
                                <a
                                  href={libraryDocumentUrl(
                                    file.source,
                                    friendlyDocumentName(file.fileName)
                                  )}
                                  className="shrink-0 text-sm font-semibold text-desert-green underline"
                                >
                                  Open
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border-default p-7 text-text-secondary">
                  Saved documents will appear here after the knowledge-base scanner has recorded
                  them. Article libraries above remain fully browseable meanwhile.
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </AppLayout>
  )
}
