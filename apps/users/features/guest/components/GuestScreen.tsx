import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";

import type { ReactNode } from "react";

export default function GuestScreen({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-12 shrink-0 items-center">
        <Image src={makkigoLogo} alt="마끼고" width={95} height={39} priority />
      </div>
      {children}
    </div>
  );
}
