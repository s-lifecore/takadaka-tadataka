"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const drawings_js_1 = require("./routes/drawings.js");
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
    ],
}, async (request, response) => {
    await (0, drawings_js_1.handleDrawings)(request, response);
});
