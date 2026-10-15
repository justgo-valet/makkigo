import type { ReactNode } from "react";

interface MypageRowProps {
  children: ReactNode;
}

export default function MypageRow({ children }: Readonly<MypageRowProps>) {
  return (
    <div className="flex min-h-[54px] w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-[15px] font-normal break-keep text-(--base-color) shadow-xs">
      {children}
    </div>
  );
}
