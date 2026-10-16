import PolicyMarkdown from "@/features/consent/components/PolicyMarkdown";
import privacyCollection from "@/features/consent/documents/privacyCollection";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 수집 · 이용 동의 | 마끼고",
  description: "마끼고 개인정보 수집 · 이용 동의",
};

export default function PrivacyCollectionPage() {
  return (
    <article className="h-full overflow-y-auto pt-2 pb-8 scrollbar-none [&::-webkit-scrollbar]:hidden">
      <h1 className="mb-4 text-xl font-bold text-(--base-color)">개인정보 수집 · 이용 동의</h1>
      <PolicyMarkdown content={privacyCollection} />
    </article>
  );
}
