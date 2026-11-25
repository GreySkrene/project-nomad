import { selectDiverseTitleSuggestions } from '../inertia/lib/library_search_rank.js'

type ZimFile = { name: string; title?: string }
type KiwixSuggestion = {
  value: string
  kind: 'path' | 'pattern'
  path?: string
  source: string
  sourceTitle: string
}

type SearchGate = {
  id: string
  query: string
  documentQuery?: string
  relevantTitle: RegExp
  trustedSource: RegExp
  trustedDocument: RegExp
}

type DocumentSearchResult = {
  fileName: string
  title: string
  excerpt: string
  pageNumber: number | null
  matchKind: 'content' | 'title'
}

type DocumentSearchResponse = {
  results: DocumentSearchResult[]
  partial: boolean
  indexedDocuments: number
  totalDocuments: number
}

const NOMAD_URL = process.env.NOMAD_URL ?? 'http://localhost:8080'
const KIWIX_URL = process.env.KIWIX_URL ?? 'http://localhost:8090'

// These are discoverability gates, not medical-content validation. A passing title
// must still lead to a readable original article whose advice is evaluated separately.
const gates: SearchGate[] = [
  {
    id: 'cpr',
    query: 'CPR',
    relevantTitle: /\b(cpr|cardiopulmonary resuscitation)\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
    trustedDocument: /AHA-2025-CPR-CHOKING|who-basic-emergency-care/i,
  },
  {
    id: 'choking',
    query: 'choking',
    relevantTitle: /\bchoking\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
    trustedDocument: /AHA-2025-CPR-CHOKING|who-basic-emergency-care/i,
  },
  {
    id: 'bleeding',
    query: 'bleeding',
    relevantTitle: /\b(bleeding|hemorrhage|haemorrhage)\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
    trustedDocument: /who-basic-emergency-care/i,
  },
  {
    id: 'burns',
    query: 'burn',
    documentQuery: 'burn treatment',
    relevantTitle: /\bburns?\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
    trustedDocument: /who-basic-emergency-care/i,
  },
  {
    id: 'fractures-and-splints',
    query: 'splint',
    relevantTitle: /\b(splint|fracture|broken bone)\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
    trustedDocument: /who-basic-emergency-care|en_wtnd_2025/i,
  },
  {
    id: 'shock',
    query: 'shock',
    relevantTitle: /\bshock\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
    trustedDocument: /who-basic-emergency-care/i,
  },
  {
    id: 'wound-care',
    query: 'wound care',
    relevantTitle: /\b(wound|first aid)\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
    trustedDocument: /who-basic-emergency-care/i,
  },
  {
    id: 'water-purification',
    query: 'water',
    documentQuery: 'boil water',
    relevantTitle: /\bwater\b/i,
    trustedSource: /Ready\.gov/i,
    trustedDocument: /EPA-Emergency-Disinfection|CDC-Make-Water-Safe|en_midw_2026/i,
  },
  {
    id: 'carbon-monoxide',
    query: 'carbon monoxide poisoning',
    relevantTitle: /\bcarbon monoxide poisoning\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
    trustedDocument: /CPSC-Camping-Equipment-Carbon-Monoxide|FEMA-Power-Outage/i,
  },
  {
    id: 'emergency-heat',
    query: 'power outage',
    relevantTitle: /\b(power outage|winter storm|hypothermia|extreme cold)\b/i,
    trustedSource: /Ready\.gov/i,
    trustedDocument: /FEMA-Power-Outage/i,
  },
]

function sourceName(filename: string): string {
  return filename.replace(/\.zim$/i, '')
}

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return (await response.json()) as T
}

async function suggestionsFor(file: ZimFile, query: string): Promise<KiwixSuggestion[]> {
  const source = sourceName(file.name)
  const url = new URL('/suggest', KIWIX_URL)
  url.searchParams.set('content', source)
  url.searchParams.set('term', query)
  url.searchParams.set('count', '8')
  const results = await json<Array<Omit<KiwixSuggestion, 'source' | 'sourceTitle'>>>(url.href)
  return results
    .filter((result) => result.kind === 'path' && result.path)
    .map((result) => ({
      ...result,
      source,
      sourceTitle: file.title ?? source,
    }))
}

async function documentsFor(query: string): Promise<DocumentSearchResponse> {
  const url = new URL('/api/rag/files/search', NOMAD_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '12')
  return json<DocumentSearchResponse>(url.href)
}

async function main() {
  const installed = await json<{ files: ZimFile[] }>(`${NOMAD_URL}/api/zim/list`)
  if (!installed.files.length) throw new Error('NOMAD reports no installed ZIM libraries')

  let failed = 0
  const report = []
  for (const gate of gates) {
    const [settled, documentSearch] = await Promise.all([
      Promise.allSettled(installed.files.map((file) => suggestionsFor(file, gate.query))),
      documentsFor(gate.documentQuery ?? gate.query),
    ])
    const reachable = settled.filter((result) => result.status === 'fulfilled')
    const combined = reachable.flatMap((result) => result.value)
    const selected = selectDiverseTitleSuggestions(gate.query, combined, 12, 4)
    const relevant = selected.find(
      (result) =>
        gate.relevantTitle.test(result.value) && gate.trustedSource.test(result.sourceTitle)
    )
    const trustedDocument = documentSearch.results.find((result) =>
      gate.trustedDocument.test(result.fileName)
    )
    const passed = Boolean(relevant) && Boolean(trustedDocument) && !documentSearch.partial
    if (!passed) failed += 1
    report.push({
      id: gate.id,
      query: gate.query,
      passed,
      relevant: relevant
        ? { title: relevant.value, source: relevant.sourceTitle, path: relevant.path }
        : null,
      trustedDocument: trustedDocument
        ? {
            title: trustedDocument.title,
            fileName: trustedDocument.fileName,
            pageNumber: trustedDocument.pageNumber,
            matchKind: trustedDocument.matchKind,
          }
        : null,
      topResults: selected.slice(0, 5).map((result) => ({
        title: result.value,
        source: result.sourceTitle,
      })),
      searchedLibraries: installed.files.length,
      reachableLibraries: reachable.length,
      searchedDocuments: documentSearch.indexedDocuments,
      totalDocuments: documentSearch.totalDocuments,
      documentSearchPartial: documentSearch.partial,
    })
  }

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        nomadUrl: NOMAD_URL,
        kiwixUrl: KIWIX_URL,
        installedLibraries: installed.files.length,
        passed: gates.length - failed,
        failed,
        gates: report,
      },
      null,
      2
    )
  )
  if (failed) process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
