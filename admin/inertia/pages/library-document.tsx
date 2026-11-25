import { useEffect, useMemo, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import { IconAlertTriangle, IconArrowLeft, IconDownload, IconFileText } from '@tabler/icons-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import AppLayout from '~/layouts/AppLayout'
import api from '~/lib/api'

type TextDocument = {
  content: string
  extension: string
  fileName: string
}

function extensionOf(value: string): string {
  return value.split('.').at(-1)?.toLocaleLowerCase() ?? ''
}

export default function LibraryDocument() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const source = (params.get('source') ?? '').slice(0, 4_000)
  const requestedTitle = (params.get('title') ?? '').slice(0, 300)
  const fallbackTitle = requestedTitle || source.split(/[/\\]/).at(-1) || 'Saved document'
  const extension = extensionOf(source)
  const isPdf = extension === 'pdf'
  const [document, setDocument] = useState<TextDocument | null>(null)
  const [loading, setLoading] = useState(!isPdf && Boolean(source))
  const [failed, setFailed] = useState(!source)

  const downloadUrl = `/api/rag/files/download?source=${encodeURIComponent(source)}`
  const inlineUrl = `/api/rag/files/inline?source=${encodeURIComponent(source)}`

  useEffect(() => {
    if (!source || isPdf) return
    api
      .getFileContent(source)
      .then((result) => {
        if (result) setDocument(result)
        else setFailed(true)
      })
      .finally(() => setLoading(false))
  }, [isPdf, source])

  const title = requestedTitle || document?.fileName || fallbackTitle
  const isMarkdown = ['md', 'markdown'].includes(document?.extension ?? extension)

  return (
    <AppLayout>
      <Head title={`${title} · Saved Document`} />
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
                <IconFileText size={15} /> Saved original document
              </div>
              <h1 className="truncate text-base font-semibold sm:text-lg" title={title}>
                {title}
              </h1>
            </div>
            {source && (
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-secondary"
              >
                <IconDownload size={17} /> Download original
              </a>
            )}
          </div>
        </header>

        <aside className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs leading-5 text-text-secondary">
          Original stored source. Use its publication date and issuing organization when deciding
          whether guidance is current.
        </aside>

        {isPdf && source ? (
          <div className="relative min-h-[75vh] flex-1 bg-surface-tertiary">
            <iframe
              src={inlineUrl}
              title={`${title} — stored PDF`}
              className="absolute inset-0 h-full min-h-[75vh] w-full border-0"
            />
          </div>
        ) : (
          <article className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
            {loading && <p className="text-text-secondary">Loading saved document…</p>}
            {failed && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <IconAlertTriangle className="text-amber-500" /> Preview unavailable
                </h2>
                <p className="mt-2 text-text-secondary">
                  This file is missing or its format is not safely viewable here. The original
                  download remains available when the stored file exists.
                </p>
              </div>
            )}
            {document && isMarkdown && (
              <div className="rounded-xl border border-border-default bg-white p-6 text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100 sm:p-9">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="mb-5 border-b border-slate-300 pb-3 text-3xl font-bold dark:border-slate-700">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="mb-3 mt-8 border-b border-slate-200 pb-2 text-2xl font-semibold dark:border-slate-800">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mb-2 mt-6 text-xl font-semibold">{children}</h3>
                    ),
                    p: ({ children }) => <p className="my-3 leading-7">{children}</p>,
                    ol: ({ children }) => (
                      <ol className="my-4 list-decimal space-y-2 pl-7">{children}</ol>
                    ),
                    ul: ({ children }) => (
                      <ul className="my-4 list-disc space-y-2 pl-7">{children}</ul>
                    ),
                    li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
                    a: ({ children, href }) => (
                      <a className="font-medium text-desert-green underline" href={href}>
                        {children}
                      </a>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-4 border-l-4 border-desert-green bg-slate-100 px-4 py-2 italic dark:bg-slate-900">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="my-5 overflow-x-auto">
                        <table className="w-full border-collapse text-sm">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left dark:border-slate-700 dark:bg-slate-900">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-slate-300 px-3 py-2 align-top dark:border-slate-700">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {document.content}
                </ReactMarkdown>
              </div>
            )}
            {document && !isMarkdown && (
              <pre className="overflow-auto whitespace-pre-wrap rounded-xl border border-border-default bg-surface-primary p-5 font-mono text-sm leading-6 text-text-primary shadow-sm">
                {document.content}
              </pre>
            )}
          </article>
        )}
      </main>
    </AppLayout>
  )
}
