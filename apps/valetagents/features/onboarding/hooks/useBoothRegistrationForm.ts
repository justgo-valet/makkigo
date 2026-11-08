"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { feePolicySchema } from "@/libs/booth/contracts/payment-settings";

import { useFeePolicyFields } from "@/features/payment-settings/hooks/useFeePolicyFields";

import { createBooth } from "../apis/createBooth";
import { useBoothMap } from "./useBoothMap";
import { useBoothPhotos } from "./useBoothPhotos";

const ADDRESS_DEBOUNCE_MS = 300;
const SAVE_ERROR_MESSAGE = "부스를 등록하지 못했어요. 잠시 후 다시 시도해 주세요.";
const INVALID_FEE_MESSAGE = "기본 1~24시간, 요금 100만 원 이하, 추가 1~180분으로 입력해 주세요.";

type BoothMapState = ReturnType<typeof useBoothMap>["state"];
type BoothRegistrationMapView = "idle" | BoothMapState;

interface BoothRegistrationAddress {
  address: string;
  geocodedAddress: string;
  mapState: BoothMapState;
}

const getBoothRegistrationMapView = ({
  address,
  geocodedAddress,
  mapState,
}: BoothRegistrationAddress): BoothRegistrationMapView => {
  const typedAddress = address.trim();
  if (!typedAddress) return "idle";
  return typedAddress === geocodedAddress ? mapState : "loading";
};

const getBoothRegistrationAvailability = ({
  name,
  feePolicyValid,
  isSaving,
  ...address
}: BoothRegistrationAddress & { name: string; feePolicyValid: boolean; isSaving: boolean }) =>
  name.trim().length > 0 &&
  feePolicyValid &&
  getBoothRegistrationMapView(address) === "ready" &&
  !isSaving;

const isAlreadyOnboardedError = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("data" in error)) return false;

  const { data } = error;
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    data.code === "ALREADY_ONBOARDED"
  );
};

const useBoothRegistrationForm = (kakaoMapAppKey: string) => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [geocodedAddress, setGeocodedAddress] = useState("");
  const photos = useBoothPhotos();
  const fee = useFeePolicyFields(null);
  const feePolicy = feePolicySchema.safeParse(fee.feePolicy);

  useEffect(() => {
    const nextAddress = address.trim();
    const timer = window.setTimeout(() => setGeocodedAddress(nextAddress), ADDRESS_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [address]);

  const map = useBoothMap(geocodedAddress, kakaoMapAppKey);
  const goHome = () => {
    router.replace("/");
    router.refresh();
  };
  const mutation = useMutation({
    mutationFn: createBooth,
    onSuccess: goHome,
    onError: (error) => {
      if (isAlreadyOnboardedError(error)) goHome();
    },
  });

  const isLeaving = mutation.isSuccess || isAlreadyOnboardedError(mutation.error);
  const isSaving = mutation.isPending || isLeaving;
  const canSubmit = getBoothRegistrationAvailability({
    name,
    feePolicyValid: feePolicy.success,
    address,
    geocodedAddress,
    mapState: map.state,
    isSaving,
  });

  return {
    name,
    address,
    addressDetail,
    mapContainerRef: map.containerRef,
    mapView: getBoothRegistrationMapView({ address, geocodedAddress, mapState: map.state }),
    mapErrorMessage: map.errorMessage,
    photos,
    feeValues: fee.values,
    changeFee: fee.change,
    feeErrorMessage: fee.filled && !feePolicy.success ? INVALID_FEE_MESSAGE : null,
    isSaving,
    canSubmit,
    errorMessage:
      mutation.error && !isLeaving ? getErrorMessage(mutation.error, SAVE_ERROR_MESSAGE) : null,
    changeName: setName,
    changeAddress: setAddress,
    changeAddressDetail: setAddressDetail,
    retryMap: map.retry,
    submit: () => {
      if (!canSubmit || !feePolicy.success) return;
      mutation.mutate({ name, address, addressDetail, feePolicy: feePolicy.data, photos: photos.files });
    },
  };
};

export {
  getBoothRegistrationAvailability,
  getBoothRegistrationMapView,
  isAlreadyOnboardedError,
  useBoothRegistrationForm,
};
export type { BoothRegistrationMapView };
