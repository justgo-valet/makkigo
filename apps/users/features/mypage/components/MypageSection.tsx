import type { ReactNode } from "react";

interface MypageSectionProps {
  title: string;
  children: ReactNode;
}

export default function MypageSection({ title, children }: Readonly<MypageSectionProps>) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-sm font-semibold text-(--tertiary-color)">{title}</h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}
