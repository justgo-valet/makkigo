"use client";

import { useBoothMap } from "../hooks/useBoothMap";

interface BoothMapProps {
  address: string;
  appKey: string;
}

export default function BoothMap({ address, appKey }: Readonly<BoothMapProps>) {
  const { containerRef, ...map } = useBoothMap(address, appKey);

  return (
    <section
      aria-label="선택한 부스 위치"
      className="relative h-45 overflow-hidden rounded-xl border bg-muted"
    >
      <div ref={containerRef} className="h-full w-full" aria-hidden={map.state !== "ready"} />
      {map.state !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center text-(--tertiary-color)">
          {map.state === "loading" ? (
            <p className="text-sm" role="status">지도를 불러오고 있어요.</p>
          ) : (
            <>
              <p className="text-sm text-(--base-color)">지도 없이도 등록 요청할 수 있어요.</p>
              <p className="text-xs" role="alert">{map.errorMessage}</p>
              <button type="button" className="mt-1 text-sm underline" onClick={map.retry}>
                지도 다시 시도
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
