"use client";

import { useMerchantMap } from "@/features/merchant/hooks/useMerchantMap";

import type { MerchantMapTarget } from "@/features/merchant/hooks/useMerchantMap";

interface MerchantMapProps {
  target: MerchantMapTarget;
  appKey: string;
}

export default function MerchantMap({ target, appKey }: Readonly<MerchantMapProps>) {
  const { containerRef, ...map } = useMerchantMap(target, appKey);

  return (
    <section
      aria-label="업체 위치"
      className="relative h-[120px] shrink-0 overflow-hidden rounded-[10px] border border-slate-200 bg-slate-100"
    >
      <div ref={containerRef} className="h-full w-full" aria-hidden={map.state !== "ready"} />
      {map.state !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          {map.state === "loading" ? (
            <output className="text-xs text-(--tertiary-color)">지도를 불러오고 있어요</output>
          ) : (
            <>
              <p className="text-xs break-keep text-(--tertiary-color)">
                지도는 못 불러왔지만 업체는 선택할 수 있어요
              </p>
              <button
                type="button"
                className="min-h-11 px-3 text-xs font-medium text-(--primary-color) underline"
                onClick={map.retry}
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
