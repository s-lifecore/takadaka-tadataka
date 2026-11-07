import { onRequest } from 'firebase-functions/v2/https'

import { handleDrawings } from './routes/drawings.js'
import { handleJudging } from './routes/judging.js'

function normalizedPath(path: string): string[] {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  return parts[0] === 'api' ? parts.slice(1) : parts
}

export const api = onRequest(
  {
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
  },
  async (request, response) => {
    const path = normalizedPath(request.path)
    if (path[0] === 'judge-drawing') {
      await handleJudging(request, response)
      return
    }
    await handleDrawings(request, response)
  },
)
