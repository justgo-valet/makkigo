"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { registerQuerySessionCleanup } from "@/libs/common/query/querySession";

import type { ReactNode } from "react";

export interface QueryProviderProps {
  children: ReactNode;
  sessionKey: string | number;
}

export const createSessionQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

export const cleanupSessionQueryClient = async (queryClient: QueryClient) => {
  await queryClient.cancelQueries();
  queryClient.clear();
};

function SessionQueryProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(createSessionQueryClient);

  useEffect(() => {
    const unregister = registerQuerySessionCleanup(async () => {
      await cleanupSessionQueryClient(queryClient);
    });

    return () => {
      unregister();
      void cleanupSessionQueryClient(queryClient);
    };
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default function QueryProvider({ children, sessionKey }: Readonly<QueryProviderProps>) {
  return <SessionQueryProvider key={sessionKey}>{children}</SessionQueryProvider>;
}
