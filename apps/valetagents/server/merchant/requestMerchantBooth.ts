import "server-only";

import { Prisma, prisma } from "database";

import { getStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

import type { BoothRequestErrorCode } from "@/libs/merchant/contracts/booth-request";

type RequestMerchantBoothResult =
  | { ok: true }
  | { ok: false; reason: BoothRequestErrorCode | "MERCHANT_ADMIN_REQUIRED" };

const requestMerchantBooth = async (
  staffId: number,
  merchantId: number,
  boothId: number,
): Promise<RequestMerchantBoothResult> => {
  const onboarding = await getStaffOnboardingState(staffId);
  if (onboarding?.role !== "MERCHANT_ADMIN") return { ok: false, reason: "MERCHANT_ADMIN_REQUIRED" };
  if (onboarding.state === "COMPLETE") return { ok: false, reason: "MERCHANT_ALREADY_APPROVED" };
  if (onboarding.state !== "MERCHANT_APPROVAL_PENDING") {
    return { ok: false, reason: "MERCHANT_NOT_FOUND" };
  }

  try {
    return await prisma.$transaction(async (tx): Promise<RequestMerchantBoothResult> => {
      const merchant = await tx.merchant.findFirst({
        where: { id: merchantId, adminId: staffId, deletedAt: null },
        select: { id: true },
      });
      if (!merchant) return { ok: false, reason: "MERCHANT_NOT_FOUND" };

      const booth = await tx.booth.findFirst({
        where: { id: boothId, deletedAt: null },
        select: { id: true },
      });
      if (!booth) return { ok: false, reason: "BOOTH_NOT_FOUND" };

      const contract = await tx.boothMerchant.findUnique({
        where: { boothId_merchantId: { boothId, merchantId } },
        select: { status: true },
      });
      if (!contract) {
        await tx.boothMerchant.create({ data: { boothId, merchantId, status: "PENDING" } });
        return { ok: true };
      }

      const { count } = await tx.boothMerchant.updateMany({
        where: { boothId, merchantId, status: "REJECTED" },
        data: { status: "PENDING" },
      });
      return count === 1 ? { ok: true } : { ok: false, reason: "ALREADY_REQUESTED" };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, reason: "ALREADY_REQUESTED" };
    }
    throw error;
  }
};

export { requestMerchantBooth };
