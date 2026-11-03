import { cn } from "@makkigo/ui";
import Image from "next/image";

import { formatPlateNumber } from "../formatters";

import type { ReactNode } from "react";
import type { BoothValetSession } from "../schemas/sessions";

type VehicleStatus = BoothValetSession["status"] | "COMPLETED";

const ICON_PROPS = {
  viewBox: "0 0 18 18",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "size-4.5 shrink-0",
  "aria-hidden": true,
} as const;

const BellIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M4.5 6a4.5 4.5 0 0 1 9 0c0 5.25 2.25 6.75 2.25 6.75H2.25S4.5 11.25 4.5 6Z" />
    <path d="M7.725 15.75a1.5 1.5 0 0 0 2.55 0" />
  </svg>
);

const ParkingIcon = () => (
  <svg {...ICON_PROPS}>
    <rect x="2.625" y="2.625" width="12.75" height="12.75" rx="3" />
    <path d="M7.125 12.75v-7.5h2.625a2.25 2.25 0 0 1 0 4.5H7.125" />
  </svg>
);

const PinIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M9 16.5s5.25-4.65 5.25-9a5.25 5.25 0 0 0-10.5 0c0 4.35 5.25 9 5.25 9Z" />
    <circle cx="9" cy="7.5" r="1.95" fill="currentColor" stroke="none" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg {...ICON_PROPS}>
    <circle cx="9" cy="9" r="6.75" />
    <path d="m6 9.375 1.95 1.95L12 7.125" />
  </svg>
);

const STATUS_STYLES: Record<VehicleStatus, { title: string; icon: ReactNode; className: string }> = {
  PICKUP_REQUESTED: { title: "출차 요청", icon: <BellIcon />, className: "bg-(--pickup-blink)" },
  PICKUP_PREPARING: { title: "출차 요청", icon: <BellIcon />, className: "bg-[#ff3b30]" },
  PARKED: { title: "주차 중", icon: <ParkingIcon />, className: "bg-[#ffbab7]" },
  ARRIVING: { title: "도착 알림", icon: <PinIcon />, className: "bg-[#ffeda6]" },
  COMPLETED: { title: "출차 완료", icon: <CheckCircleIcon />, className: "bg-[#b8ebc5]" },
};

const vehicleCardClass = (status: VehicleStatus) =>
  cn(
    "relative flex h-[145px] w-full min-w-0 flex-col items-center justify-end rounded-[20px] px-3 pb-3 text-(--base-color)",
    STATUS_STYLES[status].className,
  );

interface VehicleCardContentProps {
  status: VehicleStatus;
  imageUrl: string;
  plateNumber: string;
  label: string;
}

function VehicleCardContent({ status, imageUrl, plateNumber, label }: Readonly<VehicleCardContentProps>) {
  const { title, icon } = STATUS_STYLES[status];

  return (
    <>
      <span className="absolute top-2.5 left-3 flex items-center gap-1.5 text-[15px] leading-[21px] font-bold">
        {icon}
        {title}
      </span>
      <span className="relative mb-0.5 block h-11 w-full max-w-28">
        <Image src={imageUrl} alt="" fill unoptimized className="object-contain" />
      </span>
      <span className="text-[19px] leading-[27px] font-bold whitespace-nowrap tabular-nums">
        {formatPlateNumber(plateNumber)}
      </span>
      <span className="mt-1 text-[15px] leading-[21px] font-medium whitespace-nowrap">{label}</span>
    </>
  );
}

export { VehicleCardContent, vehicleCardClass };
export type { VehicleStatus };
