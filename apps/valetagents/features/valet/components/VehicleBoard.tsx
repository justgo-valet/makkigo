"use client";

import { FieldError, cn } from "@makkigo/ui";

import { formatCompletedLabel, formatPlateNumber, formatSessionLabel, formatWon } from "../formatters";

import { VehicleCardContent, vehicleCardClass } from "./VehicleCard";

import type { BoothValetSession, CompletedValetSession } from "../schemas/sessions";

const FOCUS_CLASS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

interface VehicleBoardProps {
  sessions: BoothValetSession[];
  completed?: CompletedValetSession[];
  completedCount?: number;
  updatedAt: number;
  errorMessage: string | null;
  onSelectSession?: (session: BoothValetSession) => void;
}

export default function VehicleBoard({
  sessions,
  completed = [],
  completedCount = completed.length,
  updatedAt,
  errorMessage,
  onSelectSession,
}: Readonly<VehicleBoardProps>) {
  const pickupRequest = sessions.find(({ status }) => status === "PICKUP_REQUESTED");
  const countOf = (...statuses: BoothValetSession["status"][]) =>
    sessions.filter(({ status }) => statuses.includes(status)).length;
  const legend = [
    { label: "출차 요청", count: countOf("PICKUP_REQUESTED", "PICKUP_PREPARING"), dot: "bg-(--pickup-blink)" },
    { label: "주차 중", count: countOf("PARKED"), dot: "border border-[#c9cfd8] bg-white" },
    { label: "도착", count: countOf("ARRIVING"), dot: "bg-[#ffcc00]" },
    { label: "완료", count: completedCount, dot: "bg-[#34c759]" },
  ];

  return (
    <>
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
          const content = (
            <VehicleCardContent
              status={session.status}
              imageUrl={session.carImageUrl}
              plateNumber={session.plateNumber}
              label={formatSessionLabel(session, updatedAt)}
              fee={
                session.fee !== null && session.status !== "ARRIVING" && session.status !== "PARKED"
                  ? formatWon(session.fee)
                  : undefined
              }
            />
          );

          return (
            <li key={session.id} className="min-w-0">
              {onSelectSession && session.status !== "PARKED" ? (
                <button
                  type="button"
                  className={cn(vehicleCardClass(session.status), FOCUS_CLASS)}
                  onClick={() => onSelectSession(session)}
                >
                  {content}
                </button>
              ) : (
                <div className={vehicleCardClass(session.status)}>{content}</div>
              )}
            </li>
          );
        })}
        {completed.map((session) => {
          const content = (
            <VehicleCardContent
              status="COMPLETED"
              imageUrl={session.carImageUrl}
              plateNumber={session.plateNumber}
              label={formatCompletedLabel(session.completedAt, updatedAt)}
              fee={session.fee === null ? "금액 미입력" : formatWon(session.fee)}
            />
          );

          return (
            <li key={`completed-${session.id}`} className="min-w-0">
              <div className={vehicleCardClass("COMPLETED")}>{content}</div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
