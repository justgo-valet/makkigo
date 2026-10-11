import "server-only";
import { prisma } from "database";

const readAllNotifications = async (userId: number) => {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
};

export { readAllNotifications };
