import { useEffect, useRef, useState } from 'react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconSearch,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react'
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type RenderTask,
} from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

import {
  clampPdfPage,
  pdfPageCitation,
  pdfPageMatchesQuery,
  textItemsToSearchText,
} from '~/lib/pdf_reader'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type Props = {
  initialPage: number
  initialQuery: string
  title: string
  url: string
  onPageChange: (page: number) => void
}

export default function PdfDocumentReader({
  initialPage,
  initialQuery,
  title,
  url,
  onPageChange,
}: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(initialPage)
  const [pageInput, setPageInput] = useState(String(initialPage))
  const [zoom, setZoom] = useState(1.25)
  const [query, setQuery] = useState(initialQuery)
  const [status, setStatus] = useState('Loading PDF…')
  const [failed, setFailed] = useState(false)
  const [searching, setSearching] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const searchCursorRef = useRef({ page: 0, query: '' })

  useEffect(() => {
    let active = true
    const task = getDocument({ url })
    task.promise
      .then((loaded) => {
        if (!active) return loaded.destroy()
        const nextPage = clampPdfPage(initialPage, loaded.numPages)
        setPdf(loaded)
        setPage(nextPage)
        setPageInput(String(nextPage))
        setStatus(`${loaded.numPages.toLocaleString()} pages available offline.`)
      })
      .catch(() => {
        if (!active) return
        setFailed(true)
        setStatus('This PDF could not be opened in the NOMAD reader.')
      })
    return () => {
      active = false
      task.destroy()
    }
  }, [initialPage, url])

  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    let active = true
    pdf
      .getPage(page)
      .then((pdfPage) => {
        if (!active || !canvasRef.current) return
        renderTaskRef.current?.cancel()
        const pixelRatio = window.devicePixelRatio || 1
        const viewport = pdfPage.getViewport({ scale: zoom })
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas is unavailable')
        canvas.width = Math.floor(viewport.width * pixelRatio)
        canvas.height = Math.floor(viewport.height * pixelRatio)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        const renderTask = pdfPage.render({
          canvas,
          canvasContext: context,
          transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
          viewport,
        })
        renderTaskRef.current = renderTask
        return renderTask.promise
      })
      .catch((error: { name?: string }) => {
        if (active && error?.name !== 'RenderingCancelledException') {
          setStatus(`Page ${page} could not be rendered.`)
        }
      })
    return () => {
      active = false
      renderTaskRef.current?.cancel()
    }
  }, [page, pdf, zoom])

  useEffect(() => onPageChange(page), [onPageChange, page])

  function goToPage(value: number) {
    if (!pdf) return
    const next = clampPdfPage(value, pdf.numPages)
    setPage(next)
    setPageInput(String(next))
  }

  async function findNext() {
    const needle = query.trim().toLocaleLowerCase()
    if (!pdf || !needle || searching) return
    setSearching(true)
    setStatus(`Searching ${pdf.numPages.toLocaleString()} pages…`)
    try {
      const continueAfterCurrent =
        searchCursorRef.current.query === needle && searchCursorRef.current.page === page
      const firstOffset = continueAfterCurrent ? 1 : 0
      for (let checked = 0; checked < pdf.numPages; checked += 1) {
        const offset = firstOffset + checked
        const candidate = ((page - 1 + offset) % pdf.numPages) + 1
        const pdfPage = await pdf.getPage(candidate)
        const text = await pdfPage.getTextContent()
        if (pdfPageMatchesQuery(textItemsToSearchText(text.items), needle)) {
          goToPage(candidate)
          searchCursorRef.current = { page: candidate, query: needle }
          setStatus(`Found “${query.trim()}” on page ${candidate}.`)
          return
        }
        if ((checked + 1) % 10 === 0) {
          setStatus(`Searched ${checked + 1} of ${pdf.numPages} pages…`)
        }
      }
      setStatus(`No match for “${query.trim()}” in this PDF.`)
    } catch {
      setStatus('PDF search stopped because a page could not be read.')
    } finally {
      setSearching(false)
    }
  }

  async function copyCitation() {
    const citation = pdfPageCitation(title, page, window.location.href)
    try {
      await navigator.clipboard.writeText(citation)
      setStatus(`Copied citation for page ${page}.`)
    } catch {
      setStatus(`Citation: ${citation}`)
    }
  }

  const buttonClass =
    'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border-default bg-surface-secondary px-3 text-sm font-semibold text-text-secondary hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <section className="flex min-h-[75vh] flex-1 flex-col bg-surface-tertiary">
      <div className="sticky top-0 z-10 border-b border-border-default bg-surface-primary px-3 py-2 shadow-sm">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-2">
          <button
            className={buttonClass}
            disabled={!pdf || page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            <IconChevronLeft size={17} /> Previous
          </button>
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-border-default bg-surface-secondary px-3 text-sm text-text-secondary">
            Page
            <input
              aria-label="PDF page number"
              className="w-16 rounded border border-border-default bg-surface-primary px-2 py-1 text-center text-text-primary"
              inputMode="numeric"
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value.replace(/\D/g, '').slice(0, 6))}
              onBlur={() => goToPage(Number(pageInput))}
              onKeyDown={(event) => event.key === 'Enter' && goToPage(Number(pageInput))}
            />
            of {pdf?.numPages ?? '—'}
          </label>
          <button
            className={buttonClass}
            disabled={!pdf || page >= pdf.numPages}
            onClick={() => goToPage(page + 1)}
          >
            Next <IconChevronRight size={17} />
          </button>
          <button
            className={buttonClass}
            disabled={zoom <= 0.75}
            onClick={() => setZoom((value) => value - 0.25)}
            aria-label="Zoom out"
          >
            <IconZoomOut size={17} />
          </button>
          <span className="min-w-14 text-center text-xs font-semibold text-text-muted">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className={buttonClass}
            disabled={zoom >= 2.5}
            onClick={() => setZoom((value) => value + 0.25)}
            aria-label="Zoom in"
          >
            <IconZoomIn size={17} />
          </button>
          <div className="flex min-w-64 flex-1 items-center gap-2 sm:max-w-lg">
            <IconSearch size={17} className="shrink-0 text-text-muted" />
            <input
              aria-label="Search this PDF"
              className="min-w-0 flex-1 rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-desert-green focus:outline-none"
              placeholder="Search every page"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                searchCursorRef.current = { page: 0, query: '' }
              }}
              onKeyDown={(event) => event.key === 'Enter' && findNext()}
            />
            <button
              className={buttonClass}
              disabled={!pdf || !query.trim() || searching}
              onClick={findNext}
            >
              {searching ? 'Searching…' : 'Find next'}
            </button>
          </div>
          <button className={buttonClass} disabled={!pdf} onClick={copyCitation}>
            <IconCopy size={17} /> Cite page
          </button>
          <p className="w-full text-center text-xs text-text-muted" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
      <div className="flex flex-1 justify-center overflow-auto p-3 sm:p-6">
        {failed ? (
          <div className="my-8 h-fit rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-text-primary">
            <h2 className="font-semibold">PDF preview unavailable</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Download the stored original with the button above.
            </p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="h-fit max-w-none bg-white shadow-xl"
            aria-label={`Page ${page} of ${title}`}
          />
        )}
      </div>
    </section>
  )
}
