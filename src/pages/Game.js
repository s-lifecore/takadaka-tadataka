import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from 'react';
import { MapView } from '../components/MapView';
import { Timer } from '../components/Timer';
import { useGeolocation } from '../hooks/useGeolocation';
import { useTimer } from '../hooks/useTimer';
import { useWalkingWarning } from '../hooks/useWalkingWarning';
const GAME_SECONDS = 15 * 60;
export function Game({ onFinish }) {
    const { trail, error, start: startGPS, stop: stopGPS, setPaused } = useGeolocation();
    const { warning, status: sensorStatus, enable } = useWalkingWarning(setPaused);
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
    return (_jsxs("div", { className: "flex flex-col h-screen", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 bg-white shadow z-10", children: [_jsx("span", { className: "text-lg font-bold", children: "\uD83C\uDF4E \u308A\u3093\u3054" }), _jsx(Timer, { remaining: remaining }), _jsx("button", { onClick: handleFinish, className: "text-sm text-gray-400 underline", children: "\u5B8C\u4E86" })] }), error && (_jsx("div", { className: "bg-red-100 text-red-700 text-sm px-4 py-2", children: error })), sensorStatus !== 'active' && (_jsxs("div", { className: "bg-amber-100 text-amber-900 text-sm px-4 py-2", role: "status", children: [sensorStatus === 'idle' && (_jsx("button", { onClick: () => void enable(), className: "underline font-bold", children: "\u6B69\u304D\u30B9\u30DE\u30DB\u8B66\u544A\u3092\u6709\u52B9\u306B\u3059\u308B" })), sensorStatus === 'waiting' && '端末の傾きを確認しています…', sensorStatus === 'denied' && (_jsxs(_Fragment, { children: ["\u50BE\u304D\u30BB\u30F3\u30B5\u30FC\u306E\u5229\u7528\u304C\u8A31\u53EF\u3055\u308C\u3066\u3044\u306A\u3044\u305F\u3081\u3001\u6B69\u304D\u30B9\u30DE\u30DB\u8B66\u544A\u306F\u7121\u52B9\u3067\u3059\u3002", _jsx("button", { onClick: () => void enable(), className: "underline ml-2", children: "\u518D\u8A66\u884C" })] })), sensorStatus === 'unavailable' && '傾きセンサーを利用できないため、歩きスマホ警告は無効です。', _jsx("p", { children: "\u7AEF\u672B\u306E\u50BE\u304D\u306B\u3088\u308B\u691C\u77E5\u3067\u3059\u3002\u753B\u9762\u306E\u78BA\u8A8D\u306F\u7ACB\u3061\u6B62\u307E\u3063\u3066\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002" })] })), warning && (_jsxs("div", { role: "alert", className: "bg-red-700 text-white px-4 py-4 text-center", children: [_jsx("p", { className: "font-bold text-lg", children: "\u753B\u9762\u3092\u898B\u306A\u304C\u3089\u6B69\u304B\u306A\u3044\u3067\u304F\u3060\u3055\u3044" }), _jsx("p", { children: "\u8ECC\u8DE1\u306E\u8A18\u9332\u3092\u4E00\u6642\u505C\u6B62\u3057\u3066\u3044\u307E\u3059\u3002\u753B\u9762\u3092\u4E0B\u306B\u5411\u3051\u308B\u304B\u3001\u7AEF\u672B\u3092\u7ACB\u3066\u308B\u3068\u518D\u958B\u3057\u307E\u3059\u3002" }), _jsx("p", { className: "text-sm", children: "\u7AEF\u672B\u306E\u50BE\u304D\u306B\u3088\u308B\u691C\u77E5\u3067\u3059\u3002\u6B8B\u308A\u6642\u9593\u306F\u9032\u307F\u307E\u3059\u3002" })] })), _jsxs("div", { className: "flex-1 relative", children: [_jsx(MapView, { trail: trail }), _jsxs("div", { className: "absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full", children: ["\u8ECC\u8DE1: ", trail.length, " \u70B9"] })] })] }));
}
