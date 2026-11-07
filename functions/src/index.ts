import { onRequest } from 'firebase-functions/v2/https'

import { handleDrawings } from './routes/drawings.js'

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
    ],
  },
  async (request, response) => {
    await handleDrawings(request, response)
  },
)
