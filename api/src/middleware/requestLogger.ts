import { randomUUID } from 'crypto'
import { NextFunction, Request, Response } from 'express'

type RequestWithUser = Request & { userId?: string; requestId?: string }

function log(level: 'info' | 'warn' | 'error', event: string, fields: Record<string, unknown>) {
  console[level](`[http] ${event} ${JSON.stringify(fields)}`)
}

export function requestLogger(req: RequestWithUser, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint()
  const requestId = randomUUID()
  req.requestId = requestId

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'

    log(level, 'request', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.userId ? req.userId.slice(0, 8) : undefined,
    })
  })

  next()
}
