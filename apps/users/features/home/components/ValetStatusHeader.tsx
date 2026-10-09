import { cn } from "@makkigo/ui";

import type { StatusBadge, StatusTone } from "@/features/home/hooks/useHome";

const TONE_CLASS_NAMES: Record<StatusTone, string> = {
  info: "bg-primary/10 text-primary",
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-red-100 text-red-600",
  warning: "bg-amber-100 text-amber-700",
};

interface ValetStatusHeaderProps {
  title: string;
  badge: StatusBadge | null;
  metaItems: string[];
}

export default function ValetStatusHeader({
  title,
  badge,
  metaItems,
}: Readonly<ValetStatusHeaderProps>) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <h1 className="truncate text-xl font-bold text-(--base-color)">{title}</h1>
        {badge && (
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-sm font-semibold",
              TONE_CLASS_NAMES[badge.tone],
            )}
          >
            {badge.label}
          </span>
        )}
      </div>
      <p className="text-sm text-(--tertiary-color)">{metaItems.join(" · ")}</p>
    </div>
  );
}
