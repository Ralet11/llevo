import { NextFunction, Request, Response } from 'express'

function getClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for']

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim()
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]
  }

  return req.ip || req.socket.remoteAddress || 'unknown'
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint()
  const { method, originalUrl } = req
  const clientIp = getClientIp(req)

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    const contentLength = res.getHeader('content-length') || 0
    const timestamp = new Date().toISOString()

    console.log(
      `[${timestamp}] ${method} ${originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms ip=${clientIp} bytes=${contentLength}`,
    )
  })

  next()
}
