import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { MapView } from '../components/MapView';
import { Timer } from '../components/Timer';
import { useGeolocation } from '../hooks/useGeolocation';
import { useTimer } from '../hooks/useTimer';
const GAME_SECONDS = 15 * 60;
export function Game({ onFinish }) {
    const { trail, error, start: startGPS, stop: stopGPS } = useGeolocation();
    const { remaining, expired, start: startTimer } = useTimer(GAME_SECONDS);
    useEffect(() => {
        startGPS();
        startTimer();
        return () => stopGPS();
    }, [startGPS, startTimer, stopGPS]);
    useEffect(() => {
        if (expired)
            handleFinish();
    }, [expired]);
    function handleFinish() {
        stopGPS();
        onFinish(trail);
    }
    return (_jsxs("div", { className: "flex flex-col h-screen", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 bg-white shadow z-10", children: [_jsx("span", { className: "text-lg font-bold", children: "\uD83C\uDF4E \u308A\u3093\u3054" }), _jsx(Timer, { remaining: remaining }), _jsx("button", { onClick: handleFinish, className: "text-sm text-gray-400 underline", children: "\u5B8C\u4E86" })] }), error && (_jsx("div", { className: "bg-red-100 text-red-700 text-sm px-4 py-2", children: error })), _jsxs("div", { className: "flex-1 relative", children: [_jsx(MapView, { trail: trail }), _jsxs("div", { className: "absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full", children: ["\u8ECC\u8DE1: ", trail.length, " \u70B9"] })] })] }));
}
