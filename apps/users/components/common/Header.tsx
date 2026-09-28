"use client";

import { useLayout } from "@/stores/layout";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const { showBackButton, backNavigateText, logoPosition } = useLayout(
    state => state.headerConfiguration,
  );

  return (
    <header className="relative flex items-center w-full h-12">
      {showBackButton && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={backNavigateText ?? "뒤로 가기"}
          className="z-10 flex h-full cursor-pointer items-center gap-1 text-xs text-(--tertiary-color)"
        >
          <Image
            src="/icons/arrow_left.svg"
            alt=""
            aria-hidden="true"
            width={20}
            height={20}
          />
          {backNavigateText && <span>{backNavigateText}</span>}
        </button>
      )}

      {logoPosition !== "hidden" && (
        <div
          className={
            logoPosition === "center"
              ? "absolute left-1/2 -translate-x-1/2"
              : showBackButton
                ? "ml-4"
                : ""
          }
        >
                  {/* TODO: 로고 확정 시 변경 */}
          <span className="text-xl font-bold tracking-tight text-(--primary-color)">
            MAKKIGO
          </span>
        </div>
      )}
    </header>
  );
}
