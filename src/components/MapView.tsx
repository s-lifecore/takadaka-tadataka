import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { TrailPoint } from '../types'

type Props = {
  trail: TrailPoint[]
  currentPosition?: TrailPoint | null
}

function CenterOnPosition({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.panTo([lat, lng])
  }, [map, lat, lng])
  return null
}

export function MapView({ trail, currentPosition }: Props) {
  const positions = trail.map((p) => [p.lat, p.lng] as [number, number])
  const center = currentPosition ?? trail[trail.length - 1] ?? { lat: 36.52836, lng: 136.62713 } // 金沢工業大学

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={17}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {positions.length > 1 && <Polyline positions={positions} color="black" weight={4} />}
      {currentPosition && (
        <CircleMarker
          center={[currentPosition.lat, currentPosition.lng]}
          radius={6}
          pathOptions={{ color: '#38bdf8', fillColor: '#7dd3fc', fillOpacity: 0.7, weight: 2 }}
        >
          <Tooltip>現在地</Tooltip>
        </CircleMarker>
      )}
      <CenterOnPosition lat={center.lat} lng={center.lng} />
    </MapContainer>
  )
}
