"use client";

import { useEffect, useRef, useState } from "react";

import { loadKakaoMaps } from "@/libs/kakao/loadKakaoMaps";

interface BoothMapProps {
  address: string;
  appKey: string;
}

type MapState = "loading" | "ready" | "error";

interface MapResult {
  key: string;
  state: MapState;
  errorMessage: string | null;
}

export default function BoothMap({ address, appKey }: Readonly<BoothMapProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef(0);
  const [retryKey, setRetryKey] = useState(0);
  const [result, setResult] = useState<MapResult | null>(null);
  const mapKey = `${address}:${retryKey}`;
  const state: MapState = result?.key === mapKey ? result.state : "loading";
  const errorMessage = result?.key === mapKey ? result.errorMessage : null;

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

  return (
    <section
      aria-label="선택한 부스 위치"
      className="relative h-[180px] overflow-hidden rounded-lg border border-[#999] bg-[#e8e8e8]"
    >
      <div ref={containerRef} className="h-full w-full" aria-hidden={state !== "ready"} />
      {state !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center text-[#575757]">
          {state === "loading" ? (
            <p className="text-sm" role="status">지도를 불러오고 있어요.</p>
          ) : (
            <>
              <p className="text-sm text-(--base-color)">지도 없이도 등록 요청할 수 있어요.</p>
              <p className="text-xs" role="alert">{errorMessage}</p>
              <button
                type="button"
                className="mt-1 text-sm underline"
                onClick={() => setRetryKey((key) => key + 1)}
              >
                지도 다시 시도
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
