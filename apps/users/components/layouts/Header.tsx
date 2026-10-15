"use client";

import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import NotificationBellButton from "@/features/notification/components/NotificationBellButton";
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
          <Image src={makkigoLogo} alt="마끼고" width={95} height={39} priority />
        </div>
      )}

      {showRightMenu && (
        <nav className="flex items-center gap-3">
          <NotificationBellButton />
          <Link href="/mypage" aria-label="마이페이지" className="cursor-pointer">
            <Image src="/icons/profile.svg" alt="" aria-hidden="true" width={24} height={24} />
          </Link>
        </nav>
      )}
    </header>
  );
}
