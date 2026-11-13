import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import Link from "next/link";

import LogoutButton from "@/features/auth/LogoutButton";

export default function StudioHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src={makkigoLogo} alt="마끼고" width={84} height={34} priority />
          <span className="h-4 w-px bg-black/10" aria-hidden />
          <span className="text-sm font-semibold">티켓 관리</span>
        </Link>
        <div className="ml-auto">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
