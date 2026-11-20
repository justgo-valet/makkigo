import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import Link from "next/link";

import LogoutButton from "@/features/auth/LogoutButton";
import SidebarNav from "@/features/common/SidebarNav";

import type { ReactNode } from "react";

export default function ConsoleLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col gap-6 border-r bg-white px-3 py-5">
        <Link href="/" className="flex items-center gap-2 px-3">
          <Image src={makkigoLogo} alt="마끼고" width={88} height={36} priority />
          <span className="text-sm font-semibold text-(--tertiary-color)">관리자</span>
        </Link>
        <div className="flex-1">
          <SidebarNav />
        </div>
        <LogoutButton />
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
