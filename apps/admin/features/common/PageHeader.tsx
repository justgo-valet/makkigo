import type { ReactNode } from "react";

export default function PageHeader({
  title,
  description,
  action,
}: Readonly<{ title: string; description?: string; action?: ReactNode }>) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-(--tertiary-color)">{description}</p>}
      </div>
      {action}
    </div>
  );
}
