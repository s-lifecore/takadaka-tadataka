"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const drawings_js_1 = require("./routes/drawings.js");
const judging_js_1 = require("./routes/judging.js");
function normalizedPath(path) {
    const parts = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    return parts[0] === 'api' ? parts.slice(1) : parts;
}
exports.api = (0, https_1.onRequest)({
    region: 'asia-northeast1',
    cors: true,
    maxInstances: 10,
    secrets: [
        'CLERK_SECRET_KEY',
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
        'CLOUDINARY_UPLOAD_PRESET',
        'GROQ_API_KEY',
    ],
}, async (request, response) => {
    const path = normalizedPath(request.path);
    if (path[0] === 'judge-drawing') {
        await (0, judging_js_1.handleJudging)(request, response);
        return;
    }
    await (0, drawings_js_1.handleDrawings)(request, response);
});
