import type { Response } from 'express'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export function send(response: Response, status: number, body?: unknown): void {
  if (status === 204) {
    response.status(status).send()
    return
  }
  response.status(status).json(body)
}

export function sendError(response: Response, error: unknown): void {
  const status = error instanceof HttpError ? error.status : 500
  const message = error instanceof HttpError ? error.message : 'Internal server error'
  if (status >= 500) console.error(error)
  send(response, status, { error: message })
}
