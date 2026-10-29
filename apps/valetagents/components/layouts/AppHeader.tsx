"use client";

import { makkigoLogo } from "@makkigo/ui/assets";
import { cn } from "@makkigo/ui";
import { Sheet, SheetTrigger } from "@makkigo/ui/components/ui/sheet";
import Image from "next/image";
import Link from "next/link";

import AppMenu from "./AppMenu";

import type { MenuAccess } from "@/libs/auth/menuItems";

interface AppHeaderProps {
  menu: MenuAccess;
  backHref?: string;
  home?: boolean;
  notificationsEnabled?: boolean;
  onBellClick?: () => void;
}

export default function AppHeader({
  menu,
  backHref,
  home,
  notificationsEnabled,
  onBellClick,
}: Readonly<AppHeaderProps>) {
  return (
    <header className="relative flex h-12 w-full shrink-0 items-center">
      {backHref && (
        <Link href={backHref} aria-label="뒤로 가기" className="z-10 flex h-full items-center">
          <Image src="/icons/arrow_left.svg" alt="" aria-hidden="true" width={28} height={28} />
        </Link>
      )}
      <Image
        src={makkigoLogo}
        alt="마끼고"
        width={95}
        height={39}
        priority
        className={cn(!home && "absolute left-1/2 -translate-x-1/2")}
      />
      <nav className="ml-auto flex items-center gap-3">
        {home && (
          <button
            type="button"
            aria-label={notificationsEnabled ? "알림 켜짐" : "알림 꺼짐"}
            onClick={onBellClick}
          >
            <Image
              src={notificationsEnabled ? "/icons/bell.svg" : "/icons/bell_off.svg"}
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
            />
          </button>
        )}
        <Sheet>
          <SheetTrigger aria-label="메뉴">
            <Image src="/icons/menu.svg" alt="" aria-hidden="true" width={24} height={24} />
          </SheetTrigger>
          <AppMenu menu={menu} />
        </Sheet>
      </nav>
    </header>
  );
}
