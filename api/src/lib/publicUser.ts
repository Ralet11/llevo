import { Prisma } from '@prisma/client'

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  isVerified: true,
  rating: true,
  ratingCount: true,
  createdAt: true,
  phoneVerifiedAt: true,
  driverVerificationStatus: true,
  driverVerificationSessionId: true,
  driverVerificationUrl: true,
  driverVerifiedAt: true,
} satisfies Prisma.UserSelect

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>
