export function parsePdfPage(value: string | null): number {
  if (!value || !/^\d{1,6}$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

export function clampPdfPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page) || pageCount < 1) return 1
  return Math.min(Math.max(Math.trunc(page), 1), pageCount)
}

export function pdfPageCitation(title: string, page: number, url: string): string {
  return `${title}, p. ${page}. ${url}`
}

export function textItemsToSearchText(items: Array<{ str?: unknown }>): string {
  return items
    .map((item) => (typeof item.str === 'string' ? item.str : ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase()
}

function normalizePdfSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function pdfPageMatchesQuery(pageText: string, query: string): boolean {
  const haystack = normalizePdfSearchText(pageText)
  const needle = normalizePdfSearchText(query)
  if (!haystack || !needle) return false
  if (haystack.includes(needle)) return true
  const terms = [...new Set(needle.split(' ').filter(Boolean))]
  return terms.length > 1 && terms.every((term) => haystack.includes(term))
}
