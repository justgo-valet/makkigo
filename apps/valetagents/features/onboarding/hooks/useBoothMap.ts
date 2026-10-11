"use client";

import { useEffect, useRef, useState } from "react";

import { loadKakaoMaps } from "@/libs/kakao/loadKakaoMaps";

type MapState = "loading" | "ready" | "error";

interface MapResult {
  key: string;
  state: MapState;
  errorMessage: string | null;
}

// 주소로 좌표를 찾아 지도와 마커를 그린다. 주소가 바뀌면 늦게 도착한 앞 주소의 결과는 버린다.
const useBoothMap = (address: string, appKey: string) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef(0);
  const [retryKey, setRetryKey] = useState(0);
  const [result, setResult] = useState<MapResult | null>(null);
  const mapKey = `${address}:${retryKey}`;
  const state: MapState = result?.key === mapKey ? result.state : "loading";

  useEffect(() => {
    const generation = ++generationRef.current;
    const container = containerRef.current;
    const currentMapKey = `${address}:${retryKey}`;
    let marker: { setMap: (map: null) => void } | null = null;

    const renderMap = async () => {
      try {
        const maps = await loadKakaoMaps(appKey);
        if (generation !== generationRef.current || !container) return;

        const geocoder = new maps.services.Geocoder();
        geocoder.addressSearch(address, (results, status) => {
          if (generation !== generationRef.current || !container) return;
          if (status !== maps.services.Status.OK || !results[0]) {
            setResult({
              key: currentMapKey,
              state: "error",
              errorMessage: "주소의 지도 위치를 찾지 못했어요.",
            });
            return;
          }

          const position = new maps.LatLng(Number(results[0].y), Number(results[0].x));
          const map = new maps.Map(container, { center: position, level: 3 });
          marker = new maps.Marker({ map, position });
          setResult({ key: currentMapKey, state: "ready", errorMessage: null });
        });
      } catch (error) {
        if (generation !== generationRef.current) return;
        setResult({
          key: currentMapKey,
          state: "error",
          errorMessage: error instanceof Error ? error.message : "지도를 불러오지 못했어요.",
        });
      }
    };

    void renderMap();

    return () => {
      generationRef.current += 1;
      marker?.setMap(null);
      container?.replaceChildren();
    };
  }, [address, appKey, retryKey]);

  return {
    containerRef,
    state,
    errorMessage: result?.key === mapKey ? result.errorMessage : null,
    retry: () => setRetryKey((key) => key + 1),
  };
};

export { useBoothMap };
