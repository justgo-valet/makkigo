import { useState } from "react";

import type { ChangeEvent, FormEvent } from "react";

const GUEST_VALET_PREVIEW = {
  merchantName: "그랜드 하얏트 서울",
  vehicleNumber: "12가 3456",
  status: "주차 완료",
  entryTime: "오후 2:35",
  elapsedTime: "1시간 경과",
  valetFee: "14,000원",
} as const;

type GuestVehicleStatusView = "lookup" | "status";

const normalizeVehicleNumber = (value: string) => value.replace(/\s/g, "").slice(0, 9);

const useGuestVehicleStatus = () => {
  const [view, setView] = useState<GuestVehicleStatusView>("lookup");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [requestedExit, setRequestedExit] = useState(false);

  const changeVehicleNumber = (event: ChangeEvent<HTMLInputElement>) => {
    setVehicleNumber(normalizeVehicleNumber(event.target.value));
  };

  const lookupVehicle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vehicleNumber.trim()) return;

    setRequestedExit(false);
    setView("status");
  };

  const resetLookup = () => {
    setVehicleNumber("");
    setRequestedExit(false);
    setView("lookup");
  };

  const requestExit = () => setRequestedExit(true);

  return {
    preview: GUEST_VALET_PREVIEW,
    view,
    vehicleNumber,
    requestedExit,
    canLookup: Boolean(vehicleNumber.trim()),
    changeVehicleNumber,
    lookupVehicle,
    resetLookup,
    requestExit,
  };
};

export { useGuestVehicleStatus };
