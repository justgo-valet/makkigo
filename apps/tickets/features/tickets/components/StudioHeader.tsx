"use client";

import { cn } from "@makkigo/ui";
import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import LogoutButton from "@/features/auth/LogoutButton";

const NAV_ITEMS = [
  { href: "/", label: "티켓", match: (path: string) => path === "/" || path.startsWith("/tickets") },
  { href: "/merchant", label: "업체 정보", match: (path: string) => path === "/merchant" },
  { href: "/valet", label: "발렛 현황", match: (path: string) => path === "/valet" },
  { href: "/account/password", label: "비밀번호 변경", match: (path: string) => path === "/account/password" },
];

export default function StudioHeader({ nav = true }: Readonly<{ nav?: boolean }>) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 pt-(--safe-area-inset-top) backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 px-4 sm:h-16 sm:flex-nowrap sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src={makkigoLogo} alt="마끼고" width={84} height={34} priority />
          <span className="h-4 w-px bg-black/10" aria-hidden />
          <span className="text-sm font-semibold">업체 관리</span>
        </Link>
        {nav && (
          <nav
            aria-label="메뉴"
            className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-1 overflow-x-auto px-3 pb-2 sm:order-none sm:mx-0 sm:ml-6 sm:w-auto sm:overflow-visible sm:p-0"
          >
            {NAV_ITEMS.map(({ href, label, match }) => (
              <Link
                key={href}
                href={href}
                aria-current={match(pathname) ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm text-(--tertiary-color) transition-colors hover:bg-black/5 hover:text-(--base-color)",
                  match(pathname) && "font-semibold text-(--base-color)",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
        <div className="ml-auto flex h-14 items-center sm:h-auto">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
