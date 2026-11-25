import Footer from '~/components/Footer'
import { Link, router } from '@inertiajs/react'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconHome,
  IconLoader2,
  IconShieldCheck,
} from '@tabler/icons-react'
import classNames from 'classnames'
import ThemeToggle from '~/components/ThemeToggle'
import { useEffect, useState } from 'react'
import api from '~/lib/api'
import { SERVICE_NAMES } from '../../constants/service_names'

type LocalReadiness = 'checking' | 'ready' | 'limited'

export default function AppLayout({
  children,
  compact = false,
}: {
  children: React.ReactNode
  /**
   * Compact header for focused tool pages (e.g. Drug Reference): a small inline
   * logo + title instead of the full-height branding block, so the tool's own
   * controls sit near the top of the viewport instead of ~230px down.
   */
  compact?: boolean
}) {
  const [localReadiness, setLocalReadiness] = useState<LocalReadiness>('checking')

  useEffect(() => {
    let active = true
    api.getSystemServices().then((services) => {
      if (!active) return
      const library = services?.find((service) => service.service_name === SERVICE_NAMES.KIWIX)
      setLocalReadiness(library?.status === 'running' ? 'ready' : 'limited')
    })
    return () => {
      active = false
    }
  }, [])

  const readinessLabel =
    localReadiness === 'ready'
      ? 'Local library ready'
      : localReadiness === 'limited'
        ? 'Check local library'
        : 'Checking local library'
  const ReadinessIcon =
    localReadiness === 'ready'
      ? IconShieldCheck
      : localReadiness === 'limited'
        ? IconAlertTriangle
        : IconLoader2

  return (
    <div className="nomad-shell min-h-screen flex flex-col">
      <header className="nomad-ops-bar">
        <button
          type="button"
          className="nomad-brand"
          onClick={() => router.visit('/home')}
          aria-label="Project NOMAD home"
        >
          <img src="/nomad-primary.svg" alt="" className="h-10 w-10 object-contain" />
          <span>
            <strong>Project NOMAD</strong>
            <small>Emergency Reference</small>
          </span>
        </button>
        <div className="nomad-ops-actions">
          <span
            className={`nomad-offline-badge nomad-offline-badge--${localReadiness}`}
            title={
              localReadiness === 'ready'
                ? 'The local Kiwix library service is running. Live alerts still require internet access.'
                : localReadiness === 'limited'
                  ? 'NOMAD could not verify that the local Kiwix library service is running.'
                  : 'Checking the local Kiwix library service.'
            }
            role="status"
          >
            <ReadinessIcon
              size={17}
              className={localReadiness === 'checking' ? 'animate-spin' : undefined}
            />{' '}
            {readinessLabel}
          </span>
          <ThemeToggle compact />
          <Link href="/home" className="nomad-home-link" aria-label="Home" title="Home">
            <IconHome size={20} />
          </Link>
        </div>
      </header>

      {window.location.pathname !== '/home' && (
        <div className={classNames('nomad-context-bar', compact && 'nomad-context-bar--compact')}>
          <Link href="/home" className="inline-flex items-center gap-2">
            <IconArrowLeft size={19} /> Back to Command Center
          </Link>
        </div>
      )}

      <div className="flex-1 w-full">{children}</div>
      <Footer />
    </div>
  )
}
