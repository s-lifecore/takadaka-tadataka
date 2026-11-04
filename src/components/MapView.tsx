import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { TrailPoint } from '../types'

type Props = {
  trail: TrailPoint[]
}

// GPS取得前の表示位置。金沢工業大学 扇が丘キャンパス（世界測地系）。
const INITIAL_CENTER = { lat: 36.53042, lng: 136.62763 }

function CenterOnTrail({ trail }: { trail: TrailPoint[] }) {
  const map = useMap()
  const last = trail[trail.length - 1]
  if (last) map.panTo([last.lat, last.lng])
  return null
}

export function MapView({ trail }: Props) {
  const positions = trail.map((p) => [p.lat, p.lng] as [number, number])
  const center = trail[trail.length - 1] ?? INITIAL_CENTER

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
          >
            <Tooltip>開始地点</Tooltip>
          </CircleMarker>
          <CircleMarker
            center={positions[positions.length - 1]}
            radius={7}
            pathOptions={{ color: '#d57c43', fillColor: '#d57c43', fillOpacity: 1, weight: 3 }}
          >
            <Tooltip>現在地・終了地点</Tooltip>
          </CircleMarker>
        </>
      )}
      <CenterOnTrail trail={trail} />
    </MapContainer>
  )
}
