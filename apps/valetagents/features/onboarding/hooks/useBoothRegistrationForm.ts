"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createBooth } from "../apis/createBooth";
import { useBoothMap } from "./useBoothMap";

const ADDRESS_DEBOUNCE_MS = 300;
const SAVE_ERROR_MESSAGE = "부스를 등록하지 못했어요. 잠시 후 다시 시도해 주세요.";

type BoothMapState = ReturnType<typeof useBoothMap>["state"];
type BoothRegistrationMapView = "idle" | BoothMapState;

interface BoothRegistrationAddress {
  address: string;
  geocodedAddress: string;
  mapState: BoothMapState;
}

// 주소를 치기 전에는 지도 상자를 비워 두고, 지오코더에 넘긴 주소가 지금 입력된 주소일 때만 그 결과를 쓴다.
const getBoothRegistrationMapView = ({
  address,
  geocodedAddress,
  mapState,
}: BoothRegistrationAddress): BoothRegistrationMapView => {
  const typedAddress = address.trim();
  if (!typedAddress) return "idle";
  return typedAddress === geocodedAddress ? mapState : "loading";
};

// 지도에서 찾지 못한 주소로는 부스를 등록할 수 없다.
const getBoothRegistrationAvailability = ({
  name,
  isSaving,
  ...address
}: BoothRegistrationAddress & { name: string; isSaving: boolean }) =>
  name.trim().length > 0 && getBoothRegistrationMapView(address) === "ready" && !isSaving;

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
    // 두 번 눌러 진 쪽은 부스가 이미 만들어졌으므로 똑같이 홈으로 간다.
    onError: (error) => {
      if (isAlreadyOnboardedError(error)) goHome();
    },
  });

  const isLeaving = mutation.isSuccess || isAlreadyOnboardedError(mutation.error);
  const canSubmit = getBoothRegistrationAvailability({
    name,
    address,
    geocodedAddress,
    mapState: map.state,
    isSaving: mutation.isPending || isLeaving,
  });

  return {
    name,
    address,
    addressDetail,
    mapContainerRef: map.containerRef,
    mapView: getBoothRegistrationMapView({ address, geocodedAddress, mapState: map.state }),
    mapErrorMessage: map.errorMessage,
    canSubmit,
    errorMessage:
      mutation.error && !isLeaving ? getErrorMessage(mutation.error, SAVE_ERROR_MESSAGE) : null,
    changeName: setName,
    changeAddress: setAddress,
    changeAddressDetail: setAddressDetail,
    retryMap: map.retry,
    submit: () => {
      if (!canSubmit) return;
      mutation.mutate({ name, address, addressDetail });
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
