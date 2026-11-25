import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBook2,
  IconBookmark,
  IconExternalLink,
  IconSearch,
  IconShieldCheck,
  IconX,
} from '@tabler/icons-react'

import AppLayout from '~/layouts/AppLayout'
import api from '~/lib/api'
import { displayTitle } from '~/lib/library_browse_catalog'
import {
  kiwixArticleUrl,
  kiwixSearchUrl,
  libraryReaderUrl,
  parseLibraryReaderLocation,
  sourceName,
  type LibraryReaderLocation,
} from '~/lib/library_reader'
import { getServiceLink } from '~/lib/navigation'
import { selectDiverseTitleSuggestions } from '~/lib/library_search_rank'
import {
  isReferenceSaved,
  recordRecentReference,
  toggleSavedReference,
  type LibraryReference,
} from '~/lib/library_references'
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

function readLocation(): LibraryReaderLocation | null {
  return parseLibraryReaderLocation(window.location.search)
}

export default function LibraryReader({ kiwixService }: { kiwixService: ServiceSlim | null }) {
  const [location, setLocation] = useState<LibraryReaderLocation | null>(() => readLocation())
  const [libraries, setLibraries] = useState<ZimFileWithMetadata[]>([])
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState(() => readLocation()?.source ?? 'all')
  const [results, setResults] = useState<KiwixSuggestion[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [saved, setSaved] = useState(false)
  const [searchStatus, setSearchStatus] = useState('Search article titles in your offline library.')
  const searchRequest = useRef(0)
  const searchInput = useRef<HTMLInputElement>(null)

  const kiwixBase = useMemo(
    () =>
      kiwixService ? getServiceLink(kiwixService.ui_location || '', kiwixService.custom_url) : '',
    [kiwixService]
  )

  const knownSource = useMemo(
    () => libraries.find((file) => sourceName(file.name) === location?.source),
    [libraries, location?.source]
  )

  const sourceTitle =
    location?.sourceTitle ||
    (knownSource ? displayTitle(knownSource) : location?.source) ||
    'Offline source'
  const pageTitle =
    location?.mode === 'search'
      ? `Full-text results: ${location.query}`
      : location?.title || sourceTitle

  const frameUrl = useMemo(() => {
    if (!location || !kiwixBase) return ''
    return location.mode === 'search'
      ? kiwixSearchUrl(kiwixBase, location.query ?? '', location.source)
      : kiwixArticleUrl(kiwixBase, location.source, location.path)
  }, [kiwixBase, location])

  const referenceUrl = location ? libraryReaderUrl(location) : ''

  function currentReference(): LibraryReference | null {
    if (!location || !referenceUrl) return null
    return {
      kind: 'article',
      title: pageTitle,
      sourceTitle,
      url: referenceUrl,
      touchedAt: new Date().toISOString(),
    }
  }

  useEffect(() => {
    api.listZimFiles().then((response) => setLibraries(response.data.files))
    const onPopState = () => setLocation(readLocation())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const reference = currentReference()
    if (!reference) return
    recordRecentReference(reference)
    setSaved(isReferenceSaved(reference.url))
  }, [referenceUrl, pageTitle, sourceTitle])

  useEffect(() => {
    if (searchOpen) window.setTimeout(() => searchInput.current?.focus(), 0)
  }, [searchOpen])

  function navigate(next: LibraryReaderLocation) {
    window.history.pushState({}, '', libraryReaderUrl(next))
    setLocation(next)
    setResults([])
    setSearchOpen(false)
    window.scrollTo({ top: 0 })
  }

  async function lookupTitles(term: string, selectedScope: string) {
    const requestId = ++searchRequest.current
    const selected =
      selectedScope === 'all'
        ? libraries
        : libraries.filter((file) => sourceName(file.name) === selectedScope)

    async function fromLibrary(file: ZimFileWithMetadata) {
      const librarySource = sourceName(file.name)
      const url = new URL('/suggest', kiwixBase)
      url.searchParams.set('content', librarySource)
      url.searchParams.set('term', term)
      url.searchParams.set('count', selectedScope === 'all' ? '8' : '12')
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Kiwix title search returned ${response.status}`)
      const suggestions = (await response.json()) as Array<
        Omit<KiwixSuggestion, 'source' | 'sourceTitle'>
      >
      return suggestions
        .filter((result) => result.kind === 'path' && result.path)
        .map((result) => ({
          ...result,
          source: librarySource,
          sourceTitle: displayTitle(file),
        }))
    }

    const settled = await Promise.allSettled(selected.map(fromLibrary))
    const successful = settled.filter((item) => item.status === 'fulfilled')
    if (!successful.length && selected.length) throw new Error('Every Kiwix title search failed')
    const combined = successful.flatMap((item) => item.value)
    const seen = new Set<string>()
    const unique = combined.filter((result) => {
      const key = `${result.source}\0${result.value.toLocaleLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    const ranked = selectDiverseTitleSuggestions(term, unique)
    if (requestId === searchRequest.current) setResults(ranked)
    return ranked
  }

  async function submitSearch(event: FormEvent) {
    event.preventDefault()
    const original = query.trim()
    if (!original || !kiwixBase || !libraries.length) return
    setSearching(true)
    try {
      let activeQuery = original
      let matches = await lookupTitles(activeQuery, scope)
      if (!matches.length) {
        const response = await fetch(
          `/api/library-search/spelling?q=${encodeURIComponent(original)}`
        )
        if (response.ok) {
          const spelling = (await response.json()) as { suggestion: string | null }
          if (spelling.suggestion) {
            activeQuery = spelling.suggestion
            setQuery(activeQuery)
            matches = await lookupTitles(activeQuery, scope)
            setSearchStatus(
              matches.length
                ? `Corrected “${original}” to “${activeQuery}”. Choose an article below.`
                : `Corrected “${original}” to “${activeQuery}”, but found no title match.`
            )
          }
        }
      }
      if (activeQuery === original) {
        setSearchStatus(
          matches.length
            ? `${matches.length} ranked title matches. Choose one or search inside full article text.`
            : 'No close title found. Full-text search can still find the term inside articles.'
        )
      }
    } catch {
      setSearchStatus(
        'The local Kiwix search service did not respond. The open article remains available.'
      )
    } finally {
      setSearching(false)
    }
  }

  function openResult(result: KiwixSuggestion) {
    if (!result.path) return
    setScope(result.source)
    navigate({
      source: result.source,
      path: result.path,
      title: result.value,
      sourceTitle: result.sourceTitle,
      mode: 'article',
    })
  }

  function openFullText() {
    const term = query.trim()
    if (!term) return
    const targetSource = scope === 'all' ? location?.source || 'all' : scope
    navigate({
      source: targetSource,
      sourceTitle:
        libraries.find((file) => sourceName(file.name) === targetSource)?.title || sourceTitle,
      mode: 'search',
      query: term,
    })
  }

  if (!kiwixService) {
    return (
      <AppLayout>
        <Head title="Offline Reader" />
        <main className="mx-auto max-w-4xl p-6 text-text-primary">
          <h1 className="text-3xl font-semibold">Offline reader unavailable</h1>
          <p className="mt-4 text-text-secondary">
            The Kiwix Information Library is not installed.
          </p>
          <Link href="/library-search" className="mt-6 inline-block text-desert-green underline">
            Back to Information Library
          </Link>
        </main>
      </AppLayout>
    )
  }

  if (!location) {
    return (
      <AppLayout>
        <Head title="Offline Reader" />
        <main className="mx-auto max-w-4xl p-6 text-text-primary">
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <IconAlertTriangle className="text-amber-500" /> This reader link is incomplete
            </h1>
            <p className="mt-3 text-text-secondary">
              Choose a verified source from the Information Library.
            </p>
          </div>
          <Link href="/library-search" className="mt-6 inline-block text-desert-green underline">
            Open Information Library
          </Link>
        </main>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Head title={`${pageTitle} · Offline Reader`} />
      <main className="flex min-h-[calc(100vh-4rem)] flex-col bg-surface-secondary text-text-primary">
        <header className="border-b border-border-default bg-surface-primary px-4 py-3 shadow-sm sm:px-6">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
            <Link
              href="/library-search"
              className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-secondary"
            >
              <IconArrowLeft size={18} /> Library
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-desert-green">
                <IconBook2 size={15} /> {sourceTitle}
              </div>
              <h1 className="truncate text-base font-semibold sm:text-lg" title={pageTitle}>
                {pageTitle}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => {
                const reference = currentReference()
                if (reference) setSaved(toggleSavedReference(reference))
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${saved ? 'border-desert-green bg-desert-green/10 text-desert-green' : 'border-border-default text-text-secondary hover:bg-surface-secondary'}`}
              aria-pressed={saved}
            >
              <IconBookmark size={17} /> {saved ? 'Saved' : 'Save reference'}
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg bg-desert-green px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
              aria-expanded={searchOpen}
              aria-controls="reader-search"
            >
              {searchOpen ? <IconX size={18} /> : <IconSearch size={18} />}
              {searchOpen ? 'Close search' : 'Search library'}
            </button>
            <a
              href={frameUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-secondary"
            >
              Original view <IconExternalLink size={16} />
            </a>
          </div>
        </header>

        {searchOpen && (
          <section
            id="reader-search"
            className="border-b border-border-default bg-surface-primary px-4 py-5 sm:px-6"
          >
            <div className="mx-auto max-w-5xl">
              <div className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
                <IconShieldCheck size={18} className="text-desert-green" />
                Ranked local search; emergency authorities are preferred for safety-related topics.
              </div>
              <form
                onSubmit={submitSearch}
                className="grid gap-3 md:grid-cols-[minmax(12rem,16rem)_1fr_auto]"
              >
                <select
                  aria-label="Search scope"
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  className="rounded-lg border border-border-default bg-surface-secondary px-3 py-2.5 text-text-primary focus:border-desert-green focus:outline-none"
                >
                  <option value="all">All article libraries</option>
                  {libraries.map((file) => (
                    <option key={file.name} value={sourceName(file.name)}>
                      {displayTitle(file)}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <IconSearch
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    size={19}
                  />
                  <input
                    ref={searchInput}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    spellCheck
                    placeholder="Search splint, water purification, cumulonimbus…"
                    className="w-full rounded-lg border border-border-default bg-surface-secondary py-2.5 pl-10 pr-3 text-text-primary placeholder:text-text-muted focus:border-desert-green focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching || !query.trim()}
                  className="rounded-lg bg-desert-green px-5 py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  {searching ? 'Searching…' : 'Find'}
                </button>
              </form>
              <p className="mt-3 text-sm text-text-secondary" aria-live="polite">
                {searchStatus}
              </p>
              {results.length > 0 && (
                <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((result) => (
                    <button
                      key={`${result.source}-${result.path}-${result.value}`}
                      type="button"
                      onClick={() => openResult(result)}
                      className="rounded-lg border border-border-default bg-surface-secondary px-3 py-2.5 text-left hover:border-desert-green"
                    >
                      <span className="block font-medium">{result.value}</span>
                      <span className="mt-1 block text-xs text-text-muted">
                        {result.sourceTitle}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={openFullText}
                disabled={!query.trim()}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-desert-green underline disabled:opacity-40"
              >
                <IconSearch size={16} /> Search inside the full text of this source
              </button>
            </div>
          </section>
        )}

        <aside className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs leading-5 text-text-secondary">
          Offline snapshot. For current alerts, evacuations, closures, outbreaks, recalls, or
          contamination notices, verify live information when possible.
        </aside>

        <div className="relative min-h-[65vh] flex-1 bg-white">
          {/* Kiwix is cross-origin and applies its own CSP sandbox. A second iframe sandbox
              prevents some valid archives from rendering in Chromium. */}
          <iframe
            key={frameUrl}
            src={frameUrl}
            title={`${pageTitle} — original offline source`}
            className="absolute inset-0 h-full min-h-[65vh] w-full border-0"
            referrerPolicy="no-referrer"
          />
        </div>
      </main>
    </AppLayout>
  )
}
