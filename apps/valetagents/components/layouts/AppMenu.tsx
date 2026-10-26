"use client";

import { makkigoLogo } from "@makkigo/ui/assets";
import { SheetClose, SheetContent, SheetTitle } from "@makkigo/ui/components/ui/sheet";
import Image from "next/image";
import Link from "next/link";

import { useLogout } from "@/features/auth/hooks/useLogout";
import { getMenuItems } from "@/libs/auth/menuItems";

import type { MenuAccess } from "@/libs/auth/menuItems";

interface AppMenuProps {
  menu: MenuAccess;
}

export default function AppMenu({ menu }: Readonly<AppMenuProps>) {
  const logout = useLogout(menu.staffId ?? 0);

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
        {menu.staffId && (
          <button
            type="button"
            className="mt-4 text-left text-lg leading-6 font-medium text-[#717171]"
            disabled={logout.isLoggingOut}
            onClick={logout.logout}
          >
            {logout.isLoggingOut ? "로그아웃하는 중…" : "로그아웃"}
          </button>
        )}
        {logout.errorMessage && (
          <p role="alert" className="max-w-40 text-sm text-red-600">{logout.errorMessage}</p>
        )}
      </nav>
    </SheetContent>
  );
}
