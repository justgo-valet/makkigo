"use client";

import { useEffect, useRef, useState } from "react";

import { loadKakaoMaps } from "@/libs/kakao/loadKakaoMaps";
import { loadKakaoPostcode } from "@/libs/kakao/loadKakaoPostcode";

interface MerchantAddressSelection {
  roadAddress: string;
  postalCode: string;
}

interface MerchantCoordinates {
  latitude: number;
  longitude: number;
}

type AddressLayerState = "closed" | "loading" | "ready" | "error";
type CoordinateState = "idle" | "loading" | "ready" | "error";

const ROAD_ADDRESS_MESSAGE = "도로명 주소가 있는 주소를 선택해 주세요.";

const useMerchantAddress = (kakaoMapAppKey: string) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [layer, setLayer] = useState<AddressLayerState>("closed");
  const [layerAttempt, setLayerAttempt] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [selection, setSelection] = useState<MerchantAddressSelection | null>(null);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [lookup, setLookup] = useState<{
    key: string;
    coordinates: MerchantCoordinates | null;
  } | null>(null);
  const roadAddress = selection?.roadAddress ?? null;
  const lookupKey = `${roadAddress}:${lookupAttempt}`;
  const isOpening = layer === "loading";

  useEffect(() => {
    if (!isOpening) return;
    let cancelled = false;

    loadKakaoPostcode()
      .then((Postcode) => {
        const container = containerRef.current;
        if (cancelled || !container) return;

        container.replaceChildren();
        new Postcode({
          width: "100%",
          height: "100%",
          oncomplete: (address) => {
            const selectedRoadAddress = address.roadAddress || address.autoRoadAddress;
            setMessage(selectedRoadAddress ? null : ROAD_ADDRESS_MESSAGE);
            if (selectedRoadAddress) {
              setSelection({ roadAddress: selectedRoadAddress, postalCode: address.zonecode });
            }
            setLayer("closed");
            triggerRef.current?.focus();
          },
        }).embed(container);
        setLayer("ready");
      })
      .catch(() => {
        if (!cancelled) setLayer("error");
      });

    return () => {
      cancelled = true;
    };
  }, [isOpening, layerAttempt]);

  useEffect(() => {
    if (roadAddress === null) return;
    let cancelled = false;
    const key = `${roadAddress}:${lookupAttempt}`;
    const finish = (coordinates: MerchantCoordinates | null) => {
      if (!cancelled) setLookup({ key, coordinates });
    };

    loadKakaoMaps(kakaoMapAppKey)
      .then((maps) => {
        new maps.services.Geocoder().addressSearch(roadAddress, (results, status) => {
          const [first] = results ?? [];
          const found = { latitude: Number(first?.y), longitude: Number(first?.x) };
          finish(
            status === maps.services.Status.OK &&
              Number.isFinite(found.latitude) &&
              Number.isFinite(found.longitude)
              ? found
              : null,
          );
        });
      })
      .catch(() => finish(null));

    return () => {
      cancelled = true;
    };
  }, [roadAddress, kakaoMapAppKey, lookupAttempt]);

  const coordinates = lookup?.key === lookupKey ? lookup.coordinates : null;
  let coordinateState: CoordinateState;
  if (roadAddress === null) coordinateState = "idle";
  else if (lookup?.key !== lookupKey) coordinateState = "loading";
  else coordinateState = coordinates ? "ready" : "error";

  return {
    containerRef,
    triggerRef,
    layer,
    message,
    selection,
    coordinates,
    coordinateState,
    open: () => setLayer("loading"),
    close: () => {
      setLayer("closed");
      triggerRef.current?.focus();
    },
    retryLayer: () => {
      setLayer("loading");
      setLayerAttempt((attempt) => attempt + 1);
    },
    retryCoordinates: () => setLookupAttempt((attempt) => attempt + 1),
  };
};

export { useMerchantAddress };
