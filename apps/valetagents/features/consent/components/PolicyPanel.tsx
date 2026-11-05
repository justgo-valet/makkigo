import { PolicyMarkdown } from "@makkigo/ui/components/ui/policy-markdown";
import Image from "next/image";

interface PolicyPanelProps {
  title: string;
  content: string;
  onClose: () => void;
}

export default function PolicyPanel({ title, content, onClose }: Readonly<PolicyPanelProps>) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-white pt-(--safe-area-inset-top) pb-(--safe-area-inset-bottom)"
    >
      <header className="flex h-16 shrink-0 items-center gap-2 p-4">
        <button type="button" aria-label="닫기" onClick={onClose}>
          <Image src="/icons/arrow_left.svg" alt="" aria-hidden="true" width={24} height={24} />
        </button>
        <h1 className="text-lg font-bold text-(--base-color)">{title}</h1>
      </header>
      <PolicyMarkdown content={content} className="min-h-0 flex-1 overflow-y-auto px-6 pb-4" />
    </div>
  );
}
