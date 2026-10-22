import { useState } from "react";

import privacyPolicy from "@/features/consent/documents/privacyPolicy";
import privacyThirdParty from "@/features/consent/documents/privacyThirdParty";
import termsOfService from "@/features/consent/documents/termsOfService";

import type { ChangeEvent, FormEvent } from "react";

const GUEST_VALET_PREVIEW = {
  merchantName: "그랜드 하얏트 서울",
  vehicleNumber: "12가 3456",
  status: "주차 완료",
  entryTime: "오후 2:35",
  elapsedTime: "1시간 경과",
  valetFee: "14,000원",
} as const;

const GUEST_LEGAL_DOCUMENTS = {
  TERMS_OF_SERVICE: { label: "서비스 이용약관", content: termsOfService },
  PRIVACY_THIRD_PARTY: { label: "개인정보 제3자 제공", content: privacyThirdParty },
  PRIVACY_POLICY: { label: "개인정보 처리방침", content: privacyPolicy },
} as const;

type GuestLegalDocumentType = keyof typeof GUEST_LEGAL_DOCUMENTS;

type GuestVehicleStatusView = "lookup" | "status";

const normalizeVehicleNumber = (value: string) => value.replace(/\s/g, "").slice(0, 9);

const useGuestVehicleStatus = () => {
  const [view, setView] = useState<GuestVehicleStatusView>("lookup");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [requestedExit, setRequestedExit] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [openedDocumentType, setOpenedDocumentType] = useState<GuestLegalDocumentType | null>(null);

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

  const requestExit = () => {
    if (!agreed) return;
    setRequestedExit(true);
  };

  return {
    preview: GUEST_VALET_PREVIEW,
    view,
    vehicleNumber,
    requestedExit,
    agreed,
    canRequestExit: agreed && !requestedExit,
    openedDocument: openedDocumentType ? GUEST_LEGAL_DOCUMENTS[openedDocumentType] : null,
    canLookup: Boolean(vehicleNumber.trim()),
    changeVehicleNumber,
    lookupVehicle,
    resetLookup,
    requestExit,
    changeAgreed: setAgreed,
    openDocument: setOpenedDocumentType,
    closeDocument: () => setOpenedDocumentType(null),
  };
};

export { GUEST_LEGAL_DOCUMENTS, useGuestVehicleStatus };
export type { GuestLegalDocumentType };
