import { Prisma, prisma } from "database";

import type { SocialIdentity } from "./oauth";

export const findOrCreateStaffBySocialIdentity = async (
  identity: SocialIdentity,
): Promise<{ staffId: number; isNewStaff: boolean }> => {
  const where = {
    provider_providerUserId: {
      provider: identity.provider,
      providerUserId: identity.providerUserId,
    },
  };
  const existing = await prisma.staffSocialAccount.findUnique({ where });

  if (existing) {
    if (identity.email && identity.email !== existing.email) {
      await prisma.staffSocialAccount.update({ where, data: { email: identity.email } });
    }
    return { staffId: existing.staffId, isNewStaff: false };
  }

  try {
    const staff = await prisma.staff.create({
      data: {
        socialAccounts: {
          create: {
            provider: identity.provider,
            providerUserId: identity.providerUserId,
            email: identity.email,
          },
        },
      },
    });
    return { staffId: staff.id, isNewStaff: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const created = await prisma.staffSocialAccount.findUniqueOrThrow({ where });
      return { staffId: created.staffId, isNewStaff: false };
    }
    throw error;
  }
};
