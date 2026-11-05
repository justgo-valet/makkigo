import { PolicyMarkdown } from "@makkigo/ui/components/ui/policy-markdown";

import support from "@/features/consent/documents/support";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "고객 지원 | 마끼고",
  description: "마끼고 고객 · 파트너 앱 문의 방법",
};

export default function SupportPage() {
  return (
    <article className="h-full overflow-y-auto pt-2 pb-8 scrollbar-none [&::-webkit-scrollbar]:hidden">
      <h1 className="mb-4 text-xl font-bold text-(--base-color)">고객 지원</h1>
      <PolicyMarkdown content={support} />
    </article>
  );
}
