"use client";

import { useEffect, useRef, useState } from "react";

import { loadKakaoMaps } from "@/libs/kakao/loadKakaoMaps";

import type { KakaoCustomOverlay, KakaoLatLng, KakaoMapsApi } from "@/libs/kakao/loadKakaoMaps";

type MapState = "loading" | "ready" | "error";

interface MapResult {
  key: string;
  state: MapState;
  errorMessage: string | null;
}

interface MerchantMapTarget {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

const PIN_SVG =
  '<svg width="24" height="30" viewBox="0 0 24 30" aria-hidden="true"><path d="M12 0C5.4 0 0 5.2 0 11.6 0 20.3 12 30 12 30s12-9.7 12-18.4C24 5.2 18.6 0 12 0z" fill="#2170d6"/><circle cx="12" cy="11.5" r="4.5" fill="#fff"/></svg>';

const createPinElement = (name: string) => {
  const pin = document.createElement("div");
  pin.className = "flex flex-col items-center gap-[3px]";
  const label = document.createElement("span");
  label.className =
    "rounded-sm border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-(--base-color)";
  label.textContent = name;
  pin.append(label);
  pin.insertAdjacentHTML("beforeend", PIN_SVG);
  return pin;
};

const findPosition = (maps: KakaoMapsApi, target: MerchantMapTarget) =>
  new Promise<KakaoLatLng | null>((resolve) => {
    if (target.latitude !== null && target.longitude !== null) {
      resolve(new maps.LatLng(target.latitude, target.longitude));
      return;
    }
    new maps.services.Geocoder().addressSearch(target.address, (results, status) => {
      const first = results[0];
      resolve(
        status === maps.services.Status.OK && first
          ? new maps.LatLng(Number(first.y), Number(first.x))
          : null,
      );
    });
  });

const useMerchantMap = (target: MerchantMapTarget, appKey: string) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef(0);
  const [retryKey, setRetryKey] = useState(0);
  const [result, setResult] = useState<MapResult | null>(null);
  const { name, address, latitude, longitude } = target;
  const mapKey = `${name}:${address}:${latitude}:${longitude}:${retryKey}`;
  const state: MapState = result?.key === mapKey ? result.state : "loading";

  useEffect(() => {
    const generation = ++generationRef.current;
    const container = containerRef.current;
    let overlay: KakaoCustomOverlay | null = null;

    const renderMap = async () => {
      try {
        const maps = await loadKakaoMaps(appKey);
        if (generation !== generationRef.current || !container) return;

        const position = await findPosition(maps, { name, address, latitude, longitude });
        if (generation !== generationRef.current) return;
        if (!position) {
          setResult({
            key: mapKey,
            state: "error",
            errorMessage: "주소의 지도 위치를 찾지 못했어요.",
          });
          return;
        }

        const map = new maps.Map(container, { center: position, level: 3 });
        overlay = new maps.CustomOverlay({
          map,
          position,
          content: createPinElement(name),
          yAnchor: 1,
        });
        setResult({ key: mapKey, state: "ready", errorMessage: null });
      } catch (error) {
        if (generation !== generationRef.current) return;
        setResult({
          key: mapKey,
          state: "error",
          errorMessage: error instanceof Error ? error.message : "지도를 불러오지 못했어요.",
        });
      }
    };

    void renderMap();

    return () => {
      generationRef.current += 1;
      overlay?.setMap(null);
      container?.replaceChildren();
    };
  }, [address, appKey, latitude, longitude, mapKey, name]);

  return {
    containerRef,
    state,
    errorMessage: result?.key === mapKey ? result.errorMessage : null,
    retry: () => setRetryKey((key) => key + 1),
  };
};

export { useMerchantMap };
export type { MerchantMapTarget };
