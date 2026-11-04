import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./ai-test.css";
function AITestPage() {
    const [theme, setTheme] = useState("りんご");
    const [image, setImage] = useState("");
    const [filename, setFilename] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reading, setReading] = useState(false);
    const [error, setError] = useState("");
    const [records, setRecords] = useState([]);
    const readId = useRef(0);
    const busy = useRef(false);
    const current = records.filter(r => r.file === filename && r.theme === theme.trim());
    const scores = current.slice(-5).map(r => r.score);
    const spread = scores.length ? Math.max(...scores) - Math.min(...scores) : 0;
    async function handleFile(file) {
        const id = ++readId.current;
        setImage("");
        setFilename("");
        setResult(null);
        setError("");
        setRecords([]);
        setReading(false);
        if (!file)
            return;
        if (file.type !== "image/png") {
            setError("PNG画像を選択してください");
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            setError("3MB以下の画像にしてください");
            return;
        }
        setReading(true);
        try {
            const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
            if (![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => signature[i] === v)) {
                throw new Error("PNG画像の形式が不正です");
            }
            const data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result ?? ""));
                reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
                reader.readAsDataURL(file);
            });
            const preview = new Image();
            preview.src = data;
            await preview.decode();
            if (id === readId.current) {
                setImage(data);
                setFilename(file.name);
            }
        }
        catch (err) {
            if (id === readId.current)
                setError(err instanceof Error ? err.message : "画像を読み込めませんでした");
        }
        finally {
            if (id === readId.current)
                setReading(false);
        }
    }
    async function handleJudge() {
        if (busy.current || reading || !image || !theme.trim())
            return;
        busy.current = true;
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const { judgeDrawing } = await import("./lib/gemini");
            const value = await judgeDrawing({ theme: theme.trim(), imageBase64: image });
            setResult(value);
            setRecords(previous => [...previous, { ...value, file: filename, theme: theme.trim(), time: new Date().toISOString() }]);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "AI判定に失敗しました");
        }
        finally {
            busy.current = false;
            setLoading(false);
        }
    }
    function downloadRecords() {
        const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "ai-test-results.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return _jsxs("main", { children: [_jsx("h1", { children: "GPS\u304A\u7D75\u304B\u304D AI\u5224\u5B9A\u30C6\u30B9\u30C8" }), _jsx("p", { children: "\u5730\u56F3\u3084GPS\u3092\u4F7F\u308F\u305A\u3001PNG\u753B\u50CF\u3092Gemini\u3067\u63A1\u70B9\u3057\u307E\u3059\u3002" }), _jsxs("label", { children: ["\u304A\u984C", _jsx("input", { value: theme, disabled: loading, onChange: e => { setTheme(e.target.value); setResult(null); } })] }), _jsxs("label", { children: ["PNG\u753B\u50CF\uFF083MB\u4EE5\u4E0B\uFF09", _jsx("input", { type: "file", accept: "image/png", disabled: loading, onChange: e => void handleFile(e.target.files?.[0]) })] }), _jsx("p", { children: "\u767D\u80CC\u666F\u30FB\u9ED2\u7DDA\u30FB512\u00D7512px\u3092\u63A8\u5968\u3057\u307E\u3059\u3002\u753B\u50CF\u306E\u518D\u9078\u629E\u3067\u8A18\u9332\u306F\u30EA\u30BB\u30C3\u30C8\u3055\u308C\u307E\u3059\u3002" }), reading && _jsx("p", { role: "status", children: "\u753B\u50CF\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026" }), image && _jsxs("figure", { children: [_jsx("img", { src: image, alt: "\u63A1\u70B9\u3059\u308B\u7DDA\u753B" }), _jsx("figcaption", { children: filename })] }), _jsx("button", { onClick: () => void handleJudge(), disabled: loading || reading || !image || !theme.trim(), children: loading ? "AI判定中…" : "AIで採点する" }), _jsx("p", { children: "\u30AF\u30EA\u30C3\u30AF\u3054\u3068\u306BAPI\u30921\u56DE\u547C\u3073\u51FA\u3057\u307E\u3059\u3002\u5229\u7528\u67A0\u3092\u6D88\u8CBB\u3059\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002" }), error && _jsxs("p", { role: "alert", className: "error", children: ["\u30A8\u30E9\u30FC\uFF1A", error] }), _jsx("section", { "aria-live": "polite", "aria-busy": loading, children: result && _jsxs(_Fragment, { children: [_jsxs("h2", { children: ["\u63A1\u70B9\u7D50\u679C\uFF1A", result.score, "%"] }), _jsx("progress", { "aria-label": "\u5F97\u70B9", value: result.score, max: 100 }), _jsx("h3", { children: "AI\u304B\u3089\u306E\u30B3\u30E1\u30F3\u30C8" }), _jsx("p", { children: result.reason })] }) }), _jsxs("section", { children: [_jsx("h2", { children: "\u63A1\u70B9\u30D6\u30EC\u306E\u691C\u8A3C" }), _jsx("p", { children: "\u540C\u3058\u753B\u50CF\u30FB\u304A\u984C\u30925\u56DE\u63A1\u70B9\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u76F4\u8FD15\u56DE\u3092\u96C6\u8A08\u3057\u307E\u3059\u3002" }), _jsxs("p", { children: ["\u5B9F\u884C\u56DE\u6570\uFF1A", scores.length, "/5\u3000\u5E73\u5747\uFF1A", scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—", "%\u3000\u6700\u5927\u5DEE\uFF1A", scores.length ? spread : "—", "%"] }), scores.length === 5 && _jsx("p", { children: spread <= 10 ? "仮目標の最大差10点以内を達成しています。" : "最大差が10点を超えています。プロンプトを見直してください。" }), _jsx("p", { children: "\u3053\u306E\u76EE\u6A19\u306F\u518D\u73FE\u6027\u3092\u4FDD\u8A3C\u3059\u308B\u3082\u306E\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u8A18\u9332\u306F\u30DA\u30FC\u30B8\u3092\u9589\u3058\u308B\u3068\u6D88\u3048\u307E\u3059\u3002" }), _jsx("button", { disabled: !records.length, onClick: downloadRecords, children: "\u8A18\u9332\u3092JSON\u3067\u4FDD\u5B58" }), " ", _jsx("button", { disabled: loading || !records.length, onClick: () => setRecords([]), children: "\u8A18\u9332\u3092\u30AF\u30EA\u30A2" }), records.length > 0 && _jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u56DE" }), _jsx("th", { children: "\u304A\u984C" }), _jsx("th", { children: "\u5F97\u70B9" }), _jsx("th", { children: "\u7406\u7531" })] }) }), _jsx("tbody", { children: records.map((r, i) => _jsxs("tr", { children: [_jsx("td", { children: i + 1 }), _jsx("td", { children: r.theme }), _jsx("td", { children: r.score }), _jsx("td", { children: r.reason })] }, i)) })] }) })] })] });
}
createRoot(document.getElementById("root")).render(_jsx(AITestPage, {}));
