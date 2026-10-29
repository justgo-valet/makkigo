import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export default function SettingsSection({ title, children }: Readonly<SettingsSectionProps>) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-sm font-semibold text-(--tertiary-color)">{title}</h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}
