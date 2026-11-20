"use client";

import { createContext, useContext, useState } from "react";

import type { ReactNode } from "react";

const ImportRunContext = createContext<{ running: boolean; setRunning: (running: boolean) => void }>({
  running: false,
  setRunning: () => {},
});

export const useImportRun = () => useContext(ImportRunContext);

export default function ImportRunProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [running, setRunning] = useState(false);
  return <ImportRunContext value={{ running, setRunning }}>{children}</ImportRunContext>;
}
