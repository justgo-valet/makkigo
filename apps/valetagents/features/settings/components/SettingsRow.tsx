import type { ReactNode } from "react";

interface SettingsRowProps {
  children: ReactNode;
}

export default function SettingsRow({ children }: Readonly<SettingsRowProps>) {
  return (
    <div className="flex min-h-13.5 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-[15px] break-keep text-(--base-color) shadow-xs">
      {children}
    </div>
  );
}
