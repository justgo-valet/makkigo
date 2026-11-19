"use client";

import { useRouter } from "next/navigation";

import AppHeader from "@/components/layouts/AppHeader";
import ConsentSheet from "@/features/consent/components/ConsentSheet";

import type { MenuAccess } from "@/libs/auth/menuItems";

interface ConsentStepProps {
  menu: MenuAccess;
}

export default function ConsentStep({ menu }: Readonly<ConsentStepProps>) {
  const router = useRouter();

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col">
      <AppHeader menu={menu} />
      <ConsentSheet open onAgreed={() => router.refresh()} />
    </div>
  );
}
