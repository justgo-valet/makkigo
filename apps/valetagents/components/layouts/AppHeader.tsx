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
    <header className="relative mt-2 flex h-6 items-center">
      {backHref && (
        <Link href={backHref} aria-label="뒤로 가기">
          <Image src="/icons/chevron_left.svg" alt="" width={24} height={24} />
        </Link>
      )}
      <Image
        src={makkigoLogo}
        alt="마끼고"
        width={95}
        height={39}
        priority
        className={cn(
          "absolute top-1/2 h-[39px] -translate-y-1/2",
          home ? "left-[5px]" : "left-1/2 -translate-x-[calc(50%+3px)]",
        )}
      />
      {home && (
        <button
          type="button"
          aria-label={notificationsEnabled ? "알림 켜짐" : "알림 꺼짐"}
          className="mr-[21px] ml-auto"
          onClick={onBellClick}
        >
          <Image
            src={notificationsEnabled ? "/icons/bell.svg" : "/icons/bell_off.svg"}
            alt=""
            width={24}
            height={24}
          />
        </button>
      )}
      <Sheet>
        <SheetTrigger aria-label="메뉴" className={home ? "-mr-px" : "-mr-1 ml-auto"}>
          <Image src="/icons/menu.svg" alt="" width={24} height={24} />
        </SheetTrigger>
        <AppMenu menu={menu} />
      </Sheet>
    </header>
  );
}
