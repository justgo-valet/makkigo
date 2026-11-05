import { cn } from "@makkigo/ui";
import Image from "next/image";

import { formatPlateNumber } from "../formatters";

import type { BoothValetSession } from "../schemas/sessions";

type VehicleStatus = BoothValetSession["status"] | "COMPLETED";

const STATUS_STYLES: Record<VehicleStatus, { title: string; className: string }> = {
  PICKUP_REQUESTED: { title: "출차 요청", className: "bg-(--pickup-blink)" },
  PICKUP_PREPARING: { title: "출차 요청", className: "bg-[#ff3b30]" },
  PARKED: { title: "주차 중", className: "bg-white" },
  ARRIVING: { title: "도착 알림", className: "bg-[#ffeda6]" },
  COMPLETED: { title: "출차 완료", className: "bg-[#b8ebc5]" },
};

const vehicleCardClass = (status: VehicleStatus) =>
  cn(
    "flex h-[145px] w-full min-w-0 flex-col items-center justify-center rounded-[20px] px-3 text-(--base-color)",
    STATUS_STYLES[status].className,
  );

interface VehicleCardContentProps {
  status: VehicleStatus;
  imageUrl: string;
  plateNumber: string;
  label: string;
  fee?: string;
}

function VehicleCardContent({
  status,
  imageUrl,
  plateNumber,
  label,
  fee,
}: Readonly<VehicleCardContentProps>) {
  return (
    <>
      <span className="sr-only">{STATUS_STYLES[status].title}</span>
      <span className="relative mb-0.5 block h-11 w-full max-w-28">
        <Image src={imageUrl} alt="" fill unoptimized className="object-contain" />
      </span>
      <span className="text-[19px] leading-[27px] font-bold whitespace-nowrap tabular-nums">
        {formatPlateNumber(plateNumber)}
      </span>
      <span className="mt-1 text-[15px] leading-[21px] font-medium whitespace-nowrap">{label}</span>
      {fee && (
        <span className="text-[15px] leading-[21px] font-bold whitespace-nowrap tabular-nums">
          {fee}
        </span>
      )}
    </>
  );
}

export { VehicleCardContent, vehicleCardClass };
export type { VehicleStatus };
