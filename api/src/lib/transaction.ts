import { Prisma } from '@prisma/client'
import prisma from './prisma'
import { AppError } from '../middleware/errorHandler'

export async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') throw error
    }
  }
  throw new AppError('La operación cambió. Actualizá y volvé a intentar.', 409)
}
