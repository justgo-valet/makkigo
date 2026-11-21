"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@makkigo/ui/components/ui/sheet";
import { Switch } from "@makkigo/ui/components/ui/switch";
import { BellIcon, CarFrontIcon, ClockIcon, MapPinIcon, XCircleIcon } from "lucide-react";

import { useStaffNotifications } from "./useStaffNotifications";

import type { StaffNotification } from "@/libs/notification/contracts/notifications";

const TYPE_STYLES: Partial<Record<StaffNotification["type"], { icon: typeof BellIcon; className: string }>> = {
  ARRIVAL: { icon: MapPinIcon, className: "bg-[#ffeda6] text-[#8a6d00]" },
  ARRIVAL_DELAYED: { icon: ClockIcon, className: "bg-amber-100 text-amber-700" },
  ARRIVAL_CANCELLED: { icon: XCircleIcon, className: "bg-slate-100 text-slate-500" },
  PICKUP_REQUESTED: { icon: CarFrontIcon, className: "bg-red-50 text-red-500" },
};
const DEFAULT_STYLE = { icon: BellIcon, className: "bg-primary/10 text-primary" };

const seoulDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });
const seoulTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const seoulDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

const formatNotificationTime = (iso: string, now: Date) => {
  const at = new Date(iso);
  return seoulDay.format(at) === seoulDay.format(now)
    ? seoulTime.format(at)
    : `${seoulDate.format(at)} ${seoulTime.format(at)}`;
};

interface NotificationSheetProps {
  staffId: number;
  open: boolean;
  enabled: boolean;
  hasWorkTime: boolean;
  isToggling: boolean;
  toggleErrorMessage: string | null;
  onToggle: (next: boolean) => void;
  onClose: () => void;
}

export default function NotificationSheet({
  staffId,
  open,
  enabled,
  hasWorkTime,
  isToggling,
  toggleErrorMessage,
  onToggle,
  onClose,
}: Readonly<NotificationSheetProps>) {
  const list = useStaffNotifications(staffId, open);
  const checked = isToggling ? !enabled : enabled;
  const now = new Date();

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto h-[82dvh] max-w-md gap-0 rounded-t-2xl">
        <div aria-hidden className="mx-auto mt-3 h-1 w-9 rounded-full bg-border" />
        <SheetHeader className="px-5 pt-4 pb-3">
          <SheetTitle className="text-lg font-bold text-(--base-color)">알림</SheetTitle>
          <SheetDescription className="sr-only">알림을 켜거나 끄고, 받은 알림을 최신순으로 봐요.</SheetDescription>
        </SheetHeader>

        <div className="mx-4 rounded-xl border bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="staff-notifications-enabled" className="text-base font-semibold text-(--base-color)">
              알림 받기
            </label>
            <Switch
              id="staff-notifications-enabled"
              checked={checked}
              disabled={isToggling}
              onCheckedChange={onToggle}
              className="h-7 w-12 [&>span]:size-6 [&>span]:data-[state=checked]:translate-x-5"
            />
          </div>
          {hasWorkTime && (
            <p className="mt-1 text-xs break-keep text-(--tertiary-color)">
              {checked ? "다음 퇴근 시간에 자동으로 꺼져요" : "다음 출근 시간에 자동으로 켜져요"}
            </p>
          )}
          {toggleErrorMessage && <FieldError className="mt-2">{toggleErrorMessage}</FieldError>}
        </div>

        <h3 className="mt-5 px-5 text-sm font-semibold text-(--tertiary-color)">받은 알림</h3>
        <div className="mt-2 flex-1 overflow-y-auto px-4 pb-6">
          {list.errorMessage ? (
            <div className="flex flex-col items-center gap-3 pt-12">
              <FieldError>{list.errorMessage}</FieldError>
              <Button type="button" variant="outline" onClick={list.retry}>
                다시 불러오기
              </Button>
            </div>
          ) : list.isLoading ? (
            <p className="pt-12 text-center text-sm text-(--tertiary-color)">불러오고 있어요</p>
          ) : list.notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 pt-12 text-(--tertiary-color)">
              <BellIcon aria-hidden className="size-8" />
              <p className="text-sm">아직 받은 알림이 없어요</p>
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {list.notifications.map((notification) => {
                  const style = TYPE_STYLES[notification.type] ?? DEFAULT_STYLE;
                  const Icon = style.icon;
                  return (
                    <li key={notification.id}>
                      <article className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3.5">
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", style.className)}>
                          <Icon aria-hidden className="size-[18px]" />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <h4 className="text-sm font-bold break-keep text-(--base-color)">{notification.title}</h4>
                          <p className="text-xs leading-snug break-keep text-(--tertiary-color)">{notification.body}</p>
                        </div>
                        <time dateTime={notification.createdAt} className="shrink-0 text-xs text-(--tertiary-color) tabular-nums">
                          {formatNotificationTime(notification.createdAt, now)}
                        </time>
                      </article>
                    </li>
                  );
                })}
              </ul>
              {list.hasNextPage && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-3 w-full text-(--tertiary-color)"
                  disabled={list.isFetchingNextPage}
                  onClick={list.loadMore}
                >
                  {list.isFetchingNextPage ? "불러오고 있어요" : "더 보기"}
                </Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
