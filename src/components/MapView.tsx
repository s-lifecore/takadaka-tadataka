import { CRS, latLng, point } from 'leaflet'
import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Position, TrailPoint } from '../types'

type Props = {
  trail: TrailPoint[]
  currentPosition?: Position | null
  fitTrail?: boolean
  interactive?: boolean
}

// GPS取得前の表示位置。金沢工業大学 扇が丘キャンパス（世界測地系）。
const INITIAL_CENTER = { lat: 36.53042, lng: 136.62763 }

function CenterOnPosition({ lat, lng }: Position) {
  const map = useMap()
  useEffect(() => {
    map.panTo([lat, lng])
  }, [map, lat, lng])
  return null
}

function FitTrail({ trail }: { trail: TrailPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (!trail.length) return
    const fit = () => {
      map.invalidateSize({ pan: false })
      map.fitBounds(
        trail.map(({ lat, lng }) => [lat, lng] as [number, number]),
        { padding: [24, 24], maxZoom: 17, animate: false },
      )
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map, trail])
  return null
}

export function MapView({ trail, currentPosition, fitTrail = false, interactive = true }: Props) {
  const positions = trail.map((p) => [p.lat, p.lng] as [number, number])
  const center = currentPosition ?? trail[trail.length - 1] ?? INITIAL_CENTER

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={17}
      style={{ width: '100%', height: '100%' }}
      dragging={interactive}
      touchZoom={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {positions.length > 1 && <Polyline positions={positions} color="#d57c43" weight={5} />}
      {positions.length > 0 && (
        <>
          <CircleMarker
            center={positions[0]}
            radius={7}
            pathOptions={{ color: '#d57c43', fillColor: '#fffaf0', fillOpacity: 1, weight: 3 }}
          >
            <Tooltip>開始地点</Tooltip>
          </CircleMarker>
          <CircleMarker
            center={positions[positions.length - 1]}
            radius={7}
            pathOptions={{ color: '#d57c43', fillColor: '#d57c43', fillOpacity: 1, weight: 3 }}
          >
            <Tooltip>軌跡の終了地点</Tooltip>
          </CircleMarker>
        </>
      )}
      {currentPosition && (
        <CircleMarker
          center={[currentPosition.lat, currentPosition.lng]}
          radius={6}
          pathOptions={{ color: '#38bdf8', fillColor: '#7dd3fc', fillOpacity: 0.7, weight: 2 }}
        >
          <Tooltip>現在地</Tooltip>
        </CircleMarker>
      )}
      {fitTrail ? (
        <FitTrail trail={trail} />
      ) : (
        <CenterOnPosition lat={center.lat} lng={center.lng} />
      )}
    </MapContainer>
  )
}

const SNAPSHOT_WIDTH = 640
const SNAPSHOT_HEIGHT = 416

