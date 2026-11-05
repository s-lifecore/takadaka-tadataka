import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Position, TrailPoint } from '../types'

type Props = {
  trail: TrailPoint[]
  currentPosition?: Position | null
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
    map.fitBounds(
      trail.map(({ lat, lng }) => [lat, lng] as [number, number]),
      { padding: [24, 24], maxZoom: 17, animate: false },
    )
  }, [map, trail])
  return null
}

export function MapView({ trail, currentPosition, interactive = true }: Props) {
  const positions = trail.map((p) => [p.lat, p.lng] as [number, number])
  const center = currentPosition ?? trail[trail.length - 1] ?? INITIAL_CENTER

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={17}
      className="w-full h-full"
      zoomControl={false}
      dragging={interactive}
      touchZoom={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
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
      {interactive ? (
        <CenterOnPosition lat={center.lat} lng={center.lng} />
      ) : (
        <FitTrail trail={trail} />
      )}
    </MapContainer>
  )
}
