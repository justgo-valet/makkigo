import { Button } from "@makkigo/ui";
import Image from "next/image";

import type { HomeAction } from "@/features/home/homeActions";

interface HomeActionItemProps {
  action: HomeAction;
  onClick?: () => void;
}

export default function HomeActionItem({ action, onClick }: Readonly<HomeActionItemProps>) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-auto w-full justify-between gap-4 rounded-xl px-4 py-4 shadow-none"
    >
      <span className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Image src={action.iconSrc} alt="" aria-hidden="true" width={24} height={24} />
        </span>
        <span className="flex flex-col items-start gap-0.5">
          <span className="text-base font-bold text-(--base-color)">{action.title}</span>
          <span className="text-sm font-normal text-(--tertiary-color)">{action.description}</span>
        </span>
      </span>
      <Image src="/icons/chevron_right.svg" alt="" aria-hidden="true" width={20} height={20} />
    </Button>
  );
}
