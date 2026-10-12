"use client";

import { makkigoLogo } from "@makkigo/ui/assets";
import { Sheet, SheetTrigger } from "@makkigo/ui/components/ui/sheet";
import Image from "next/image";
import Link from "next/link";

import AppMenu from "./AppMenu";

import type { MenuAccess } from "./menuItems";

interface AppHeaderProps {
  menu: MenuAccess;
  backHref?: string;
}

export default function AppHeader({ menu, backHref }: Readonly<AppHeaderProps>) {
  return (
    <header className="relative mt-2 flex h-6 items-center">
      {backHref && (
        <Link href={backHref} aria-label="뒤로 가기">
          <Image src="/icons/chevron_left.svg" alt="" width={24} height={24} />
        </Link>
      )}
      {/* 프레임의 글자 가운데(x 193.5)가 헤더 가운데(196.5)보다 3px 왼쪽이다 */}
      <Image
        src={makkigoLogo}
        alt="마끼고"
        width={95}
        height={39}
        priority
        className="absolute top-1/2 left-1/2 h-[39px] -translate-x-[calc(50%+3px)] -translate-y-1/2"
      />
      <Sheet>
        <SheetTrigger aria-label="메뉴" className="-mr-1 ml-auto">
          <Image src="/icons/menu.svg" alt="" width={24} height={24} />
        </SheetTrigger>
        <AppMenu menu={menu} />
      </Sheet>
    </header>
  );
}
