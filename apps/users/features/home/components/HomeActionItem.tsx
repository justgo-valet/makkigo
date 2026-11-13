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
      className="h-auto w-full flex-col items-start justify-start gap-3 rounded-xl p-4 text-left whitespace-normal shadow-none short:gap-2 short:p-3"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 short:size-8">
        <Image src={action.iconSrc} alt="" aria-hidden="true" width={24} height={24} />
      </span>
      <span className="flex flex-col items-start gap-0.5">
        <span className="text-base font-bold text-(--base-color)">{action.title}</span>
        <span className="text-sm font-normal break-keep text-(--tertiary-color)">
          {action.description}
        </span>
      </span>
    </Button>
  );
}
