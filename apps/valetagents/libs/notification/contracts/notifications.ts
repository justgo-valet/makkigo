import { z } from "zod";

const STAFF_NOTIFICATIONS_PAGE_SIZE = 20;

const staffNotificationsCursorSchema = z.coerce.number().int().positive();

const staffNotificationSchema = z.object({
  id: z.number().int(),
  type: z.enum([
    "ARRIVAL",
    "ARRIVAL_DELAYED",
    "ARRIVAL_CANCELLED",
    "PARKED",
    "PICKUP_REQUESTED",
    "PICKUP_RESPONDED",
    "PICKUP_COMPLETED",
  ]),
  title: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
});

const staffNotificationsResponseSchema = z.object({
  notifications: z.array(staffNotificationSchema),
  nextCursor: z.number().int().nullable(),
});

export { STAFF_NOTIFICATIONS_PAGE_SIZE, staffNotificationsCursorSchema, staffNotificationsResponseSchema };
export type StaffNotification = z.infer<typeof staffNotificationSchema>;
export type StaffNotificationsResponse = z.infer<typeof staffNotificationsResponseSchema>;
