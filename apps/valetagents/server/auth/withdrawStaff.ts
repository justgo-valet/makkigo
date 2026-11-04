import "server-only";
import { ACTIVE_VALET_SESSION_STATUSES, prisma } from "database";

import { revokeAppleTokens } from "@/server/auth/revokeAppleTokens";

import type { WithdrawErrorCode } from "@/libs/auth/contracts/withdraw";

type WithdrawStaffResult = { ok: true } | { ok: false; reason: WithdrawErrorCode };

class ActiveValetSessionError extends Error {}

const withdrawStaff = async (staffId: number): Promise<WithdrawStaffResult> => {
  const now = new Date();
  const appleAccounts = await prisma.staffSocialAccount.findMany({
    where: { staffId, provider: "APPLE", providerRefreshToken: { not: null } },
    select: { providerRefreshToken: true, providerClientId: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
      const booths = await tx.booth.findMany({
        where: { creatorId: staffId, deletedAt: null },
        select: { id: true },
      });
      const merchants = await tx.merchant.findMany({
        where: { adminId: staffId, deletedAt: null },
        select: { id: true },
      });
      const boothIds = booths.map(({ id }) => id);
      const merchantIds = merchants.map(({ id }) => id);

      await tx.booth.updateMany({
        where: { id: { in: boothIds }, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.merchant.updateMany({
        where: { id: { in: merchantIds }, deletedAt: null },
        data: { deletedAt: now },
      });

      const activeSession = await tx.valetSession.findFirst({
        where: {
          status: { in: [...ACTIVE_VALET_SESSION_STATUSES] },
          OR: [
            { boothId: { in: boothIds } },
            { merchantId: { in: merchantIds } },
            {
              boothId: null,
              merchant: { booths: { some: { boothId: { in: boothIds }, status: "APPROVED" } } },
            },
          ],
        },
        select: { id: true },
      });

      if (activeSession) throw new ActiveValetSessionError();

      await tx.staffSocialAccount.deleteMany({ where: { staffId } });
      await tx.staffLoginCode.deleteMany({ where: { staffId } });
      await tx.pushDevice.deleteMany({ where: { staffId } });
      await tx.notification.deleteMany({ where: { staffId } });
      await tx.staffRefreshToken.updateMany({
        where: { staffId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.staff.update({
        where: { id: staffId },
        data: { deletedAt: now, name: null, phone: null },
      });
    });
  } catch (error) {
    if (error instanceof ActiveValetSessionError) {
      return { ok: false, reason: "ACTIVE_VALET_SESSION" };
    }
    throw error;
  }

  // 데이터를 다 지운 뒤에 애플에 연결 해제를 요청한다 (App Store 심사 5.1.1(v)).
  await revokeAppleTokens(appleAccounts);

  return { ok: true };
};

export { withdrawStaff };
