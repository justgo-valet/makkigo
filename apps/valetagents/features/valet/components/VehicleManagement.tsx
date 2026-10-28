"use client";

import { Badge, Button, FieldError, cn } from "@makkigo/ui";
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

const STATUS_TONES = {
  ARRIVING: "neutral",
  PICKUP_REQUESTED: "danger",
  PICKUP_PREPARING: "info",
} as const;

interface CarFigureProps {
  imageUrl: string;
  plateNumber: string;
  label: string;
  tone?: (typeof STATUS_TONES)[keyof typeof STATUS_TONES];
  gray: boolean;
}

function CarFigure({ imageUrl, plateNumber, label, tone, gray }: Readonly<CarFigureProps>) {
  return (
    <>
      <span className="relative block h-16 w-full max-w-30">
        <Image
          src={imageUrl}
          alt=""
          fill
          unoptimized
          className={cn("object-contain", gray && "opacity-60 grayscale")}
        />
      </span>
      <span className="mt-1 text-sm font-semibold whitespace-nowrap tabular-nums">
        {formatPlateNumber(plateNumber)}
      </span>
      {tone ? (
        <Badge tone={tone} className="mt-1 px-2 py-0.5 text-xs">
          {label}
        </Badge>
      ) : (
        <span className="mt-1 text-xs text-(--tertiary-color)">{label}</span>
      )}
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
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">

      <AppHeader
        menu={menu}
        home
        notificationsEnabled={notificationsEnabled}
        onBellClick={notifications.openSheet}
      />

      <div role="status">
        {pickupRequest && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm break-keep text-(--base-color)">
            {formatPlateNumber(pickupRequest.plateNumber)} 차량이{" "}
            <strong className="font-bold text-red-600">출차 요청</strong>을 보냈어요.
          </p>
        )}
      </div>

      {errorMessage && <FieldError className="mt-3 text-center">{errorMessage}</FieldError>}

      <ul className="mt-4 grid grid-cols-3 gap-2 text-(--base-color)">
        {sessions.map((session) => {
          const label = formatSessionLabel(session, updatedAt);
          const cellClass = cn(
            "flex min-h-30 w-full min-w-0 flex-col items-center rounded-xl border bg-white px-1 py-3",
            session.status === "ARRIVING" && "text-(--tertiary-color)",
            session.status === "PICKUP_REQUESTED" && "border-red-300 bg-red-50",
            session.status === "PICKUP_PREPARING" && "border-primary/40 bg-primary/5",
          );
          const car = (
            <CarFigure
              imageUrl={session.carImageUrl}
              plateNumber={session.plateNumber}
              label={session.status === "PARKED" && session.parkedAt ? `주차 ${label}` : label}
              tone={session.status === "PARKED" ? undefined : STATUS_TONES[session.status]}
              gray={session.status === "ARRIVING"}
            />
          );

          return (
            <li key={session.id} className="min-w-0">
              {session.status !== "PARKED" ? (
                <button
                  type="button"
                  className={cn(cellClass, "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary")}
                  aria-label={`${formatPlateNumber(session.plateNumber)}, ${label}`}
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

      <h2 className="mt-8 border-b-2 border-primary pb-2 text-base font-bold text-(--base-color)">
        출차 완료 차량
      </h2>

      <ul className="mt-3 grid grid-cols-3 gap-2 text-(--tertiary-color)">
        {completed.map((session) => (
          <li key={session.id} className="flex min-h-30 min-w-0 flex-col items-center px-1 py-3">
            <CarFigure
              imageUrl={session.carImageUrl}
              plateNumber={session.plateNumber}
              label="출차 완료"
              gray
            />
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <Button
          type="button"
          size="xl"
          className="w-full"
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
