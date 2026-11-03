import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
export function TrailCanvas({ trail, size = 512, onReady }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (trail.length < 2)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        const lats = trail.map((p) => p.lat);
        const lngs = trail.map((p) => p.lng);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
        const pad = 40;
        const toX = (lng) => pad + ((lng - minLng) / (maxLng - minLng || 1)) * (size - pad * 2);
        const toY = (lat) => size - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (size - pad * 2);
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(toX(trail[0].lng), toY(trail[0].lat));
        for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(toX(trail[i].lng), toY(trail[i].lat));
        }
        ctx.stroke();
        onReady?.(canvas.toDataURL('image/png').replace('data:image/png;base64,', ''));
    }, [trail, size, onReady]);
    return (_jsx("canvas", { ref: canvasRef, width: size, height: size, className: "w-full h-full" }));
}
