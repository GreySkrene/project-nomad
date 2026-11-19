import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  IconBook2,
  IconExternalLink,
  IconSearch,
  IconSparkles,
} from '@tabler/icons-react'

import AppLayout from '~/layouts/AppLayout'
import api from '~/lib/api'
import { getServiceLink } from '~/lib/navigation'
import type { ServiceSlim } from '../../types/services'
import type { ZimFileWithMetadata } from '../../types/zim'

type KiwixSuggestion = {
  value: string
  label: string
  kind: 'path' | 'pattern'
  path?: string
}

type SourceOption = {
  name: string
  label: string
}

function sourceName(filename: string) {
  return filename.replace(/\.zim$/i, '')
}

function sourceLabel(file: ZimFileWithMetadata) {
  if (file.name.includes('wikipedia_en_top_maxi')) return 'Best of Wikipedia — illustrated (recommended)'
  if (file.name.includes('wikipedia_en_all_mini')) return 'Complete Wikipedia — compact'
  if (file.name.includes('wikipedia_en_medicine')) return 'Wikipedia Medicine'
  if (file.name.includes('gardenology.org_en_all')) return 'Gardenology - plant and garden encyclopedia'
  return file.title || file.name.replace(/\.zim$/i, '').replaceAll('_', ' ')
}

function articleUrl(baseUrl: string, source: string, path: string) {
  const safePath = path.split('/').map(encodeURIComponent).join('/')
  return `${baseUrl}/content/${encodeURIComponent(source)}/${safePath}`
}

