"use client";

import { FieldError } from "@makkigo/ui";
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
      className="w-64 gap-0 border-l-0 px-6 pt-[calc(1rem+var(--safe-area-inset-top))]"
    >
      <SheetTitle className="sr-only">메뉴</SheetTitle>
      <div className="flex h-12 items-center">
        <Image src={makkigoLogo} alt="마끼고" width={95} height={39} />
      </div>
      <nav className="mt-6 flex flex-col gap-1">
        {getMenuItems(menu).map(({ label, href }) => (
          <SheetClose key={href} asChild>
            <Link href={href} className="py-3 text-xl font-bold text-(--base-color)">
              {label}
            </Link>
          </SheetClose>
        ))}
        {menu.staffId && (
          <button
            type="button"
            className="mt-4 py-3 text-left text-base font-medium text-(--tertiary-color)"
            disabled={logout.isLoggingOut}
            onClick={logout.logout}
          >
            {logout.isLoggingOut ? "로그아웃하는 중…" : "로그아웃"}
          </button>
        )}
        {logout.errorMessage && <FieldError>{logout.errorMessage}</FieldError>}
      </nav>
    </SheetContent>
  );
}
