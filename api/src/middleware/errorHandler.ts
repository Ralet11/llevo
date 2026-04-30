import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    console.error(`[request-error] ${req.method} ${req.originalUrl} -> ${err.statusCode} ${err.message}`)
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  console.error(`[request-error] ${req.method} ${req.originalUrl} -> 500`, err)
  res.status(500).json({ error: 'Error interno del servidor' })
}
