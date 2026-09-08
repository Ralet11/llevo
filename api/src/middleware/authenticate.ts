import { Request, Response, NextFunction } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import { accessUserId, requireActiveUser } from '../lib/access'
import type { ParsedQs } from 'qs'
import { AppError } from './errorHandler'

export interface AuthRequest<
  P = ParamsDictionary,
  ReqBody = any,
  ReqQuery = ParsedQs,
> extends Request<P, any, ReqBody, ReqQuery> {
  userId?: string
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Token requerido', 401))
  }

  const token = authHeader.split(' ')[1]
  try {
    const userId = accessUserId(token)
    await requireActiveUser(userId)
    req.userId = userId
    next()
  } catch (err) {
    next(err instanceof AppError ? err : new AppError('Token inválido o expirado', 401))
  }
}
