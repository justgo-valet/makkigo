"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { useLayout } from "@/stores/layout";

export default function Header() {
  const router = useRouter();
  const {
    visible,
    showBackButton,
    backNavigateText,
    backButtonHandler,
    logoPosition,
    showRightMenu,
  } = useLayout((state) => state.headerConfiguration);

  if (!visible) return null;

  return (
    <header className="relative flex items-center justify-between w-full h-12">
      {showBackButton && (
        <button
          type="button"
          onClick={backButtonHandler ?? router.back}
          aria-label={backNavigateText ?? "뒤로 가기"}
          className="z-10 flex h-full cursor-pointer items-center gap-1 text-xs text-(--tertiary-color)"
        >
          <Image src="/icons/arrow_left.svg" alt="" aria-hidden="true" width={28} height={28} />
          {backNavigateText && <span>{backNavigateText}</span>}
        </button>
      )}

      {logoPosition !== "hidden" && (
        <div
          className={
            showBackButton && logoPosition === "center"
              ? "absolute left-1/2 -translate-x-1/2"
              : showBackButton
                ? "ml-4"
                : ""
          }
        >
          {/* TODO: 로고 확정 시 변경 */}
          <span className="text-xl font-bold tracking-tight text-(--primary-color)">MAKKIGO</span>
        </div>
      )}

      {showRightMenu && (
        <nav className="flex items-center gap-3">
          <button type="button" aria-label="알림" className="cursor-pointer">
            <Image src="/icons/alarm.svg" alt="" aria-hidden="true" width={24} height={24} />
          </button>
          <button type="button" aria-label="프로필" className="cursor-pointer">
            <Image src="/icons/profile.svg" alt="" aria-hidden="true" width={24} height={24} />
          </button>
        </nav>
      )}
    </header>
  );
}
