import type { NotificationItem } from "@/libs/notification/contracts/notifications";
import type { CurrentSession, CurrentSessionStatus } from "@/libs/valet/contracts/currentSession";

const WATCHED_SESSION_STATUSES = new Set<CurrentSessionStatus>([
  "PARKED",
  "PICKUP_REQUESTED",
  "PICKUP_PREPARING",
]);

const shouldWatchExit = (session: CurrentSession) => WATCHED_SESSION_STATUSES.has(session.status);

const hasExitCompletedNotice = (notifications: NotificationItem[], sessionId: number | undefined) =>
  notifications.some(
    (notification) =>
      notification.type === "PICKUP_COMPLETED" && notification.valetSessionId === sessionId,
  );

export { hasExitCompletedNotice, shouldWatchExit };
