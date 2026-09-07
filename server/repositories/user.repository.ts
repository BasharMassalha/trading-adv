import { prisma } from "@/lib/prisma";
import type { Prisma, User } from "@prisma/client";

/**
 * Data-access layer for User. Keep this thin — no business logic.
 */
export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  /** Match email ignoring case (PostgreSQL). Use for OAuth where casing may differ. */
  findByEmailLoose(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  delete(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } });
  },

  async isGuestActive(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGuest: true, guestExpiresAt: true },
    });
    if (!user?.isGuest) return false;
    if (user.guestExpiresAt && user.guestExpiresAt.getTime() < Date.now()) {
      return false;
    }
    return true;
  },
};
