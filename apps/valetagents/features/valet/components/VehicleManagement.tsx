"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
import { useState } from "react";

import AppHeader from "@/components/layouts/AppHeader";

import { formatCompletedLabel, formatPlateNumber, formatSessionLabel, formatWon } from "../formatters";
import { useAddVehicle } from "../hooks/useAddVehicle";
import { useBoothValetSessions } from "../hooks/useBoothValetSessions";
import { useCompletePickup } from "../hooks/useCompletePickup";
import { useNotificationToggle } from "../hooks/useNotificationToggle";
import { useParkValetSession } from "../hooks/useParkValetSession";
import { useUpdateCompletedFee } from "../hooks/useUpdateCompletedFee";

import AddVehicleSheet from "./AddVehicleSheet";
import FeeEditSheet from "./FeeEditSheet";
import NotificationToggleSheet from "./NotificationToggleSheet";
import PlateConfirmSheet from "./PlateConfirmSheet";
import { VehicleCardContent, vehicleCardClass } from "./VehicleCard";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type {
  BoothValetSession,
  BoothValetSessionListResponse,
  CompletedValetSession,
} from "../schemas/sessions";

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
  const { sessions, completed, notificationsEnabled, updatedAt, errorMessage } = useBoothValetSessions({
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
  const [feeTarget, setFeeTarget] = useState<CompletedValetSession | null>(null);
  const feeEditing = useUpdateCompletedFee({
    staffId,
    boothId,
    onUpdated: () => setFeeTarget(null),
  });

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

  const countOf = (...statuses: BoothValetSession["status"][]) =>
    sessions.filter(({ status }) => statuses.includes(status)).length;
  const legend = [
    { label: "출차 요청", count: countOf("PICKUP_REQUESTED", "PICKUP_PREPARING"), dot: "bg-(--pickup-blink)" },
    { label: "주차 중", count: countOf("PARKED"), dot: "border border-[#c9cfd8] bg-white" },
    { label: "도착", count: countOf("ARRIVING"), dot: "bg-[#ffcc00]" },
    { label: "완료", count: completed.length, dot: "bg-[#34c759]" },
  ];

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

      <p role="status" className="sr-only">
        {pickupRequest && `${formatPlateNumber(pickupRequest.plateNumber)} 차량이 출차 요청을 보냈어요.`}
      </p>

      <ul className="mt-3 flex min-h-12 flex-wrap items-center justify-between gap-x-1 gap-y-1 rounded-2xl bg-white px-2 py-1.5 whitespace-nowrap text-(--base-color)">
        {legend.map(({ label, count, dot }) => (
          <li key={label} className="flex items-center gap-1">
            <span aria-hidden="true" className={cn("size-3 rounded-full", dot)} />
            <span className="text-[15px] font-medium">{label}</span>
            <span className="text-base font-bold tabular-nums">{count}</span>
          </li>
        ))}
      </ul>

      {errorMessage && <FieldError className="mt-3 text-center">{errorMessage}</FieldError>}

      <ul className="mt-3 grid grid-cols-2 gap-2.5">
        {sessions.map((session) => {
          const label = formatSessionLabel(session, updatedAt);
          const content = (
            <VehicleCardContent
              status={session.status}
              imageUrl={session.carImageUrl}
              plateNumber={session.plateNumber}
              label={label}
            />
          );

          return (
            <li key={session.id} className="min-w-0">
              {session.status !== "PARKED" ? (
                <button
                  type="button"
                  className={cn(
                    vehicleCardClass(session.status),
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  )}
                  onClick={() => selectSession(session)}
                >
                  {content}
                </button>
              ) : (
                <div className={vehicleCardClass(session.status)}>{content}</div>
              )}
            </li>
          );
        })}
        {completed.map((session) => (
          <li key={`completed-${session.id}`} className="min-w-0">
            <button
              type="button"
              aria-label={`${formatPlateNumber(session.plateNumber)} 발렛 금액 수정`}
              className={cn(
                vehicleCardClass("COMPLETED"),
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              )}
              onClick={() => {
                feeEditing.resetError();
                setFeeTarget(session);
              }}
            >
              <VehicleCardContent
                status="COMPLETED"
                imageUrl={session.carImageUrl}
                plateNumber={session.plateNumber}
                label={formatCompletedLabel(session.completedAt, updatedAt)}
                fee={session.fee === null ? "금액 미입력" : formatWon(session.fee)}
              />
            </button>
          </li>
        ))}
      </ul>

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
      <FeeEditSheet
        session={feeTarget}
        isUpdating={feeEditing.isUpdating}
        errorMessage={feeEditing.errorMessage}
        onSave={(fee) => feeTarget && feeEditing.update(feeTarget.id, fee)}
        onClose={() => !feeEditing.isUpdating && setFeeTarget(null)}
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
