"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
import Image from "next/image";
import { useState } from "react";

import AppHeader from "@/components/layouts/AppHeader";

import { formatPlateNumber, formatSessionLabel } from "../formatters";
import { useAddVehicle } from "../hooks/useAddVehicle";
import { useBoothValetSessions } from "../hooks/useBoothValetSessions";
import { useCompletePickup } from "../hooks/useCompletePickup";
import { useNotificationToggle } from "../hooks/useNotificationToggle";
import { useParkValetSession } from "../hooks/useParkValetSession";
import { useRespondPickup } from "../hooks/useRespondPickup";

import AddVehicleSheet from "./AddVehicleSheet";
import NotificationToggleSheet from "./NotificationToggleSheet";
import PickupResponseSheet from "./PickupResponseSheet";
import PlateConfirmSheet from "./PlateConfirmSheet";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { BoothValetSession, BoothValetSessionListResponse } from "../schemas/sessions";

interface CarFigureProps {
  imageUrl: string;
  plateNumber: string;
  label: string;
  gray: boolean;
}

function CarFigure({ imageUrl, plateNumber, label, gray }: Readonly<CarFigureProps>) {
  return (
    <>
      <span className="relative block h-16 w-full max-w-[120px]">
        <Image
          src={imageUrl}
          alt=""
          fill
          unoptimized
          className={cn("object-contain", gray && "grayscale opacity-70")}
        />
      </span>
      <span className="mt-1 whitespace-nowrap text-sm leading-5 font-medium tabular-nums">{formatPlateNumber(plateNumber)}</span>
      <span className="mt-1 text-[11px] leading-4">{label}</span>
    </>
  );
}

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
  const [responseTarget, setResponseTarget] = useState<BoothValetSession | null>(null);
  const responding = useRespondPickup({
    staffId,
    boothId,
    onResponded: () => setResponseTarget(null),
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
    } else if (session.status === "PICKUP_REQUESTED") {
      responding.resetError();
      setResponseTarget(session);
    } else if (session.status === "PICKUP_PREPARING") {
      completing.resetError();
      setCompleteTarget(session);
    }
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pb-[calc(14px+var(--safe-area-inset-bottom))]">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />

      <AppHeader
        menu={menu}
        home
        notificationsEnabled={notificationsEnabled}
        onBellClick={notifications.openSheet}
      />

      <div role="status">
        {pickupRequest && (
          <p className="mt-6 flex min-h-12 items-center justify-center rounded-[6px] bg-[#ff7777]/20 px-3 py-3 text-center text-sm leading-5 text-(--base-color)">
            <span>
              {formatPlateNumber(pickupRequest.plateNumber)} 차량이{" "}
              <strong className="font-bold">출차 요청</strong>을 보냈어요.
            </span>
          </p>
        )}
      </div>

      {errorMessage && <FieldError className="mt-3 text-center">{errorMessage}</FieldError>}

      <ul className="mt-6 grid grid-cols-3 gap-x-2 gap-y-3 text-(--base-color)">
        {sessions.map((session) => {
          const cellClass = cn(
            "flex min-h-[120px] w-full min-w-0 flex-col items-center rounded-[6px] border border-transparent px-1 py-2",
            session.status === "ARRIVING" && "text-[#717171]",
            session.status === "PICKUP_REQUESTED" && "border-[#ff7777] bg-[#ff7777]/15 [&>span:last-child]:font-semibold [&>span:last-child]:text-[#b42318]",
            session.status === "PICKUP_PREPARING" && "border-(--secondary-color) bg-(--primary-color)/5 [&>span:last-child]:font-semibold [&>span:last-child]:text-(--primary-color)",
          );
          const car = (
            <CarFigure
              imageUrl={session.carImageUrl}
              plateNumber={session.plateNumber}
              label={session.status === "PARKED" && session.parkedAt ? `주차 ${formatSessionLabel(session, updatedAt)}` : formatSessionLabel(session, updatedAt)}
              gray={session.status === "ARRIVING"}
            />
          );

          return (
            <li key={session.id} className="min-w-0">
              {session.status !== "PARKED" ? (
                <button
                  type="button"
                  className={cn(cellClass, "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-color)")}
                  aria-label={`${formatPlateNumber(session.plateNumber)}, ${formatSessionLabel(session, updatedAt)}`}
                  onClick={() => selectSession(session)}
                >
                  {car}
                </button>
              ) : (
                <div className={cellClass}>{car}</div>
              )}
            </li>
          );
        })}
      </ul>

      <h2 className="mt-8 border-b-2 border-(--primary-color) pb-2 text-lg leading-6 font-medium text-(--base-color)">
        출차 완료 차량
      </h2>

      <ul className="mt-3 grid grid-cols-3 gap-x-2 gap-y-3 text-[#717171]">
        {completed.map((session) => (
          <li key={session.id} className="flex min-h-[120px] min-w-0 flex-col items-center px-1 py-2">
            <CarFigure
              imageUrl={session.carImageUrl}
              plateNumber={session.plateNumber}
              label="출차 완료"
              gray
            />
          </li>
        ))}
      </ul>

      <div className="mt-auto -mr-px ml-px pt-6">
        <Button
          type="button"
          className="h-14 w-full rounded-[6px] text-lg font-medium"
          onClick={() => {
            adding.resetError();
            setAddOpen(true);
          }}
        >
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
      <PickupResponseSheet
        session={responseTarget}
        now={updatedAt}
        isResponding={responding.isResponding}
        errorMessage={responding.errorMessage}
        onRespond={(body) => responseTarget && responding.respond(responseTarget.id, body)}
        onClose={() => !responding.isResponding && setResponseTarget(null)}
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
