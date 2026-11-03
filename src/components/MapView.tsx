import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { TrailPoint } from '../types'

type Props = {
  trail: TrailPoint[]
}

function CenterOnTrail({ trail }: { trail: TrailPoint[] }) {
  const map = useMap()
  const last = trail.at(-1)
  useEffect(() => {
    if (last) map.panTo([last.lat, last.lng])
  }, [last, map])
  return null
}

export function MapView({ trail }: Props) {
  const positions = trail.map((p) => [p.lat, p.lng] as [number, number])
  const center = trail.at(-1) ?? { lat: 36.5748, lng: 136.5975 } // 金沢大学

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
      {positions.length > 1 && <Polyline positions={positions} color="#d57c43" weight={5} />}
      {positions.length > 0 && (
        <>
          <CircleMarker
            center={positions[0]}
            radius={7}
            pathOptions={{ color: '#d57c43', fillColor: '#fffaf0', fillOpacity: 1, weight: 3 }}
          />
          <CircleMarker
            center={positions[positions.length - 1]}
            radius={7}
            pathOptions={{ color: '#d57c43', fillColor: '#fffaf0', fillOpacity: 1, weight: 3 }}
          />
        </>
      )}
      <CenterOnTrail trail={trail} />
    </MapContainer>
  )
}
