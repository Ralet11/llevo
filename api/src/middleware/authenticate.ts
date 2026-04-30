import { Request, Response, NextFunction } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import jwt from 'jsonwebtoken'
import type { ParsedQs } from 'qs'
import { AppError } from './errorHandler'

export interface AuthRequest<
  P = ParamsDictionary,
  ReqBody = any,
  ReqQuery = ParsedQs,
> extends Request<P, any, ReqBody, ReqQuery> {
  userId?: string
}

export function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Token requerido', 401))
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    req.userId = payload.userId
    next()
  } catch {
    next(new AppError('Token inválido o expirado', 401))
  }
}
