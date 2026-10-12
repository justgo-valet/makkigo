"use client";

import { makkigoLogo } from "@makkigo/ui/assets";
import { SheetClose, SheetContent, SheetTitle } from "@makkigo/ui/components/ui/sheet";
import Image from "next/image";
import Link from "next/link";

import { getMenuItems } from "@/libs/auth/menuItems";

import type { MenuAccess } from "@/libs/auth/menuItems";

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
