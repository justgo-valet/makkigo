import PolicyMarkdown from "@/features/consent/components/PolicyMarkdown";
import locationBasedService from "@/features/consent/documents/locationBasedService";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "위치기반서비스 이용약관 | 마끼고",
  description: "마끼고 위치기반서비스 이용약관",
};

export default function LocationTermsPage() {
  return (
    <article className="h-full overflow-y-auto pt-2 pb-8 scrollbar-none [&::-webkit-scrollbar]:hidden">
      <h1 className="mb-4 text-xl font-bold text-(--base-color)">위치기반서비스 이용약관</h1>
      <PolicyMarkdown content={locationBasedService} />
    </article>
  );
}
