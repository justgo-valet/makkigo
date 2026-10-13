"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";

import NotificationIcon from "@/features/notification/components/NotificationIcon";
import NotificationItem from "@/features/notification/components/NotificationItem";

import type {
  NotificationListItem,
  NotificationSheetView,
} from "@/features/notification/hooks/useNotificationSheet";

interface NotificationSheetProps {
  open: boolean;
  onClose: () => void;
  view: NotificationSheetView;
  items: NotificationListItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadMoreRef: (element: HTMLElement | null) => void;
  errorMessage: string | null;
  onRetry: () => void;
}

export default function NotificationSheet({
  open,
  onClose,
  view,
  items,
  hasNextPage,
  isFetchingNextPage,
  loadMoreRef,
  errorMessage,
  onRetry,
}: Readonly<NotificationSheetProps>) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto h-[82dvh] max-w-md gap-0 rounded-t-2xl"
      >
        <div aria-hidden className="mx-auto mt-3 h-1 w-9 rounded-full bg-border" />
        <SheetHeader className="px-5 pt-4 pb-3">
          <SheetTitle className="text-lg font-bold text-(--base-color)">알림</SheetTitle>
          <SheetDescription className="sr-only">받은 알림을 최신순으로 보여줘요.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {view === "list" ? (
            <>
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <NotificationItem item={item} />
                  </li>
                ))}
              </ul>
              {hasNextPage && (
                <div ref={loadMoreRef} className="py-4 text-center text-xs text-(--tertiary-color)">
                  {isFetchingNextPage ? "불러오고 있어요" : ""}
                </div>
              )}
            </>
          ) : view === "empty" ? (
            <div className="flex flex-col items-center gap-3 pt-20 text-(--tertiary-color)">
              <NotificationIcon name="bell" className="size-8" />
              <p className="text-sm">아직 알림이 없어요</p>
            </div>
          ) : view === "error" ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <FieldError className="text-center">{errorMessage}</FieldError>
              <Button variant="outline" onClick={onRetry}>
                다시 시도
              </Button>
            </div>
          ) : (
            <output className="block py-10 text-center text-sm text-(--tertiary-color)">
              불러오고 있어요
            </output>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
