"use client";

import Image from "next/image";

import NotificationSheet from "@/features/notification/components/NotificationSheet";
import { useNotificationSheet } from "@/features/notification/hooks/useNotificationSheet";

export default function NotificationBellButton() {
  const notificationSheet = useNotificationSheet();

  return (
    <>
      <button
        type="button"
        aria-label="알림"
        className="cursor-pointer"
        onClick={notificationSheet.open}
      >
        <Image src="/icons/alarm.svg" alt="" aria-hidden="true" width={24} height={24} />
      </button>
      <NotificationSheet
        open={notificationSheet.isOpen}
        onClose={notificationSheet.close}
        view={notificationSheet.view}
        items={notificationSheet.items}
        hasNextPage={notificationSheet.hasNextPage}
        isFetchingNextPage={notificationSheet.isFetchingNextPage}
        loadMoreRef={notificationSheet.loadMoreRef}
        errorMessage={notificationSheet.errorMessage}
        onRetry={notificationSheet.retry}
      />
    </>
  );
}