// Render only the tiles visible in this single snapshot; no prefetch or extra zoom levels.
async function renderTrailMap(trail: TrailPoint[], signal: AbortSignal) {
  const width = SNAPSHOT_WIDTH
  const height = SNAPSHOT_HEIGHT
  let zoom = 17
  const project = (z: number) =>
    trail.map(({ lat, lng }) => CRS.EPSG3857.latLngToPoint(latLng(lat, lng), z))
  let positions = project(zoom)
  const bounds = () => ({
    left: Math.min(...positions.map((p) => p.x)),
    right: Math.max(...positions.map((p) => p.x)),
    top: Math.min(...positions.map((p) => p.y)),
    bottom: Math.max(...positions.map((p) => p.y)),
  })
  let extent = bounds()
  while (
    zoom > 0 &&
    (extent.right - extent.left > width - 64 || extent.bottom - extent.top > height - 96)
  ) {
    positions = project(--zoom)
    extent = bounds()
  }
  const origin = point(
    (extent.left + extent.right - width) / 2,
    (extent.top + extent.bottom - height) / 2,
  )
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('地図画像を作成できませんでした。')
  context.fillStyle = '#f0e9df'
  context.fillRect(0, 0, width, height)
  const tiles: Promise<void>[] = []
  const worldTiles = 2 ** zoom
  for (let y = Math.floor(origin.y / 256); y <= Math.floor((origin.y + height - 1) / 256); y++) {
    if (y < 0 || y >= worldTiles) continue
    for (let x = Math.floor(origin.x / 256); x <= Math.floor((origin.x + width - 1) / 256); x++) {
      tiles.push(
        new Promise<void>((resolve, reject) => {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          const cleanup = () => {
            clearTimeout(timeout)
            signal.removeEventListener('abort', abort)
            image.onload = null
            image.onerror = null
          }
          const abort = () => {
            cleanup()
            image.src = ''
            reject(new DOMException('Aborted', 'AbortError'))
          }
          const timeout = window.setTimeout(() => {
            cleanup()
            image.src = ''
            reject(new Error('地図の読み込みがタイムアウトしました。'))
          }, 15000)
          image.onload = () => {
            cleanup()
            context.drawImage(image, x * 256 - origin.x, y * 256 - origin.y, 256, 256)
            resolve()
          }
          image.onerror = () => {
            cleanup()
            reject(new Error('地図を読み込めませんでした。'))
          }
          signal.addEventListener('abort', abort, { once: true })
          if (signal.aborted) return abort()
          const wrappedX = ((x % worldTiles) + worldTiles) % worldTiles
          image.src = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`
        }),
      )
    }
  }
  await Promise.all(tiles)
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  const path = positions.map((p) => p.subtract(origin))
  context.strokeStyle = '#d57c43'
  context.lineWidth = 5
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()
  path.forEach((p, index) => (index === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y)))
  context.stroke()
  for (const [index, p] of [path[0], path[path.length - 1]].entries()) {
    context.beginPath()
    context.arc(p.x, p.y, 7, 0, Math.PI * 2)
    context.fillStyle = index === 0 ? '#fffaf0' : '#d57c43'
    context.fill()
    context.lineWidth = 3
    context.stroke()
  }
  // Attribution is embedded in the image as well as linked below it.
  context.font = '12px sans-serif'
  const attribution = '© OpenStreetMap contributors'
  const labelWidth = context.measureText(attribution).width + 12
  context.fillStyle = '#ffffffee'
  context.fillRect(width - labelWidth, height - 24, labelWidth, 24)
  context.fillStyle = '#333'
  context.fillText(attribution, width - labelWidth + 6, height - 8)
  return canvas.toDataURL('image/png')
}

export function TrailMapImage({ trail }: { trail: TrailPoint[] }) {
  const [snapshot, setSnapshot] = useState<{ trail: TrailPoint[]; url: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!trail.length) return
    const controller = new AbortController()
    renderTrailMap(trail, controller.signal)
      .then((url) => {
        if (!controller.signal.aborted) setSnapshot({ trail, url })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true)
          controller.abort()
        }
      })
    return () => controller.abort()
  }, [trail, attempt])

  return (
    <>
      <div className="result-route-map" aria-busy={!snapshot && !failed}>
        {snapshot?.trail === trail ? (
          <img
            src={snapshot.url}
            width={SNAPSHOT_WIDTH}
            height={SNAPSHOT_HEIGHT}
            alt="歩いた経路の地図。白い丸が開始地点、オレンジの丸が終了地点です。"
            draggable={false}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : failed ? (
          <div className="result-message" role="alert">
            <p>地図画像を読み込めませんでした。</p>
            <button
              type="button"
              onClick={() => {
                setFailed(false)
                setAttempt((value) => value + 1)
              }}
            >
              もう一度読み込む
            </button>
          </div>
        ) : (
          <p className="result-message" role="status">
            地図画像を作成中…
          </p>
        )}
      </div>
      <p className="result-route-note">
        ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap contributors
        </a>
      </p>
    </>
  )
}
