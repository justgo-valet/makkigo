import "server-only";

import { prisma } from "database";

import { findApprovedMembership } from "@/server/booth/boothAgent";

import type { MenuAccess } from "@/libs/auth/menuItems";

const getStaffMenuAccess = async (staffId: number): Promise<MenuAccess | null> => {
  const [staff, membership] = await Promise.all([
    prisma.staff.findFirst({
      where: { id: staffId, deletedAt: null },
      select: {
        role: true,
        createdBooths: {
          where: { deletedAt: null },
          orderBy: { id: "asc" },
          take: 1,
          select: { id: true },
        },
      },
    }),
    findApprovedMembership(staffId),
  ]);

  if (!staff) return null;
  return {
    staffId,
    role: staff.role,
    managedBoothId: staff.createdBooths[0]?.id ?? null,
    agentBoothId: membership?.boothId ?? null,
  };
};

export { getStaffMenuAccess };
