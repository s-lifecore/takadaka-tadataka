import { jsxs as _jsxs } from "react/jsx-runtime";
export function Timer({ remaining }) {
    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
    const s = (remaining % 60).toString().padStart(2, '0');
    const urgent = remaining <= 60;
    return (_jsxs("div", { className: `text-4xl font-mono font-bold tabular-nums ${urgent ? 'text-red-500' : 'text-gray-800'}`, children: [m, ":", s] }));
}
