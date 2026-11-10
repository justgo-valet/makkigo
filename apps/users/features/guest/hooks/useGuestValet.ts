import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";

import {
  getGuestSession,
  isSessionNotFound,
  requestGuestPickup,
} from "@/features/guest/apis/guestValet";
import { GUEST_LEGAL_DOCUMENTS } from "@/features/guest/legalDocuments";
import { useBankTransfer } from "@/features/valet/hooks/useBankTransfer";
import { toValetFeeView } from "@/features/valet/valetFeeFormat";
import { PLATE_NUMBER_PATTERN, normalizePlateNumber } from "@/libs/guest/contracts/guest";

import type { GuestLegalDocumentType } from "@/features/guest/legalDocuments";
import type { ChangeEvent, FormEvent } from "react";

const GUEST_SESSION_REFETCH_MS = 5 * 1000;
const LOOKUP_ERROR_MESSAGE = "차량 정보를 불러오지 못했어요. 다시 시도해 주세요.";
const PICKUP_ERROR_MESSAGE = "출차 요청을 보내지 못했어요. 다시 시도해 주세요.";

const plateStorageKey = (merchantId: number) => `makkigo:guest-plate:${merchantId}`;
const plateListeners = new Set<() => void>();

const subscribePlate = (listener: () => void) => {
  plateListeners.add(listener);
  return () => plateListeners.delete(listener);
};

const savePlate = (merchantId: number, plateNumber: string | null) => {
  if (plateNumber) window.sessionStorage.setItem(plateStorageKey(merchantId), plateNumber);
  else window.sessionStorage.removeItem(plateStorageKey(merchantId));
  plateListeners.forEach((listener) => listener());
};

const readPlate = (merchantId: number) => {
  const saved = window.sessionStorage.getItem(plateStorageKey(merchantId));
  return saved && PLATE_NUMBER_PATTERN.test(saved) ? saved : null;
};

const useGuestValet = (merchantId: number) => {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const plateNumber = useSyncExternalStore(
    subscribePlate,
    () => readPlate(merchantId),
    () => null,
  );
  const [agreed, setAgreed] = useState(false);
  const [isAcceptedOpen, setIsAcceptedOpen] = useState(false);
  const [isFeeExpanded, setIsFeeExpanded] = useState(false);
  const [openedDocumentType, setOpenedDocumentType] = useState<GuestLegalDocumentType | null>(null);

  const queryKey = ["guest", merchantId, plateNumber] as const;
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getGuestSession(merchantId, plateNumber ?? "", signal),
    enabled: plateNumber !== null,
    refetchInterval: GUEST_SESSION_REFETCH_MS,
    retry: false,
  });

  const pickup = useMutation({
    mutationFn: () => requestGuestPickup(merchantId, plateNumber ?? ""),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setIsFeeExpanded(false);
      setIsAcceptedOpen(true);
    },
  });

  const session = query.data?.session ?? null;
  const isCompleted = session !== null && isSessionNotFound(query.error);
  const bankTransfer = useBankTransfer(
    session?.bankAccount
      ? { bankName: session.bankAccount.bankName, accountNumber: session.bankAccount.accountNumber }
      : null,
    session?.actualFee ?? session?.fee?.total ?? null,
  );

  const normalizedInput = normalizePlateNumber(input);

  const lookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!PLATE_NUMBER_PATTERN.test(normalizedInput)) return;
    savePlate(merchantId, normalizedInput);
  };

  const reset = () => {
    queryClient.removeQueries({ queryKey: ["guest", merchantId] });
    pickup.reset();
    setAgreed(false);
    setIsAcceptedOpen(false);
    savePlate(merchantId, null);
  };

  const isPickupRequested =
    session?.status === "PICKUP_REQUESTED" || session?.status === "PICKUP_PREPARING";

  return {
    input,
    canLookup: PLATE_NUMBER_PATTERN.test(normalizedInput),
    isLookingUp: query.isFetching && !session,
    lookupErrorMessage:
      query.error && !session ? getErrorMessage(query.error, LOOKUP_ERROR_MESSAGE) : null,
    session,
    ticket: query.data?.ticket ?? null,
    isCompleted,
    isPickupRequested,
    agreed,
    canRequestPickup: session?.status === "PARKED" && agreed && !pickup.isPending,
    isRequesting: pickup.isPending,
    pickupErrorMessage: pickup.error && getErrorMessage(pickup.error, PICKUP_ERROR_MESSAGE),
    isAcceptedOpen,
    fee: session?.fee ? toValetFeeView(session.fee) : null,
    isFeeExpanded,
    bankTransfer,
    openedDocument: openedDocumentType ? GUEST_LEGAL_DOCUMENTS[openedDocumentType] : null,
    changeInput: (event: ChangeEvent<HTMLInputElement>) =>
      setInput(event.target.value.slice(0, 12)),
    lookup,
    reset,
    changeAgreed: setAgreed,
    requestPickup: () => pickup.mutate(),
    openAccepted: () => setIsAcceptedOpen(true),
    closeAccepted: () => setIsAcceptedOpen(false),
    toggleFee: () => setIsFeeExpanded((expanded) => !expanded),
    openDocument: setOpenedDocumentType,
    closeDocument: () => setOpenedDocumentType(null),
  };
};

export { useGuestValet };
