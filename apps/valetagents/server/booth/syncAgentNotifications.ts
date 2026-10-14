import "server-only";

import { prisma } from "database";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const SEOUL_OFFSET_MS = 9 * 60 * MINUTE_MS;
const LOOKBACK_MS = 10 * MINUTE_MS;

const latestBoundary = (workTime: Date, now: Date) => {
  const minutes = workTime.getUTCHours() * 60 + workTime.getUTCMinutes();
  const seoulMidnight =
    Math.floor((now.getTime() + SEOUL_OFFSET_MS) / DAY_MS) * DAY_MS - SEOUL_OFFSET_MS;
  const today = seoulMidnight + minutes * MINUTE_MS;
  return new Date(today <= now.getTime() ? today : today - DAY_MS);
};

const syncAgentNotifications = async (now = new Date()) => {
  const agents = await prisma.boothAgent.findMany({
    where: {
      status: "APPROVED",
      workStartTime: { not: null },
      workEndTime: { not: null },
      staff: { deletedAt: null },
      booth: { deletedAt: null },
    },
    select: { id: true, workStartTime: true, workEndTime: true },
  });

  let switchedOn = 0;
  let switchedOff = 0;

  for (const { id, workStartTime, workEndTime } of agents) {
    if (!workStartTime || !workEndTime || workStartTime.getTime() === workEndTime.getTime()) continue;

    const start = latestBoundary(workStartTime, now);
    const end = latestBoundary(workEndTime, now);
    const enabled = start > end;
    const boundary = enabled ? start : end;
    if (now.getTime() - boundary.getTime() >= LOOKBACK_MS) continue;

    const { count } = await prisma.boothAgent.updateMany({
      where: { id, notificationsEnabled: !enabled, updatedAt: { lt: boundary } },
      data: { notificationsEnabled: enabled },
    });
    if (enabled) switchedOn += count;
    else switchedOff += count;
  }

  return { switchedOn, switchedOff };
};

export { syncAgentNotifications };
