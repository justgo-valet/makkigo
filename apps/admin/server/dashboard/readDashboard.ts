import "server-only";

import { ACTIVE_VALET_SESSION_STATUSES, prisma } from "database";

const startOfSeoulDay = (now: Date) => {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
  return new Date(`${day}T00:00:00+09:00`);
};

export const readDashboard = async () => {
  const [merchants, merchantAdmins, booths, approvedAgents, users, todaySessions, activeSessions, pendingRequests, pendingAccountRequests, recentSessions] =
    await prisma.$transaction([
      prisma.merchant.count({ where: { deletedAt: null } }),
      prisma.merchantAdmin.count({ where: { disabledAt: null } }),
      prisma.booth.count({ where: { deletedAt: null } }),
      prisma.staff.count({
        where: { deletedAt: null, boothMemberships: { some: { status: "APPROVED", booth: { deletedAt: null } } } },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.valetSession.count({ where: { createdAt: { gte: startOfSeoulDay(new Date()) } } }),
      prisma.valetSession.count({ where: { status: { in: [...ACTIVE_VALET_SESSION_STATUSES] } } }),
      prisma.boothMerchant.count({ where: { status: "PENDING", booth: { deletedAt: null }, merchant: { deletedAt: null } } }),
      prisma.merchantAccountRequest.count({ where: { status: "PENDING" } }),
      prisma.valetSession.findMany({
        orderBy: { id: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          plateNumber: true,
          createdAt: true,
          merchant: { select: { name: true } },
          booth: { select: { name: true } },
        },
      }),
    ]);
  return {
    counts: { merchants, merchantAdmins, booths, approvedAgents, users, todaySessions, activeSessions, pendingRequests, pendingAccountRequests },
    recentSessions,
  };
};
