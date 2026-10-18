import { Button, cn } from "@makkigo/ui";
import Image from "next/image";

import PolicyMarkdown from "@/features/consent/components/PolicyMarkdown";

interface ConsentPanelProps {
  id: string;
  title: string;
  content: string;
  onClose: () => void;
  onAgree?: () => void;
}

export default function ConsentPanel({
  id,
  title,
  content,
  onClose,
  onAgree,
}: Readonly<ConsentPanelProps>) {
  const handleAgree = () => {
    onAgree?.();
    onClose();
  };

  return (
    <div
      className="fixed top-0 left-0 z-50 h-screen w-full bg-white pt-(--safe-area-inset-top) pb-(--safe-area-inset-bottom)"
      id={id}
    >
      <header className="p-4 flex items-center gap-2 justify-start h-16">
        <button type="button" aria-label="약관 패널 닫기" onClick={onClose}>
          <Image src="/icons/arrow_right.svg" alt="" width={20} height={20} aria-hidden />
        </button>
        <h1 className="text-lg font-bold">{title}</h1>
      </header>
      <PolicyMarkdown
        content={content}
        className={cn(
          onAgree
            ? "h-[calc(100vh-4rem-5rem-var(--safe-area-inset-top)-var(--safe-area-inset-bottom))]"
            : "h-[calc(100vh-4rem-var(--safe-area-inset-top)-var(--safe-area-inset-bottom))]",
          "overflow-y-auto rounded-md px-6 pb-4",
        )}
      />
      {onAgree && (
        <footer className="p-4 flex w-full h-20">
          <Button
            type="button"
            onClick={handleAgree}
            className="w-full h-full text-base"
            aria-label={`${title} 동의`}
          >
            동의
          </Button>
        </footer>
      )}
    </div>
  );
}
