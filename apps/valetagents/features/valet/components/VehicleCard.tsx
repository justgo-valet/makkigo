"use client";

import { cn } from "@makkigo/ui";
import Image from "next/image";
import { useLayoutEffect, useRef } from "react";

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
    "flex h-[170px] w-full min-w-0 flex-col items-center justify-center rounded-[20px] px-3 text-(--base-color)",
    STATUS_STYLES[status].className,
  );

function FitLine({ className, children }: Readonly<{ className: string; children: string }>) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const line = ref.current;
    const card = line?.parentElement;
    if (!line || !card) return;

    const fit = () => {
      const style = getComputedStyle(card);
      const available =
        card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const ratio = available / line.offsetWidth;
      line.style.transform = ratio < 1 ? `scale(${ratio})` : "";
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(card);
    observer.observe(line);
    return () => observer.disconnect();
  }, [children]);

  return (
    <span ref={ref} className={cn("whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

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
      <span
        className={cn(
          "relative mb-0.5 block h-16 w-full max-w-40",
          status === "ARRIVING" && "animate-arrival-drive",
        )}
      >
        <Image src={imageUrl} alt="" fill unoptimized className="object-contain" />
      </span>
      <FitLine className="text-[19px] leading-[27px] font-bold tabular-nums">
        {formatPlateNumber(plateNumber)}
      </FitLine>
      <FitLine className="mt-1 text-[15px] leading-[21px] font-medium">{label}</FitLine>
      {fee && <FitLine className="text-[15px] leading-[21px] font-bold tabular-nums">{fee}</FitLine>}
    </>
  );
}

export { VehicleCardContent, vehicleCardClass };
export type { VehicleStatus };
