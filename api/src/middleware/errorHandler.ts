import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

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
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  if (err instanceof ZodError) {
    const message = err.errors.map(e => e.message).join(', ')
    res.status(400).json({ error: message })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025: record not found (e.g., update on deleted record)
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Recurso no encontrado' })
      return
    }
    // P2002: unique constraint violation
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un registro con esos datos' })
      return
    }
    console.error('[prisma]', err.code, err.message)
    res.status(500).json({ error: 'Error de base de datos' })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
}
