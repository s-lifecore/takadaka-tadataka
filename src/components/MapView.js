import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
function CenterOnTrail({ trail }) {
    const map = useMap();
    const last = trail[trail.length - 1];
    if (last)
        map.panTo([last.lat, last.lng]);
    return null;
}
export function MapView({ trail }) {
    const positions = trail.map((p) => [p.lat, p.lng]);
    const center = trail[trail.length - 1] ?? { lat: 36.5748, lng: 136.5975 }; // 金沢大学
    return (_jsxs(MapContainer, { center: [center.lat, center.lng], zoom: 17, className: "w-full h-full", zoomControl: false, children: [_jsx(TileLayer, { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '\u00A9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }), positions.length > 1 && (_jsx(Polyline, { positions: positions, color: "black", weight: 4 })), _jsx(CenterOnTrail, { trail: trail })] }));
}
