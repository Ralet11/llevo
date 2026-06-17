import { Request, Response, NextFunction } from 'express'

type Entry = { count: number; firstAt: number }
const store = new Map<string, Entry>()

// Purge stale entries every 10 minutes so the Map doesn't grow indefinitely
setInterval(() => {
  const horizon = Date.now() - 60 * 60 * 1000 // entries older than 1 hour
  for (const [key, entry] of store) {
    if (entry.firstAt < horizon) store.delete(key)
  }
}, 10 * 60 * 1000).unref()

export function rateLimit(maxRequests: number, windowMs: number, message?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip ?? 'anon'}:${req.path}`
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || now - entry.firstAt > windowMs) {
      store.set(key, { count: 1, firstAt: now })
      return next()
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({ error: message ?? 'Demasiados intentos. Esperá unos minutos.' })
      return
    }

    entry.count++
    next()
  }
}
