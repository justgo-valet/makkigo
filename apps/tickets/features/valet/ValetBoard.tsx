"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { cn, FieldError } from "@makkigo/ui";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { apiClient } from "@/libs/common/apiClient";
import { valetSessionListResponseSchema } from "@/libs/valet/contracts";

import { formatCompletedLabel, formatPlateNumber, formatSessionLabel, formatWon } from "./formatters";
import VehicleCard from "./VehicleCard";

import type { ActiveValetSession, ValetSessionListResponse } from "@/libs/valet/contracts";

const POLL_INTERVAL_MS = 5_000;
const LIST_ERROR_MESSAGE = "차량 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

const getValetSessions = async (signal: AbortSignal) =>
  valetSessionListResponseSchema.parse(await apiClient.get("valet-sessions", { signal }).json<unknown>());

interface ValetBoardProps {
  initialData: ValetSessionListResponse;
  initialDataUpdatedAt: number;
}

function ValetSessions({ initialData, initialDataUpdatedAt }: Readonly<ValetBoardProps>) {
  const query = useQuery({
    queryKey: ["valet-sessions"],
    queryFn: ({ signal }) => getValetSessions(signal),
    initialData,
    initialDataUpdatedAt,
    retry: false,
    networkMode: "always",
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const { items: sessions, completed } = query.data;
  const updatedAt = Math.max(query.dataUpdatedAt, query.errorUpdatedAt);
  const pickupRequest = sessions.find(({ status }) => status === "PICKUP_REQUESTED");
  const countOf = (...statuses: ActiveValetSession["status"][]) =>
    sessions.filter(({ status }) => statuses.includes(status)).length;
  const legend = [
    { label: "출차 요청", count: countOf("PICKUP_REQUESTED", "PICKUP_PREPARING"), dot: "bg-(--pickup-blink)" },
    { label: "주차 중", count: countOf("PARKED"), dot: "border border-[#c9cfd8] bg-white" },
    { label: "도착", count: countOf("ARRIVING"), dot: "bg-[#ffcc00]" },
    { label: "오늘 출차", count: completed.length, dot: "bg-[#34c759]" },
  ];

  return (
    <main className={cn("mx-auto max-w-6xl px-6 py-10", pickupRequest && "animate-pickup-blink")}>
      <h1 className="text-2xl font-bold tracking-tight">발렛 현황</h1>
      <p className="mt-1 text-sm text-(--tertiary-color)">맡겨진 차량과 오늘 출차한 차량이에요. 5초마다 새로 불러와요.</p>

      <p role="status" className="sr-only">
        {pickupRequest && `${formatPlateNumber(pickupRequest.plateNumber)} 차량이 출차 요청을 보냈어요.`}
      </p>

      <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-white px-5 py-3 ring-1 ring-black/5">
        {legend.map(({ label, count, dot }) => (
          <li key={label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("size-3 rounded-full", dot)} />
            <span className="text-[15px] font-medium">{label}</span>
            <span className="text-base font-bold tabular-nums">{count}</span>
          </li>
        ))}
      </ul>

      {query.isError && (
        <FieldError className="mt-4 text-center">{getErrorMessage(query.error, LIST_ERROR_MESSAGE)}</FieldError>
      )}

      {sessions.length === 0 && completed.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center text-sm text-(--tertiary-color)">
          지금 맡겨진 차량이 없어요.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {sessions.map((session) => (
            <li key={session.id} className="min-w-0">
              <VehicleCard
                status={session.status}
                imageUrl={session.carImageUrl}
                plateNumber={session.plateNumber}
                ticketNumber={session.ticketNumber}
                label={formatSessionLabel(session, updatedAt)}
                fee={
                  session.fee !== null && session.status !== "ARRIVING" && session.status !== "PARKED"
                    ? formatWon(session.fee)
                    : undefined
                }
              />
            </li>
          ))}
          {completed.map((session) => (
            <li key={`completed-${session.id}`} className="min-w-0">
              <VehicleCard
                status="COMPLETED"
                imageUrl={session.carImageUrl}
                plateNumber={session.plateNumber}
                ticketNumber={session.ticketNumber}
                label={formatCompletedLabel(session.completedAt, updatedAt)}
                fee={session.fee === null ? "금액 미입력" : formatWon(session.fee)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function ValetBoard(props: Readonly<ValetBoardProps>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ValetSessions {...props} />
    </QueryClientProvider>
  );
}
