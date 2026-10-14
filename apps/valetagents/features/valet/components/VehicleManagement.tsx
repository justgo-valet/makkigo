"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
import Image from "next/image";
import { useState } from "react";

import AppHeader from "@/components/layouts/AppHeader";

import { formatPlateNumber, formatSessionLabel } from "../formatters";
import { useBoothValetSessions } from "../hooks/useBoothValetSessions";
import { useParkValetSession } from "../hooks/useParkValetSession";

import ParkSheet from "./ParkSheet";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { BoothValetSession, BoothValetSessionListResponse } from "../schemas/sessions";

interface VehicleManagementProps {
  staffId: number;
  boothId: number;
  initialData: BoothValetSessionListResponse;
  initialDataUpdatedAt: number;
  menu: MenuAccess;
}

export default function VehicleManagement({
  staffId,
  boothId,
  initialData,
  initialDataUpdatedAt,
  menu,
}: Readonly<VehicleManagementProps>) {
  const { sessions, updatedAt, errorMessage } = useBoothValetSessions({
    staffId,
    boothId,
    initialData,
    initialDataUpdatedAt,
  });
  const pickupRequest = sessions.find(({ status }) => status === "PICKUP_REQUESTED");
  const [parkTarget, setParkTarget] = useState<BoothValetSession | null>(null);
  const parking = useParkValetSession({ staffId, boothId, onParked: () => setParkTarget(null) });

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pb-[calc(14px+env(safe-area-inset-bottom))]">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />

      <AppHeader menu={menu} home />

      <div role="status">
        {pickupRequest && (
          <p className="-mx-6 mt-[31px] flex h-14 items-center justify-center bg-[#ff7777] pt-1 text-xl text-(--base-color)">
            <span>
              {formatPlateNumber(pickupRequest.plateNumber)} 차량이{" "}
              <strong className="font-bold">출차 요청</strong>을 보냈어요.
            </span>
          </p>
        )}
      </div>

      {errorMessage && <FieldError className="mt-3 text-center">{errorMessage}</FieldError>}

      <ul className="-mx-5 mt-[26px] grid grid-cols-3 gap-y-[22px] text-(--base-color)">
        {sessions.map((session) => {
          const cellClass = cn(
            "flex h-24 w-full flex-col items-center rounded-[6px]",
            (session.status === "PICKUP_REQUESTED" || session.status === "PICKUP_PREPARING") &&
              "bg-[#ff7777]",
          );
          const car = (
            <>
              <span className="relative -mt-4 block aspect-[8/5] w-[120px]">
                <Image
                  src={session.carImageUrl}
                  alt=""
                  fill
                  unoptimized
                  className={cn("object-contain", session.status === "ARRIVING" && "grayscale")}
                />
              </span>
              <span className="-mt-0.5 text-sm leading-5">{formatPlateNumber(session.plateNumber)}</span>
              <span className="text-[11px] leading-3">{formatSessionLabel(session, updatedAt)}</span>
            </>
          );

          return (
            <li key={session.id}>
              {session.status === "ARRIVING" ? (
                <button
                  type="button"
                  className={cellClass}
                  onClick={() => {
                    parking.resetError();
                    setParkTarget(session);
                  }}
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

      <h2 className="-mr-[7px] -ml-0.5 mt-[58px] -indent-0.5 border-b-2 border-(--primary-color) pb-0.5 text-xl leading-6 font-medium text-(--base-color)">
        출차 완료 차량
      </h2>

      <div className="mt-auto -mr-px ml-px pt-6">
        <Button type="button" className="h-14 w-full rounded-[6px] text-lg font-medium">
          차량 추가하기
        </Button>
      </div>

      <ParkSheet
        plateNumber={parkTarget?.plateNumber ?? null}
        isParking={parking.isParking}
        errorMessage={parking.errorMessage}
        onConfirm={() => parkTarget && parking.park(parkTarget.id)}
        onClose={() => !parking.isParking && setParkTarget(null)}
      />
    </div>
  );
}
