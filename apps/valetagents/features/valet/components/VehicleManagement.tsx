"use client";

import { Button, cn } from "@makkigo/ui";
import { useState } from "react";

import AppHeader from "@/components/layouts/AppHeader";

import { useAddVehicle } from "../hooks/useAddVehicle";
import { useBoothValetSessions } from "../hooks/useBoothValetSessions";
import { useCompletePickup } from "../hooks/useCompletePickup";
import { useNotificationToggle } from "../hooks/useNotificationToggle";
import { useParkValetSession } from "../hooks/useParkValetSession";

import AddVehicleSheet from "./AddVehicleSheet";
import NotificationToggleSheet from "./NotificationToggleSheet";
import PlateConfirmSheet from "./PlateConfirmSheet";
import VehicleBoard from "./VehicleBoard";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { BoothValetSession, BoothValetSessionListResponse } from "../schemas/sessions";

interface VehicleManagementProps {
  staffId: number;
  boothId: number;
  initialData: BoothValetSessionListResponse;
  initialDataUpdatedAt: number;
  hasWorkTime: boolean;
  menu: MenuAccess;
}

export default function VehicleManagement({
  staffId,
  boothId,
  initialData,
  initialDataUpdatedAt,
  hasWorkTime,
  menu,
}: Readonly<VehicleManagementProps>) {
  const { sessions, completedCount, notificationsEnabled, updatedAt, errorMessage } = useBoothValetSessions({
    staffId,
    boothId,
    initialData,
    initialDataUpdatedAt,
  });
  const pickupRequest = sessions.find(({ status }) => status === "PICKUP_REQUESTED");
  const [parkTarget, setParkTarget] = useState<BoothValetSession | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const parking = useParkValetSession({ staffId, boothId, onParked: () => setParkTarget(null) });
  const adding = useAddVehicle({ staffId, boothId, onAdded: () => setAddOpen(false) });

  const notifications = useNotificationToggle({ staffId, boothId, enabled: notificationsEnabled });
  const [completeTarget, setCompleteTarget] = useState<BoothValetSession | null>(null);
  const completing = useCompletePickup({
    staffId,
    boothId,
    onCompleted: () => setCompleteTarget(null),
  });

  const selectSession = (session: BoothValetSession) => {
    if (session.status === "ARRIVING") {
      parking.resetError();
      setParkTarget(session);
    } else if (session.status === "PICKUP_REQUESTED" || session.status === "PICKUP_PREPARING") {
      completing.resetError();
      setCompleteTarget(session);
    }
  };

  return (
    <div
      className={cn(
        "mx-auto flex min-h-full w-full max-w-md flex-col",
        pickupRequest && "animate-pickup-blink motion-reduce:animate-none",
      )}
    >
      <AppHeader
        menu={menu}
        home
        notificationsEnabled={notificationsEnabled}
        onBellClick={notifications.openSheet}
      />

      <VehicleBoard
        sessions={sessions}
        completedCount={completedCount}
        updatedAt={updatedAt}
        errorMessage={errorMessage}
        onSelectSession={selectSession}
      />

      <div className="mt-auto pt-6">
        <Button
          type="button"
          size="xl"
          className="h-15 w-full rounded-[18px] text-[19px] font-bold"
          onClick={() => {
            adding.resetError();
            setAddOpen(true);
          }}
        >
          <svg
            viewBox="0 0 22 22"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            aria-hidden="true"
            className="size-5.5"
          >
            <path d="M11 4.6v12.8M4.6 11h12.8" />
          </svg>
          차량 추가하기
        </Button>
      </div>

      <PlateConfirmSheet
        title="주차 완료"
        description="확인을 누르면 이 차량을 주차 완료로 처리해요."
        plateNumber={parkTarget?.plateNumber ?? null}
        isPending={parking.isParking}
        errorMessage={parking.errorMessage}
        onConfirm={() => parkTarget && parking.park(parkTarget.id)}
        onClose={() => !parking.isParking && setParkTarget(null)}
      />
      <PlateConfirmSheet
        title="출차 완료"
        description="확인을 누르면 이 차량을 출차 완료로 처리해요."
        plateNumber={completeTarget?.plateNumber ?? null}
        isPending={completing.isCompleting}
        errorMessage={completing.errorMessage}
        onConfirm={() => completeTarget && completing.complete(completeTarget.id)}
        onClose={() => !completing.isCompleting && setCompleteTarget(null)}
      />
      <NotificationToggleSheet
        open={notifications.open}
        enabled={notifications.sheetEnabled}
        hasWorkTime={hasWorkTime}
        isPending={notifications.isPending}
        errorMessage={notifications.errorMessage}
        onConfirm={notifications.confirm}
        onClose={notifications.close}
      />
      <AddVehicleSheet
        open={addOpen}
        isAdding={adding.isAdding}
        errorMessage={adding.errorMessage}
        onAdd={adding.add}
        onClose={() => !adding.isAdding && setAddOpen(false)}
      />
    </div>
  );
}
