import PolicyMarkdown from "@/features/consent/components/PolicyMarkdown";
import privacyThirdParty from "@/features/consent/documents/privacyThirdParty";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 제3자 제공 동의 | 마끼고",
  description: "마끼고 개인정보 제3자 제공 동의",
};

export default function PrivacyThirdPartyPage() {
  return (
    <article className="h-full overflow-y-auto pt-2 pb-8 scrollbar-none [&::-webkit-scrollbar]:hidden">
      <h1 className="mb-4 text-xl font-bold text-(--base-color)">개인정보 제3자 제공 동의</h1>
      <PolicyMarkdown content={privacyThirdParty} />
    </article>
  );
}
