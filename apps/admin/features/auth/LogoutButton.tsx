"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

export default function LogoutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm text-(--tertiary-color) transition-colors hover:bg-black/5 hover:text-(--base-color) disabled:opacity-50"
      onClick={async () => {
        setPending(true);
        await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => null);
        window.location.replace("/login");
      }}
    >
      <LogOut className="size-4" aria-hidden />
      로그아웃
    </button>
  );
}
