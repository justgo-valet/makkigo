"use client";

import { cn } from "@makkigo/ui";

import AppHeader from "@/components/layouts/AppHeader";

import { useMerchantValetSessions } from "../hooks/useBoothValetSessions";

import VehicleBoard from "./VehicleBoard";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { ValetSessionListResponse } from "../schemas/sessions";

interface MerchantVehicleOverviewProps {
  staffId: number;
  initialData: ValetSessionListResponse;
  initialDataUpdatedAt: number;
  menu: MenuAccess;
}

export default function MerchantVehicleOverview({
  staffId,
  initialData,
  initialDataUpdatedAt,
  menu,
}: Readonly<MerchantVehicleOverviewProps>) {
  const lists = useMerchantValetSessions({ staffId, initialData, initialDataUpdatedAt });
  const hasPickupRequest = lists.sessions.some(({ status }) => status === "PICKUP_REQUESTED");

  return (
    <div
      className={cn(
        "mx-auto flex min-h-full w-full max-w-md flex-col pb-6",
        hasPickupRequest && "animate-pickup-blink motion-reduce:animate-none",
      )}
    >
      <AppHeader menu={menu} home />
      <VehicleBoard {...lists} />
    </div>
  );
}
