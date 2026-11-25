export type LibraryReaderLocation = {
  source: string
  path?: string
  title?: string
  sourceTitle?: string
  mode?: 'article' | 'search'
  query?: string
}

export function sourceName(filename: string): string {
  return filename.replace(/\.zim$/i, '')
}

function encodeArticlePath(path: string): string {
  return path
    .split('/')
    .filter((segment, index) => segment || index > 0)
    .map(encodeURIComponent)
    .join('/')
}

export function kiwixArticleUrl(baseUrl: string, source: string, path = ''): string {
  const root = `${baseUrl.replace(/\/$/, '')}/content/${encodeURIComponent(source)}/`
  return path ? `${root}${encodeArticlePath(path)}` : root
}

export function kiwixSearchUrl(baseUrl: string, query: string, source = 'all'): string {
  const url = new URL('/search', baseUrl)
  url.searchParams.set('pattern', query.trim())
  if (source !== 'all') url.searchParams.set('content', source)
  return url.href
}

export function libraryReaderUrl(location: LibraryReaderLocation): string {
  const params = new URLSearchParams()
  params.set('source', location.source)
  if (location.path) params.set('path', location.path)
  if (location.title) params.set('title', location.title)
  if (location.sourceTitle) params.set('sourceTitle', location.sourceTitle)
  if (location.mode === 'search') params.set('mode', 'search')
  if (location.query) params.set('q', location.query)
  return `/library/read?${params.toString()}`
}

export function libraryDocumentUrl(source: string, fileName?: string): string {
  const params = new URLSearchParams({ source })
  if (fileName) params.set('title', fileName)
  return `/library/document?${params.toString()}`
}

export function parseLibraryReaderLocation(search: string): LibraryReaderLocation | null {
  const params = new URLSearchParams(search)
  const source = params.get('source')?.trim() ?? ''
  if (!/^[a-zA-Z0-9._-]{1,220}$/.test(source)) return null

  const mode = params.get('mode') === 'search' ? 'search' : 'article'
  const path = (params.get('path') ?? '').slice(0, 2_000)
  const title = (params.get('title') ?? '').slice(0, 300)
  const sourceTitle = (params.get('sourceTitle') ?? '').slice(0, 300)
  const query = (params.get('q') ?? '').slice(0, 120)

  if (mode === 'search' && !query.trim()) return null
  return { source, path, title, sourceTitle, mode, query }
}
