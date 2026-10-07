import MemberGate from "@/features/auth/components/MemberGate";

import type { ReactNode } from "react";

export default function MemberLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <MemberGate area="member">{children}</MemberGate>;
}
