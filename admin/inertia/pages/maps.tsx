import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'

import MapsLayout from '~/layouts/MapsLayout'
import MapComponent from '~/components/maps/MapComponent'
import StyledButton from '~/components/StyledButton'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCrosshair,
  IconMapPin,
  IconPlaneTilt,
} from '@tabler/icons-react'
import { FileEntry } from '../../types/files'
import Alert from '~/components/Alert'

type MapCommand = {
  id: number
  lat: number
  lng: number
  action: 'fly' | 'marker'
}

export default function Maps(props: {
  maps: { baseAssetsExist: boolean; worldBasemapExists: boolean; regionFiles: FileEntry[] }
}) {
  const [isHoveringUI, setIsHoveringUI] = useState(false)

  const [coordinateSearch, setCoordinateSearch] = useState('')
  const [coordinateError, setCoordinateError] = useState('')
  const [mapCommand, setMapCommand] = useState<MapCommand | null>(null)
  const [showCoordinatesEnabled, setShowCoordinatesEnabled] = useState(true)

  const parseCoordinates = () => {
    const [latRaw, lngRaw] = coordinateSearch.split(',').map((value) => value.trim())
    const lat = Number(latRaw)
    const lng = Number(lngRaw)

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return null
    }

    return { lat, lng }
  }

  const handleCoordinateAction = (action: 'fly' | 'marker') => {
    const coordinates = parseCoordinates()
    if (!coordinates) {
      setCoordinateError('Enter latitude, longitude—for example 40.6097, -111.9391.')
      return
    }

    setCoordinateError('')

    setMapCommand({
      id: Date.now(),
      ...coordinates,
      action,
    })
  }

  const alertMessage = !props.maps.baseAssetsExist
    ? 'The base map assets have not been installed. Please download them first to enable map functionality.'
    : !props.maps.worldBasemapExists
      ? 'The world base map has not been downloaded yet, so the map may appear blank outside downloaded regions. Connect this NOMAD to the internet and download it (~15 MB) from Map Settings.'
      : props.maps.regionFiles.length === 0
        ? 'No map regions have been downloaded yet. Please download some regions to enable map functionality.'
        : null

  return (
    <MapsLayout>
      <Head title="Maps" />

      <div className="relative h-screen w-screen max-w-[100vw] overflow-hidden">
        {/* Navbar */}
        <div
          className="absolute left-0 right-0 top-0 z-50 flex w-screen max-w-[100vw] flex-wrap items-center justify-between gap-3 overflow-hidden bg-surface-secondary p-3 shadow-sm backdrop-blur-sm sm:p-4"
          onMouseEnter={() => setIsHoveringUI(true)}
          onMouseLeave={() => setIsHoveringUI(false)}
        >
          <Link href="/home" className="flex items-center">
            <IconArrowLeft className="mr-2" size={24} />
            <p className="text-lg text-text-secondary">Back to Home</p>
          </Link>

          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <div className="relative">
              <label htmlFor="map-coordinate-search" className="sr-only">
                Latitude and longitude
              </label>
              <input
                id="map-coordinate-search"
                type="text"
                placeholder="latitude, longitude"
                value={coordinateSearch}
                aria-invalid={Boolean(coordinateError)}
                aria-describedby={coordinateError ? 'map-coordinate-error' : undefined}
                onChange={(event) => {
                  setCoordinateSearch(event.target.value)
                  if (coordinateError) setCoordinateError('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleCoordinateAction('fly')
                }}
                className={`w-36 rounded border bg-surface-primary px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:outline-none sm:w-52 ${coordinateError ? 'border-desert-red focus:border-desert-red' : 'border-border-default focus:border-desert-green'}`}
              />
              {coordinateError && (
                <p
                  id="map-coordinate-error"
                  role="alert"
                  className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded border border-desert-red/60 bg-surface-primary px-3 py-2 text-xs text-desert-red shadow-lg sm:left-auto sm:right-0"
                >
                  {coordinateError}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleCoordinateAction('fly')}
              className="rounded border border-border-default bg-surface-primary p-2 text-text-secondary hover:bg-surface-secondary"
              title="Fly to coordinates"
              aria-label="Fly to coordinates"
            >
              <IconPlaneTilt size={18} />
            </button>

            <button
              type="button"
              onClick={() => handleCoordinateAction('marker')}
              className="rounded border border-border-default bg-surface-primary p-2 text-text-secondary hover:bg-surface-secondary"
              title="Add marker at coordinates"
              aria-label="Add marker at coordinates"
            >
              <IconMapPin size={18} />
            </button>

            <button
              type="button"
              onClick={() => setShowCoordinatesEnabled((prev) => !prev)}
              className={`rounded border border-border-default p-2 transition-colors ${
                showCoordinatesEnabled
                  ? 'bg-desert-green text-white'
                  : 'bg-surface-primary text-text-secondary hover:bg-surface-secondary'
              }`}
              title={showCoordinatesEnabled ? 'Hide coordinates' : 'Show coordinates'}
              aria-label={showCoordinatesEnabled ? 'Hide coordinates' : 'Show coordinates'}
            >
              <IconCrosshair size={18} />
            </button>

            <Link href="/settings/maps" className="mr-0 sm:mr-4">
              <StyledButton variant="primary" icon="IconSettings">
                Manage Map Regions
              </StyledButton>
            </Link>
          </div>
        </div>

        {/* Alert */}
        {alertMessage && (
          <div
            className="absolute top-20 left-4 right-4 z-50"
            onMouseEnter={() => setIsHoveringUI(true)}
            onMouseLeave={() => setIsHoveringUI(false)}
          >
            <Alert
              title={alertMessage}
              type="warning"
              variant="solid"
              className="w-full"
              buttonProps={{
                variant: 'secondary',
                children: 'Go to Map Settings',
                icon: 'IconSettings',
                onClick: () => router.visit('/settings/maps'),
              }}
            />
          </div>
        )}

        {/* Map */}

        <div className="absolute inset-0">
          <MapComponent
            mapCommand={mapCommand}
            isHoveringUI={isHoveringUI}
            showCoordinatesEnabled={showCoordinatesEnabled}
          />
        </div>

        <aside
          className="absolute bottom-8 left-4 right-4 z-40 flex max-w-md gap-3 rounded-lg border border-amber-500/50 bg-surface-primary/95 px-4 py-3 text-sm shadow-lg backdrop-blur-sm sm:right-auto"
          onMouseEnter={() => setIsHoveringUI(true)}
          onMouseLeave={() => setIsHoveringUI(false)}
          aria-label="Offline map limitation"
        >
          <IconAlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={20} />
          <div>
            <strong className="text-text-primary">Offline map snapshot</strong>
            <p className="mt-0.5 leading-5 text-text-secondary">
              No live road closures, evacuation orders, fires, weather, or traffic. Verify current
              conditions by radio or local authorities when possible.
            </p>
          </div>
        </aside>
      </div>
    </MapsLayout>
  )
}
