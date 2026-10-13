import "server-only";

import { prisma } from "database";

import { selectCurrentFeePolicy } from "@/server/booth/currentFeePolicy";
import { serializeRequest } from "@/server/booth/serializeBooth";

import type {
  OnboardingState,
  OnboardingStatusResponse,
  StaffRole,
} from "@/libs/onboarding/contracts/status";
import type { BoothAgentStatus, BoothMerchantStatus } from "database";

const STATUS_ORDER: Record<BoothAgentStatus, number> = {
  REQUESTED: 0,
  REJECTED: 1,
  APPROVED: 2,
};

const deriveOnboardingState = (
  role: StaffRole | null,
  requestStatuses: BoothAgentStatus[],
  merchantBoothStatuses: BoothMerchantStatus[][] = [],
): OnboardingState => {
  if (role === null) return "ROLE_REQUIRED";
  if (role === "MERCHANT_ADMIN") {
    if (merchantBoothStatuses.length === 0) return "MERCHANT_REGISTRATION_REQUIRED";
    return merchantBoothStatuses.some((statuses) => statuses.includes("APPROVED"))
      ? "COMPLETE"
      : "MERCHANT_APPROVAL_PENDING";
  }
  if (requestStatuses.includes("APPROVED")) return "COMPLETE";
  return requestStatuses.length > 0 ? "AWAITING_APPROVAL" : "BOOTH_REQUIRED";
};

const getStaffOnboardingState = async (
  staffId: number,
): Promise<OnboardingStatusResponse | null> => {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, deletedAt: null },
    select: {
      role: true,
      boothMemberships: {
        where: { booth: { deletedAt: null } },
        select: {
          id: true,
          status: true,
          workStartTime: true,
          workEndTime: true,
          createdAt: true,
          updatedAt: true,
          booth: {
            select: {
              id: true,
              name: true,
              address: true,
              addressDetail: true,
              feePolicies: selectCurrentFeePolicy(new Date()),
            },
          },
        },
      },
      merchants: {
        where: { deletedAt: null },
        select: {
          booths: {
            where: { booth: { deletedAt: null } },
            select: { status: true },
          },
        },
      },
    },
  });

  if (!staff) return null;

  const memberships = [...staff.boothMemberships].sort(
    (left, right) =>
      STATUS_ORDER[left.status] - STATUS_ORDER[right.status] ||
      right.updatedAt.getTime() - left.updatedAt.getTime() ||
      right.id - left.id,
  );
  const state = deriveOnboardingState(
    staff.role,
    memberships.map(({ status }) => status),
    staff.merchants.map(({ booths }) => booths.map(({ status }) => status)),
  );

  return {
    role: staff.role,
    state,
    nextPath: state === "COMPLETE" ? "/" : "/onboarding",
    requests: staff.role === "VALET_AGENT" ? memberships.map(serializeRequest) : [],
  };
};

export { deriveOnboardingState, getStaffOnboardingState };
