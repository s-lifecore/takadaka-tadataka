import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useState } from 'react';
import { TrailCanvas } from '../components/TrailCanvas';
import { judgeDrawing } from '../lib/gemini';
export function Result({ trail, onRetry }) {
    const [result, setResult] = useState(null);
    const [judging, setJudging] = useState(false);
    const [error, setError] = useState(null);
    const handleCanvasReady = useCallback(async (base64) => {
        setJudging(true);
        try {
            const res = await judgeDrawing(base64, 'りんご');
            setResult(res);
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setJudging(false);
        }
    }, []);
    return (_jsxs("div", { className: "flex flex-col items-center min-h-screen bg-white p-6 gap-6", children: [_jsx("h2", { className: "text-2xl font-bold", children: "\u7D50\u679C" }), _jsx("div", { className: "w-64 h-64 border-2 border-gray-200 rounded-xl overflow-hidden", children: _jsx(TrailCanvas, { trail: trail, onReady: handleCanvasReady }) }), judging && _jsx("p", { className: "text-gray-500", children: "AI \u304C\u5224\u5B9A\u4E2D..." }), error && _jsx("p", { className: "text-red-500 text-sm", children: error }), result && (_jsxs("div", { className: "w-full max-w-sm bg-gray-50 rounded-2xl p-6 space-y-3", children: [_jsxs("div", { className: "text-center", children: [_jsx("span", { className: "text-6xl font-bold", children: result.score }), _jsx("span", { className: "text-2xl text-gray-400", children: "/100" })] }), _jsxs("p", { className: "text-center text-gray-700", children: ["AI\u306E\u7B54\u3048\uFF1A", _jsx("strong", { children: result.guess })] }), _jsx("p", { className: "text-sm text-gray-500", children: result.reason })] })), _jsx("button", { onClick: onRetry, className: "w-full max-w-sm py-4 border-2 border-black text-black text-lg font-semibold rounded-2xl", children: "\u3082\u3046\u4E00\u5EA6" })] }));
}
