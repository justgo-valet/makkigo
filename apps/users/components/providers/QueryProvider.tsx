"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import type { ReactNode } from "react";

export default function QueryProvider({ children }: Readonly<{ children: ReactNode }>) {
  // 요청마다 서버에서 새 클라이언트를 만들고, 브라우저에서는 렌더링 간 같은 인스턴스를 유지한다.
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
