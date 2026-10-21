import PolicyMarkdown from "@/features/consent/components/PolicyMarkdown";
import accountDeletion from "@/features/consent/documents/accountDeletion";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "계정 삭제 요청 | 마끼고",
  description: "마끼고 고객 앱 계정과 데이터 삭제 방법",
};

export default function AccountDeletionPage() {
  return (
    <article className="h-full overflow-y-auto pt-2 pb-8 scrollbar-none [&::-webkit-scrollbar]:hidden">
      <h1 className="mb-4 text-xl font-bold text-(--base-color)">계정 삭제 요청</h1>
      <PolicyMarkdown content={accountDeletion} />
    </article>
  );
}
