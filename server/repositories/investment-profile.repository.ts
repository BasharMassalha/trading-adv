import { prisma } from "@/lib/prisma";
import type { UserInvestmentProfile, Prisma } from "@prisma/client";

export const investmentProfileRepository = {
  findByUserId(userId: string): Promise<UserInvestmentProfile | null> {
    return prisma.userInvestmentProfile.findUnique({
      where: { userId },
    });
  },

  upsert(
    userId: string,
    data: Omit<
      Prisma.UserInvestmentProfileCreateInput,
      "user"
    >,
  ): Promise<UserInvestmentProfile> {
    return prisma.userInvestmentProfile.upsert({
      where: { userId },
      create: {
        user: { connect: { id: userId } },
        ...data,
      },
      update: data,
    });
  },

  delete(userId: string) {
    return prisma.userInvestmentProfile.delete({
      where: { userId },
    });
  },
};
