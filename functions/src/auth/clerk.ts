import type { Request } from 'express'

import { clerk } from '../config.js'
import { HttpError } from '../errors.js'

export async function authenticate(request: Request): Promise<string | null> {
  const authorization = request.header('authorization')
  if (!authorization) return null
  if (!authorization.startsWith('Bearer ')) throw new HttpError(401, 'Invalid authorization header')
  if (!clerk) throw new HttpError(500, 'Clerk is not configured')

  try {
    const clerkRequest = new globalThis.Request(`https://${request.get('host')}${request.originalUrl}`, {
      headers: { authorization },
    })
    const session = await clerk.authenticateRequest(clerkRequest)
    if (!session.isSignedIn) throw new HttpError(401, 'Invalid Clerk token')
    return session.toAuth().userId
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(401, 'Invalid Clerk token')
  }
}
