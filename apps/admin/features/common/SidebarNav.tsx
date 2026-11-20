"use client";

import { cn } from "@makkigo/ui";
import { Building2, Car, CloudDownload, LayoutDashboard, Store, UserCog } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/merchants", label: "업체", icon: Store },
  { href: "/merchant-import", label: "업체 수집", icon: CloudDownload },
  { href: "/merchant-admins", label: "업체 관리자", icon: UserCog },
  { href: "/booths", label: "부스", icon: Building2 },
  { href: "/valet-sessions", label: "발렛 세션", icon: Car },
] as const;

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-(--tertiary-color) hover:bg-black/5 hover:text-(--base-color)",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
