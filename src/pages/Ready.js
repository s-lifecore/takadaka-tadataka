import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export function Ready({ onCancel, onStart }) {
    const [count, setCount] = useState(3);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (count === 1)
                onStart();
            else
                setCount(count - 1);
        }, 1000);
        return () => window.clearTimeout(timer);
    }, [count, onStart]);
    return (_jsxs("main", { className: "ready-page", children: [_jsxs("header", { className: "ready-header", children: [_jsx("button", { type: "button", onClick: onCancel, children: "\u3082\u3069\u308B" }), _jsx("span", { children: "\u51FA\u767A\u306E\u6E96\u5099" })] }), _jsxs("div", { className: "ready-heading", children: [_jsx("span", { className: "ready-mode", children: "\u3072\u3068\u308A\u3067\u904A\u3076" }), _jsx("h1", { children: "\u307E\u3082\u306A\u304F\u51FA\u767A\uFF01" }), _jsx("p", { children: "\u6E96\u5099\u304C\u3067\u304D\u305F\u3089\u3001\u6B69\u304D\u59CB\u3081\u3088\u3046" })] }), _jsxs("section", { className: "ready-countdown", "aria-label": "\u8A18\u9332\u958B\u59CB\u307E\u3067\u306E\u30AB\u30A6\u30F3\u30C8\u30C0\u30A6\u30F3", role: "status", "aria-live": "polite", "aria-atomic": "true", children: [_jsx("strong", { children: count }), _jsx("p", { children: "\u79D2\u5F8C\u306B\u8A18\u9332\u304C\u30B9\u30BF\u30FC\u30C8\uFF01" })] }), _jsx("aside", { className: "ready-safety", children: _jsxs("p", { children: ["\u7ACB\u3061\u6B62\u307E\u3063\u305F\u72B6\u614B\u3067\u958B\u59CB\u3057\u3088\u3046\u3002", _jsx("br", {}), "\u79FB\u52D5\u4E2D\u306F\u753B\u9762\u3092\u64CD\u4F5C\u3057\u306A\u3044\u3067\u306D\u3002"] }) }), _jsx("footer", { className: "ready-footer", children: _jsx("p", { children: "\u3053\u306E\u753B\u9762\u306F3 \u2192 2 \u2192 1\u3067\u81EA\u52D5\u7684\u306B\u5207\u308A\u66FF\u308F\u308A\u307E\u3059" }) })] }));
}
