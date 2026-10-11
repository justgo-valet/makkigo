import { cn } from "@makkigo/ui";

import NotificationIcon from "@/features/notification/components/NotificationIcon";

import type { NotificationListItem } from "@/features/notification/hooks/useNotificationSheet";
import type { NotificationTone } from "@/features/notification/notificationAppearance";

const UNREAD_TONE_CLASSES: Record<NotificationTone, string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-50 text-red-500",
};

interface NotificationItemProps {
  item: NotificationListItem;
}

export default function NotificationItem({ item }: Readonly<NotificationItemProps>) {
  return (
    <article
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3.5 py-3.5",
        item.isUnread ? "border-slate-200 bg-white shadow-sm" : "border-slate-100 bg-white",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          item.isUnread ? UNREAD_TONE_CLASSES[item.tone] : "bg-slate-100 text-slate-600",
        )}
      >
        <NotificationIcon name={item.icon} className="size-[18px]" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3
          className={cn(
            "text-sm break-keep",
            item.isUnread ? "font-bold text-(--base-color)" : "font-medium text-slate-700",
          )}
        >
          {item.isUnread && <span className="sr-only">읽지 않음, </span>}
          {item.title}
        </h3>
        <p
          className={cn(
            "text-xs leading-snug break-keep",
            item.isUnread ? "text-(--tertiary-color)" : "text-slate-400",
          )}
        >
          {item.body}
        </p>
      </div>
      <span className="shrink-0 self-center text-xs text-(--tertiary-color)">{item.timeLabel}</span>
    </article>
  );
}
