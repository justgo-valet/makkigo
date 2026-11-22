import { cn } from "@makkigo/ui";
import Image from "next/image";

interface BackButtonProps {
  label?: string | null;
  onClick: () => void;
  className?: string;
}

export default function BackButton({ label, onClick, className }: Readonly<BackButtonProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? "뒤로 가기"}
      className={cn(
        "z-10 flex cursor-pointer items-center gap-1 text-sm text-(--tertiary-color)",
        className,
      )}
    >
      <Image src="/icons/arrow_left.svg" alt="" aria-hidden="true" width={28} height={28} />
      {label && <span>{label}</span>}
    </button>
  );
}
