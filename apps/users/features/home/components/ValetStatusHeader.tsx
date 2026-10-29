import { Badge } from "@makkigo/ui";

import type { StatusBadge } from "@/features/home/hooks/useHome";

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
        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
      </div>
      <p className="text-sm text-(--tertiary-color)">{metaItems.join(" · ")}</p>
    </div>
  );
}
