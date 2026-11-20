import { Badge } from "@makkigo/ui";

interface StatusBadgeProps {
  label: string;
  tone: "info" | "success" | "warning" | "danger" | "neutral";
}

export default function StatusBadge({ label, tone }: Readonly<StatusBadgeProps>) {
  return (
    <Badge tone={tone} className="px-2 py-0.5 text-xs">
      {label}
    </Badge>
  );
}

export type { StatusBadgeProps };