export default function LibrarySearch({ kiwixService }: { kiwixService: ServiceSlim | null }) {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('')
  const [sources, setSources] = useState<SourceOption[]>([])
  const [suggestions, setSuggestions] = useState<KiwixSuggestion[]>([])
  const [correctedFrom, setCorrectedFrom] = useState<string | null>(null)
  const [status, setStatus] = useState('Start typing to find article titles.')
  const [loading, setLoading] = useState(false)

  const kiwixBase = useMemo(
    () => (kiwixService ? getServiceLink(kiwixService.ui_location || '', kiwixService.custom_url) : ''),
    [kiwixService]
  )

  useEffect(() => {
    api.listZimFiles().then((response) => {
      const files = response.data.files
      const ordered = [...files].sort((a, b) => {
        const rank = (file: ZimFileWithMetadata) =>
          file.name.includes('wikipedia_en_top_maxi')
            ? 0
            : file.name.includes('wikipedia_en_all_mini')
              ? 1
              : file.name.includes('wikipedia_en_medicine')
                ? 2
                : 3
        return rank(a) - rank(b) || sourceLabel(a).localeCompare(sourceLabel(b))
      })
      const options = ordered.map((file) => ({ name: sourceName(file.name), label: sourceLabel(file) }))
      setSources(options)
      const preferred = options.find((option) => option.name.includes('wikipedia_en_top_maxi'))
      setSource((current) => current || preferred?.name || options[0]?.name || 'all')
    })
  }, [])

  async function lookupTitles(term: string, selectedSource = source) {
    const trimmed = term.trim()
    if (!trimmed || !kiwixBase || !selectedSource || selectedSource === 'all') {
      setSuggestions([])
      return []
    }

    const url = new URL('/suggest', kiwixBase)
    url.searchParams.set('content', selectedSource)
    url.searchParams.set('term', trimmed)
    url.searchParams.set('count', '12')
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Kiwix title search returned ${response.status}`)
    const results = (await response.json()) as KiwixSuggestion[]
    const paths = results.filter((result) => result.kind === 'path' && result.path)
    setSuggestions(paths)
    return paths
  }

  useEffect(() => {
    if (!query.trim() || !source || source === 'all') {
      setSuggestions([])
      return
    }
    const timer = window.setTimeout(() => {
      lookupTitles(query).catch(() => setStatus('Title suggestions are temporarily unavailable.'))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [query, source, kiwixBase])

  function openArticle(result: KiwixSuggestion) {
    if (!result.path) return
    window.location.href = articleUrl(kiwixBase, source, result.path)
  }

  function openFullText(term = query) {
    const url = new URL('/search', kiwixBase)
    url.searchParams.set('pattern', term.trim())
    if (source !== 'all') url.searchParams.set('content', source)
    window.location.href = url.href
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const original = query.trim()
    if (!original || !kiwixBase) return
    setLoading(true)
    setCorrectedFrom(null)

    try {
      const titleResults = await lookupTitles(original)
      const exact = titleResults.find((result) => result.value.toLowerCase() === original.toLowerCase())
      if (exact) {
        openArticle(exact)
        return
      }

      const response = await fetch(`/api/library-search/spelling?q=${encodeURIComponent(original)}`)
      const spelling = (await response.json()) as { suggestion: string | null }
      if (spelling.suggestion) {
        setCorrectedFrom(original)
        setQuery(spelling.suggestion)
        const correctedResults = await lookupTitles(spelling.suggestion)
        setStatus(
          correctedResults.length
            ? `Showing title matches for “${spelling.suggestion}”.`
            : `No title match for “${spelling.suggestion}”; try full-text search.`
        )
      } else if (titleResults.length) {
        setStatus('Choose the intended article, or search inside every article.')
      } else {
        setStatus('No close title was found. Searching inside article text may still help.')
      }
    } catch {
      setStatus('Search could not reach the local Kiwix service. Check that Information Library is running.')
    } finally {
      setLoading(false)
    }
  }

  if (!kiwixService) {
    return (
      <AppLayout>
        <Head title="Offline Library Search" />
        <div className="mx-auto max-w-4xl p-6 text-text-primary">
          <h1 className="text-3xl font-semibold">Offline Library Search</h1>
          <p className="mt-4 text-text-secondary">The Kiwix Information Library is not installed.</p>
          <Link href="/home" className="mt-6 inline-block text-desert-green underline">Back to Command Center</Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Head title="Offline Library Search" />
      <main className="mx-auto w-full max-w-5xl px-5 py-8 text-text-primary">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-desert-green">
              <IconBook2 size={17} /> Offline reference library
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Find the right article</h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Title matches come first, spelling help works offline, and full-text search stays available when you need it.
            </p>
          </div>
          <a href={kiwixBase} className="inline-flex items-center gap-2 rounded border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-surface-secondary">
            Browse every library <IconExternalLink size={16} />
          </a>
        </div>

        <section className="rounded-xl border border-border-default bg-surface-primary p-5 shadow-sm sm:p-7">
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium" htmlFor="library-source">Search within</label>
            <select
              id="library-source"
              value={source}
              onChange={(event) => { setSource(event.target.value); setCorrectedFrom(null) }}
              className="w-full rounded-lg border border-border-default bg-surface-secondary px-4 py-3 text-text-primary focus:border-desert-green focus:outline-none"
            >
              {sources.map((option) => <option key={option.name} value={option.name}>{option.label}</option>)}
              <option value="all">All installed libraries — full text only</option>
            </select>

            <label className="block text-sm font-medium" htmlFor="library-query">Article or topic</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={22} />
                <input
                  id="library-query"
                  autoFocus
                  spellCheck
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setCorrectedFrom(null) }}
                  placeholder="Try cloud, cumulonimbus, earthquake…"
                  className="w-full rounded-lg border border-border-default bg-surface-secondary py-3 pl-12 pr-4 text-lg text-text-primary placeholder:text-text-muted focus:border-desert-green focus:outline-none"
                />
              </div>
              <button type="submit" disabled={loading || !query.trim()} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-desert-green px-5 py-3 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                <IconSparkles size={19} /> {loading ? 'Checking…' : 'Find article'}
              </button>
            </div>
          </form>

          {correctedFrom && (
            <div className="mt-5 rounded-lg border border-desert-green/40 bg-desert-green/10 px-4 py-3">
              <strong>Spelling corrected:</strong> “{correctedFrom}” → “{query}”.{' '}
              <button type="button" onClick={() => openFullText(correctedFrom)} className="underline">Search the original text instead</button>
            </div>
          )}

          <p className="mt-5 text-sm text-text-secondary" aria-live="polite">{status}</p>

          {suggestions.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {suggestions.map((result) => (
                <button
                  key={`${result.path}-${result.value}`}
                  type="button"
                  onClick={() => openArticle(result)}
                  className="rounded-lg border border-border-default bg-surface-secondary px-4 py-3 text-left hover:border-desert-green hover:bg-surface-tertiary"
                >
                  <span className="font-medium">{result.value}</span>
                  <span className="mt-1 block text-xs text-text-muted">Open article</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-border-default pt-5">
            <button type="button" disabled={!query.trim()} onClick={() => openFullText()} className="inline-flex items-center gap-2 text-sm font-medium text-desert-green underline disabled:opacity-40">
              <IconSearch size={17} /> Search for “{query || '…'}” inside article text
            </button>
            <p className="mt-2 text-xs text-text-muted">Full-text results are broader and may rank a different meaning of the same word first.</p>
          </div>
        </section>
      </main>
    </AppLayout>
  )
}
