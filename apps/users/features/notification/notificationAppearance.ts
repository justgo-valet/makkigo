import type { NotificationType } from "@/libs/notification/contracts/notifications";

type NotificationIconName = "check" | "clock" | "mapPin" | "car" | "x";
type NotificationTone = "primary" | "warning" | "danger";

const NOTIFICATION_APPEARANCES: Record<
  NotificationType,
  { icon: NotificationIconName; tone: NotificationTone }
> = {
  ARRIVAL: { icon: "mapPin", tone: "primary" },
  ARRIVAL_DELAYED: { icon: "clock", tone: "warning" },
  ARRIVAL_CANCELLED: { icon: "x", tone: "danger" },
  PARKED: { icon: "car", tone: "primary" },
  PICKUP_REQUESTED: { icon: "car", tone: "primary" },
  PICKUP_RESPONDED: { icon: "clock", tone: "warning" },
  PICKUP_COMPLETED: { icon: "check", tone: "primary" },
};

export { NOTIFICATION_APPEARANCES };
export type { NotificationIconName, NotificationTone };
