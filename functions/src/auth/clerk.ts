import type { Request } from 'express'
import { verifyToken } from '@clerk/backend'

import { HttpError } from '../errors.js'

export async function authenticate(request: Request): Promise<string | null> {
  const authorization = request.header('authorization')
  if (!authorization) return null
  if (!authorization.startsWith('Bearer ')) throw new HttpError(401, 'Invalid authorization header')
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) throw new HttpError(500, 'Clerk is not configured')

  try {
    const claims = await verifyToken(authorization.slice('Bearer '.length), { secretKey })
    if (!claims.sub) throw new HttpError(401, 'Invalid Clerk token')
    return claims.sub
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(401, 'Invalid Clerk token')
  }
}
