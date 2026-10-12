"use client";

import { makkigoLogo } from "@makkigo/ui/assets";
import { SheetClose, SheetContent, SheetTitle } from "@makkigo/ui/components/ui/sheet";
import Image from "next/image";
import Link from "next/link";

import { getMenuItems } from "./menuItems";

import type { MenuAccess } from "./menuItems";

interface AppMenuProps {
  menu: MenuAccess;
}

export default function AppMenu({ menu }: Readonly<AppMenuProps>) {
  return (
    <SheetContent
      showCloseButton={false}
      className="w-[249px] gap-0 border-l-0 pt-[13.5px] shadow-none"
      overlayClassName="bg-black/70 backdrop-blur-[2px]"
    >
      <SheetTitle className="sr-only">메뉴</SheetTitle>
      {/* 로고(95×39)의 가운데를 프레임 글자 가운데(패널 왼쪽에서 111.5, 위에서 33)에 둔다 */}
      <Image src={makkigoLogo} alt="마끼고" width={95} height={39} className="ml-16 h-[39px]" />
      <nav className="mt-[31.5px] flex flex-col gap-2 pl-[49px]">
        {getMenuItems(menu).map(({ label, href }) => (
          <SheetClose key={href} asChild>
            <Link href={href} className="text-2xl leading-6 font-bold text-black">
              {label}
            </Link>
          </SheetClose>
        ))}
      </nav>
    </SheetContent>
  );
}
