import { z } from "zod";

const NOTIFICATIONS_PAGE_SIZE = 20;

const NOTIFICATION_TYPES = [
  "ARRIVAL",
  "ARRIVAL_DELAYED",
  "ARRIVAL_CANCELLED",
  "PARKED",
  "PICKUP_REQUESTED",
  "PICKUP_RESPONDED",
  "PICKUP_COMPLETED",
] as const;

const notificationsCursorSchema = z.coerce.number().int().positive();

const notificationSchema = z.object({
  id: z.number().int(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  body: z.string(),
  valetSessionId: z.number().int().nullable(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

const notificationsResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  nextCursor: z.number().int().nullable(),
});

type NotificationType = (typeof NOTIFICATION_TYPES)[number];
type NotificationItem = z.infer<typeof notificationSchema>;
type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;

export {
  NOTIFICATIONS_PAGE_SIZE,
  NOTIFICATION_TYPES,
  notificationSchema,
  notificationsCursorSchema,
  notificationsResponseSchema,
};
export type { NotificationItem, NotificationType, NotificationsResponse };
